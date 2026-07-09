# Design: Examination Ordering + Day Pause/Time Accounting Rework

## Problem

The game needs a way for the player to actively request more information about a case beyond
what's already on the desk — a purchasable `EXAMINATION` shop item the player can "order"
against a case, revealing an `EXAMINATION_RESULTS` document if one exists for that case/item
pair. Ordering also costs in-game time, which surfaces a real, already-documented bug:
`GameDayLog.pausedAt` is a single nullable timestamp that gets clobbered on a second pause and
is never subtracted from the elapsed-time calculation `endDay` uses (`docs/api/day.md` used to
document "pausing does not stop the clock" as intentional-by-omission behavior). This work fixes
that alongside adding examination time, since both changes touch the same elapsed-time
calculation.

Decisions confirmed before implementation:

- Exam time cost speeds up reaching the existing `MIN_DAY_DURATION_MS` floor — no new "maximum
  day length" concept.
- Resume stays an *implicit* side effect of the next `POST /api/v1/round` call — no new explicit
  resume endpoint, just fixed accounting at that point.
- The examination failure penalty is a single global constant, not per-item/per-case.
- Ordering the same examination on the same case twice is blocked (409 conflict).

## Data model

**`prisma/schema/documentation.prisma`**: `CaseDocumentType` gains `EXAMINATION_RESULTS`. No
other `CaseDocument` changes — `content Json?` already exists, and the existing
`@@unique([attentionPointRegion, caseId])` already tolerates multiple `null`-region rows per
case (Postgres treats `NULL` as distinct for uniqueness), so multiple `EXAMINATION_RESULTS` docs
per case need no constraint change. `content` shape: `{ shopItemId: string }`.

**`prisma/schema/inventory.prisma`**: `ShopItemType` gains `EXAMINATION`. `ShopItem` gains
`content Json?` (mirrors `CaseDocument.content`; `ShopItem` had no JSON field before). Only
`EXAMINATION` items populate it: `{ timeCostMs: number }`. New model:

```prisma
model CaseExamination {
  id            String      @id @default(uuid(7)) @db.Uuid
  gameSessionId String      @db.Uuid
  gameSession   GameSession @relation(fields: [gameSessionId], references: [id])
  caseId        String      @db.Uuid
  case          Case        @relation(fields: [caseId], references: [id])
  shopItemId    String      @db.Uuid
  shopItem      ShopItem    @relation(fields: [shopItemId], references: [id])
  isSuccessful  Boolean
  orderedAt     DateTime    @default(now())

  @@unique([gameSessionId, caseId, shopItemId])
  @@index([caseId])
  @@index([shopItemId])
}
```

Scoped to `(gameSessionId, caseId, shopItemId)`, not to a `GameDayLog` — same granularity as how
a case is already considered "done" once per whole session for diagnoses. `resetDay` does not
undo same-day `CaseExamination` rows, exactly as it already doesn't touch `OwnedItem` purchases
— an accepted limitation, not a new gap.

**`prisma/schema/progression.prisma`**: `GameDayLog` gains `totalPausedMs Int @default(0)` and
`extraElapsedMs Int @default(0)`. `pausedAt DateTime?` is unchanged in shape.

Migration: `20260709130605_add_examinations_and_day_pause_accounting`.

## Elapsed-time accounting

`computeEffectiveElapsedMs` (`src/backend/src/services/dayElapsed.ts`) is a pure function with
no Prisma dependency:

```ts
effectiveElapsedMs = (now - startedAt) - totalPausedMs + extraElapsedMs
```

Shared by `endDay` (`services/game.ts`) and `orderExamination` (`services/examination.ts`, via
`extraElapsedMs`). `MIN_DAY_DURATION_MS` moved out of `config.ts` (which is now purely
env-var-resolution logic) into a new `src/backend/src/constants.ts`, alongside the new
`EXAMINATION_FAILURE_PENALTY_MONEY` (default `25`, `0` disables it) — both are game-balance
tuning knobs, not per-deployment config.

### Pause/resume fix

`resolveGameSession` (`services/round.ts`) is the one place resume already happens (implicitly,
on the next `/round` call). Its `PAUSED → ACTIVE` branch now also looks up the open `GameDayLog`
and, if `pausedAt` is set, adds `now - pausedAt` into `totalPausedMs` and clears `pausedAt`. This
makes a second (or third) pause cycle in the same day accumulate correctly instead of losing the
first pause's duration.

`resetDay` (`services/game.ts`) gets the same companion fix — it used to clear `pausedAt` to
`null` without ever accumulating it, which is the same bug via a different entry point.

## Endpoint: `POST /api/v1/examinations`

