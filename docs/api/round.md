# Round: Start/Resume Day Phase

Backend endpoint the frontend calls to start (or resume) a game round for the current day
phase. It returns everything `MainView` needs to render a fresh appointment in one call: the
player's `GameSession`, their owned shop items, the next unattempted `Case` (patient,
documents), a narrowed set of diagnosis options for that case, and the full treatment option
catalog.

## `POST /api/v1/round`

Starts a new round, or resumes the currently open one.

### Request

    POST /api/v1/round
    Cookie: session=<...>

No request body.

### Response

| Condition                                             | Status | Body |
|--------------------------------------------------------|--------|------|
| No/invalid session cookie                              | 401    | `{ "error": "unauthenticated" }` |
| No un-attempted active `Case` remains (session marked `COMPLETED`) | 409 | `{ "error": "no_cases_remaining" }` |
| Success                                                | 200    | see shape below |

200 (not 201) because the call is idempotent-ish from the client's perspective — resuming an
existing open round looks identical to a client as starting a new one.

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
      "purchasedAt": "iso-datetime",
      "isEquipped": false
    }
  ],
  "case": {
    "id": "uuid",
    "difficulty": 2, // raw SmallInt, not an enum
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
    "documents": [
      {
        "id": "uuid",
        "attentionPointRegion": "LEFT_ARM", // BodyRegion string, or null
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
  ],
  "dayLog": {
    "elapsedMs": 12345
  }
}
```

`dayLog.elapsedMs` is the effective elapsed time (wall-clock time since the open `GameDayLog`'s
`startedAt`, minus accumulated paused time, plus any time added by actions like ordering an
examination — see `computeEffectiveElapsedMs` in `src/backend/src/services/dayElapsed.ts`) already
spent on the still-open day. The frontend's day timer (`GameSessionProvider`) seeds its local
clock from this value once, the first time round data loads after mount, so refreshing the page
resumes the timer instead of restarting it at zero.

`diagnosisOptions` is **not** the full `Diagnosis` catalog — it's `case.correctDiagnosisId`'s
diagnosis plus up to 3 randomly-selected decoys from the rest of the catalog (fewer than 4 total
if the catalog itself has fewer than 4 diagnoses), sorted by `name`. Decoys are chosen fresh on
every call to this endpoint, including when resuming an already-open round, so the wrong options
shown for a given case can differ between calls. `treatmentOptions` is unaffected — it's still the
full `Treatment` catalog.

`case.correctDiagnosisId`, `case.correctTreatmentId`, and `case.resultExplanationText` are never
included in the response — grading now happens server-side via `POST /api/v1/diagnoses` (see
`docs/api/diagnoses.md`), so the client has no need to see the answer key. There is no
`case.attentionPoints` — each document instead carries `attentionPointRegion`, the coarse body
region it's about (or `null`), and the frontend's `PatientScene` maps that region to a 3D hotspot
position/zoom preset itself.

A `documents` entry of `type: "EXAMINATION_RESULTS"` is only included once the player has
successfully ordered the matching examination for this case — i.e. a `CaseExamination` row
exists for `(this session, this case, content.shopItemId)` with `isSuccessful: true`. Until
then it's omitted entirely, not returned with placeholder/redacted content. See
`docs/api/examinations.md` for how examinations are ordered.

## Orchestration

On each call, the backend:

1. Resolves the caller's `GameSession` — reuses their most recent one if `ACTIVE`, flips it
   back to `ACTIVE` if `PAUSED`, or creates a fresh one if none exists (or the latest is
   `GAME_OVER`/`COMPLETED`).
2. Picks the lowest-`difficulty` active `Case` that has no `DiagnosisAttempt` yet in this
   session. If none remain, marks the session `COMPLETED` and returns `409`. Ties at that
   lowest difficulty are broken by a uniform pick among the tied candidates — not insertion
   or id order — so replays don't always serve the same case first. The pick is a
   deterministic function of `gameSessionId` and the tied candidate set (see
   `pickIndexForSeed` in `services/round.ts`), not `Math.random()`: this keeps repeat calls
   idempotent (see below) while still varying across sessions and once a tied case is
   diagnosed and drops out of the candidate set.
3. Reuses the session's currently open `GameDayLog` (`endedAt: null`), or opens a new one.
4. Returns the session's owned shop items, a narrowed `diagnosisOptions` list for the case
   (see the `diagnosisOptions` note above), and the full `Treatment` catalog.

Calling this endpoint again while a `GameDayLog` is still open (i.e. before the current case
is resolved) returns the same case and does not create a duplicate `GameDayLog`.

## Related

- Route: `src/backend/src/routes/round.ts`
- Business logic: `src/backend/src/services/round.ts`
- App wiring: `src/backend/src/app.ts`
- Tests: `src/backend/test/routes/round.test.ts`, `src/backend/test/services/round.test.ts`
- Design spec: `docs/superpowers/specs/2026-07-07-start-round-endpoint-design.md`
