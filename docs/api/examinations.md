# Examinations: Order an Examination on a Case

Backend endpoint letting the player spend an owned `EXAMINATION` `ShopItem` against a specific
`Case`, to try to reveal an `EXAMINATION_RESULTS` document for it. See `docs/api/round.md` for
how (and when) that document becomes visible in the round payload, and `docs/api/shop.md` for
how `EXAMINATION` items are purchased.

## `POST /api/v1/examinations`

Orders `shopItemId` against `caseId`. Every order is durable — it's recorded as a
`CaseExamination` row scoped to `(GameSession, Case, ShopItem)`, not to the day it was ordered
on, so it survives pausing/unpausing and carries over across days within the same session.

Ordering always costs time: the `ShopItem`'s `content.timeCostMs` (default `0` if absent) is
added to the open `GameDayLog`'s `extraElapsedMs`, which counts toward the
`MIN_DAY_DURATION_MS` floor the same way real elapsed time does (see `docs/api/day.md`) — so
ordering examinations lets the player reach the end-of-day floor sooner.

Whether or not a matching `EXAMINATION_RESULTS` document exists for this case, the endpoint
returns `200`: the response's `caseExamination.isSuccessful` tells the caller which happened.

- **Matched** (a `CaseDocument` of type `EXAMINATION_RESULTS` exists for this case with
  `content.shopItemId === shopItemId`): `isSuccessful: true`, money untouched, and that document
  becomes visible in future `POST /api/v1/round` responses for this case.
- **Unmatched** (no such document): `isSuccessful: false`, and
  `EXAMINATION_FAILURE_PENALTY_MONEY` (`src/backend/src/constants.ts`, default `25`, `0`
  disables it) is deducted from `GameSession.money` with no clamping — money can go negative.

### Request

    POST /api/v1/examinations
    Cookie: session=<...>
    Content-Type: application/json

    { "caseId": "<Case.id>", "shopItemId": "<ShopItem.id>" }

### Response

| Condition                                                               | Status | Body                                                                                                           |
| ----------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------- |
| No/invalid session cookie                                               | 401    | `{ "error": "unauthenticated" }`                                                                               |
| Malformed body (missing/empty `caseId` or `shopItemId`)                 | 400    | Fastify's default schema-validation body                                                                       |
| No `GameSession`, or latest one is not `ACTIVE`                         | 409    | `{ "error": "no_active_game" }`                                                                                |
| `caseId` doesn't match any `Case`                                       | 404    | `{ "error": "case_not_found" }`                                                                                |
| `shopItemId` doesn't exist, or isn't of type `EXAMINATION`              | 409    | `{ "error": "not_an_examination" }`                                                                            |
| Player has no `OwnedItem` for `shopItemId` in this session              | 409    | `{ "error": "examination_not_owned" }`                                                                         |
| A `CaseExamination` already exists for this `(session, case, shopItem)` | 409    | `{ "error": "examination_already_ordered" }`                                                                   |
| `ACTIVE` session has no open `GameDayLog`                               | 409    | `{ "error": "no_open_day" }`                                                                                   |
| Success (matched or unmatched alike)                                    | 200    | `{ "gameSession": { ... }, "caseExamination": { "id", "caseId", "shopItemId", "isSuccessful", "orderedAt" } }` |

Checks run in the order listed above — a request failing more than one check gets the
earliest-listed error. Note ownership and duplicate-order checks run **before** the open-day
check: an inactive/paused day only ever produces `no_active_game`, and a day that's ended for
the night only ever produces `no_open_day`, once ownership is confirmed — there's deliberately
no separate "day phase" check, since "does this session have an open `GameDayLog`" already
distinguishes day from night the same way it does everywhere else in this API.

## Related

- Route: `src/backend/src/routes/examinations.ts`
- Business logic: `src/backend/src/services/examination.ts`
- Constants: `src/backend/src/constants.ts` (`EXAMINATION_FAILURE_PENALTY_MONEY`)
- App wiring: `src/backend/src/app.ts`
- Tests: `src/backend/test/routes/examinations.test.ts`, `src/backend/test/services/examination.test.ts`
- Design spec: `docs/superpowers/specs/2026-07-09-examination-ordering-and-day-pause-accounting-design.md`