Orchestration (`orderExamination(prisma, userId, caseId, shopItemId)` in
`src/backend/src/services/examination.ts`), following the same per-service shape as
`services/shop.ts`/`services/inventory.ts` (own narrow `ExaminationPrismaClient` interface, own
error classes, own `requireActiveGameSession`):

1. Require an `ACTIVE` `GameSession` → `NoActiveGameError`.
2. `caseId` must resolve to a `Case` → `CaseNotFoundError`.
3. `shopItemId` must resolve to a `ShopItem` with `itemType === 'EXAMINATION'` →
   `NotAnExaminationError`.
4. Player must own that `ShopItem` (an `OwnedItem` row exists) → `ExaminationNotOwnedError`.
5. No existing `CaseExamination` for this `(session, case, shopItem)` triple →
   `ExaminationAlreadyOrderedError`.
6. Session must have an open `GameDayLog` → `NoOpenDayError`. This is what confines ordering to
   the day phase — no separate phase check, same derivation used everywhere else in this API.
7. Look up `CaseDocument`s of type `EXAMINATION_RESULTS` for this case; `isSuccessful` is
   whether one has `content.shopItemId === shopItemId`.
8. Unconditionally add the `ShopItem`'s `content.timeCostMs` (default `0`) into the open
   `GameDayLog.extraElapsedMs`.
9. If unsuccessful, deduct `EXAMINATION_FAILURE_PENALTY_MONEY` from `session.money` — no
   clamping, matching `purchaseItem`'s existing no-clamp precedent.
10. Create the `CaseExamination` row with the computed `isSuccessful`.
11. Return `{ gameSession, caseExamination }`.

| Condition | Status | Body |
|---|---|---|
| No/invalid session cookie | 401 | `{ "error": "unauthenticated" }` |
| Malformed body | 400 | Fastify's default schema-validation body |
| No `GameSession`, or latest one is not `ACTIVE` | 409 | `{ "error": "no_active_game" }` |
| `caseId` not found | 404 | `{ "error": "case_not_found" }` |
| `shopItemId` missing or not `EXAMINATION` | 409 | `{ "error": "not_an_examination" }` |
| Not owned | 409 | `{ "error": "examination_not_owned" }` |
| Already ordered | 409 | `{ "error": "examination_already_ordered" }` |
| No open `GameDayLog` | 409 | `{ "error": "no_open_day" }` |
| Success (matched or unmatched) | 200 | `{ "gameSession": {...}, "caseExamination": {...} }` |

## Visibility filter

`services/round.ts`'s `toCaseResponse` filters `record.documents`: any document with
`type !== 'EXAMINATION_RESULTS'` always passes through; one with `type === 'EXAMINATION_RESULTS'`
passes only if its `content.shopItemId` is in a `Set` of shop-item ids built from that session's
successful `CaseExamination` rows for the selected case (fetched in `startRound` alongside the
existing owned-items/diagnosis/treatment queries). A malformed/missing `content.shopItemId`
fails closed (stays hidden).

## Files

- `src/backend/prisma/schema/documentation.prisma`, `inventory.prisma`, `progression.prisma`,
  `patient.prisma` — schema changes and back-relations.
- `src/backend/src/constants.ts` (new) — `MIN_DAY_DURATION_MS`, `EXAMINATION_FAILURE_PENALTY_MONEY`.
- `src/backend/src/services/dayElapsed.ts` (new) — `computeEffectiveElapsedMs`.
- `src/backend/src/services/game.ts` — `endDay`/`resetDay` accounting fixes.
- `src/backend/src/services/round.ts` — resume accounting fix, visibility filter,
  `GameDayLogResponse` (client-facing subset that excludes the new internal-only fields).
- `src/backend/src/services/examination.ts` (new) — `orderExamination`.
- `src/backend/src/routes/examinations.ts` (new), registered in `src/backend/src/app.ts`.
- `docs/api/examinations.md` (new); `docs/api/day.md`, `docs/api/game.md`, `docs/api/round.md`,
  `docs/api/shop.md` updated.

## Testing

TDD red-green-refactor per CLAUDE.md §8: `test/services/dayElapsed.test.ts`,
`test/services/game.test.ts`, `test/services/round.test.ts`, `test/services/examination.test.ts`
(mocked-Prisma unit tests), and `test/routes/examinations.test.ts`, `test/routes/round.test.ts`,
`test/routes/game.test.ts`, `test/routes/day.test.ts` (real-Postgres `app.inject()` integration
tests) — including an end-to-end pause/resume-twice accumulation check and a full
matched-vs-unmatched examination round trip.
