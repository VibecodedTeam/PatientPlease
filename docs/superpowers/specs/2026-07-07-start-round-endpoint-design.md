# Design: `POST /api/v1/round`

## Purpose

The frontend calls this endpoint to start (or resume) a game round for the current day phase.
It returns everything `MainView` needs to render a fresh appointment in one call: the player's
`GameSession`, their owned shop items, the next unattempted `Case` (patient, attention points,
documents), and the full diagnosis/treatment option catalogs.

## Schema note

This design targets the schema as it currently stands on `feature/game-round` (post
`20260707120851_refine_game_models` / `20260707123207_refine_game_models`). It does **not**
reintroduce `Patient.chiefComplaint`, `Case.unlockDay`, or the `CaseDifficulty` enum that those
migrations removed. Consequently the response contract differs slightly from the original
request:

- `case.difficulty` is the raw `SmallInt` (e.g. `2`), not an enum string like `"MEDIUM"`.
- `case.unlockDay` is omitted (column no longer exists).
- `patient.chiefComplaint` is omitted (column no longer exists).

Everything else in the response matches the originally requested shape.

## Files

| File | Purpose |
|---|---|
| `src/backend/src/routes/round.ts` | Fastify route: auth check, calls the service, maps errors to HTTP status |
| `src/backend/src/services/round.ts` | Orchestration + a narrow Prisma-client interface (mirrors `AuthPrismaClient` in `services/auth.ts`) |
| `docs/api/round.md` | Contract doc, following the format of `docs/api/auth.md` |
| `src/backend/test/routes/round.test.ts` | Fastify `inject()` tests against the real test Postgres DB |
| `src/backend/test/services/round.test.ts` | Unit tests against a mocked Prisma interface |

`app.ts` registers `roundRoutes` alongside `authRoutes`/`healthRoutes`.

## Orchestration — `startRound(prisma, userId)`

1. **Resolve the GameSession.**
   Find the user's most recent `GameSession` (`orderBy createdAt desc`, take first).
   - None exists → create one: `money: 0`, `consecutiveBadDiagnosisCount: 0`, `status: ACTIVE`.
   - `status === 'PAUSED'` → update to `status: ACTIVE`.
   - `status === 'ACTIVE'` → use as-is.
   - `status === 'GAME_OVER' | 'COMPLETED'` → create a new session (same defaults as "none exists").

2. **Select the next Case.**
   Query active `Case`s (`isActive: true`) that have **no** `DiagnosisAttempt` whose
   `gameDayLog.gameSessionId` equals this session's id. Order by `difficulty asc`, take the
   first. `include`:
   - `patient`
   - `attentionPoints` (`orderBy sortOrder asc`)
   - `documents` (`orderBy sortOrder asc`)

   Excluded from the query result mapping (answer-key fields, never sent to the client):
   `correctDiagnosisId`, `correctTreatmentId`, `resultExplanationText`.

   If no case matches: update the session to `status: COMPLETED`, then throw
   `NoCasesRemainingError`. The route maps this to `409`.

3. **Get-or-create the open GameDayLog.**
   Find a `GameDayLog` for this session with `endedAt: null`.
   - Found → reuse it (this is "the current round").
   - Not found → create one: `dayNumber: (max existing dayNumber for this session ?? 0) + 1`,
     `startingMoney: session.money`, `startedAt: now`.

4. **Fetch owned items.**
   `OwnedItem.findMany({ where: { gameSessionId }, include: { shopItem: true }, orderBy: { purchasedAt: 'asc' } })`.

5. **Fetch catalogs.**
   All `Diagnosis` rows and all `Treatment` rows, each `orderBy name asc`. No filtering —
   every player sees the same fixed menu regardless of case or inventory.

6. **Shape the response** (see Response Contract below) and return it.

## Route — `routes/round.ts`

```http
POST /api/v1/round
```

- No request body.
- `request.getCurrentUser()` — if `null`, respond `401 { error: 'unauthenticated' }` (matches
  `GET /auth/me` convention).
- Call `startRound(prisma, user.id)`.
  - Success → `200` with the shaped payload.
  - `NoCasesRemainingError` → `409 { error: 'no_cases_remaining' }`.
  - Any other error → rethrown, handled by Fastify's default error handler (`500`).

200 (not 201) because the call is idempotent-ish from the client's perspective — resuming an
existing open round looks identical to a client as starting a new one.

## Response Contract

```jsonc
{
  "gameSession": {
    "id": "uuid",
    "money": 100,
    "studentLoanThreshold": null,
    "consecutiveBadDiagnosisCount": 1,
    "status": "ACTIVE", // ACTIVE | PAUSED | GAME_OVER | COMPLETED
    "createdAt": "iso-datetime",
    "updatedAt": "iso-datetime"
  },
  "ownedItems": [
    {
      "id": "uuid",
      "shopItem": {
        "id": "uuid",
        "sku": "89898",
        "name": "Handbook",
        "description": "book about ai",
        "itemType": "HANDBOOK",
        "iconImageUrl": "https://cdn.example.com/handbook.png"
      },
      "purchasePrice": 100,
      "purchasedOnDay": 2,
      "purchasedAt": "iso-datetime"
    }
  ],
  "case": {
    "id": "uuid",
    "difficulty": 2, // raw SmallInt — see Schema note
    "moneyReward": 50,
    "moneyPenalty": 20,
    "patient": {
      "id": "uuid",
      "name": "Jan Kowalski",
      "age": 52,
      "sex": "MALE",
      "occupation": "Roofer",
      "portraitImageUrl": "https://cdn.example.com/patients/jan.png",
      "bodyModelVariant": "male_average_01"
    },
    "attentionPoints": [
      {
        "id": "uuid",
        "label": "Mole, left shoulder",
        "bodyRegion": "LEFT_ARM",
        "positionX": 0.12,
        "positionY": 0.45,
        "positionZ": 0.02,
        "hitboxRadius": 0.05,
        "zoomDistance": 1.2,
        "zoomYaw": 15.0,
        "zoomPitch": -5.0,
        "isKeyFinding": true,
        "sortOrder": 1
      }
    ],
    "documents": [
      {
        "id": "uuid",
        "attentionPointId": "uuid-or-null",
        "type": "SKIN_IMAGE",
        "title": "Left shoulder — day 1",
        "documentDate": "iso-datetime-or-null",
        "sortOrder": 1,
        "imageUrl": "https://cdn.example.com/skin/lesion_01.png",
        "imageWidthPx": 1024,
        "imageHeightPx": 768,
        "imageAltText": "Asymmetric brown lesion, ~8mm",
        "content": null
      }
    ]
  },
  "diagnosisOptions": [
    { "id": "uuid", "code": "MELANOMA", "name": "Melanoma", "category": "MALIGNANT" }
  ],
  "treatmentOptions": [
    { "id": "uuid", "code": "REFER_ONCO", "name": "Refer to oncology", "kind": "REFERRAL" }
  ]
}
```

Error responses:

| Condition | Status | Body |
|---|---|---|
| No/invalid session cookie | 401 | `{ "error": "unauthenticated" }` |
| No un-attempted active Case remains (session marked `COMPLETED`) | 409 | `{ "error": "no_cases_remaining" }` |

## Testing Plan (TDD)

Per CLAUDE.md Section 8, tests are written first (red), then the minimal implementation (green).

**`test/services/round.test.ts`** (mocked narrow Prisma interface, matching `AuthPrismaClient` style):

- Creates a new `GameSession` when the user has none.
- Resumes an `ACTIVE` session unchanged.
- Flips a `PAUSED` session to `ACTIVE`.
- Creates a fresh session when the latest one is `GAME_OVER` or `COMPLETED`.
- Selects the lowest-difficulty un-attempted `Case`; excludes cases with a `DiagnosisAttempt`
  linked via `GameDayLog` to this session.
- Reuses an open (`endedAt: null`) `GameDayLog`; creates a new one (correct `dayNumber`,
  `startingMoney`) when none is open.
- Throws `NoCasesRemainingError` and marks the session `COMPLETED` when no case matches.

**`test/routes/round.test.ts`** (Fastify `inject()`, real test Postgres, following `auth.test.ts` conventions):

- `401` with no session cookie.
- `200` end-to-end happy path for a brand-new user: verifies full response shape, verifies
  `correctDiagnosisId`/`correctTreatmentId`/`resultExplanationText` are absent from the `case`
  object.
- `200` resume path: calling twice with an open day log and no new attempts returns the same
  `case` both times, with no duplicate `GameDayLog` row created for the session.
- `ownedItems`, `diagnosisOptions`, `treatmentOptions` are populated and correctly shaped.
- `409` once every active `Case` has a `DiagnosisAttempt` in this session; confirms
  `GameSession.status` becomes `COMPLETED`.

Test data (`Patient`/`Case`/`Diagnosis`/`Treatment`/`ShopItem`/etc. fixtures) is created directly
via Prisma in test `beforeEach`/test bodies, truncated via the existing
`test/setup/truncate.ts` helper — no new fixture/factory layer, consistent with `auth.test.ts`'s
approach of creating rows inline.

## Docs

`docs/api/round.md` is added in the same PR, following the format of `docs/api/auth.md`
(per CLAUDE.md's ownership-boundary rule that an API contract change updates `docs/api/`
in the same PR).
