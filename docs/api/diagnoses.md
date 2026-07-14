# Diagnoses: Submit a Diagnosis for a Case

Backend endpoint the diagnosis panel's "Submit Diagnosis" button calls to grade a player's
diagnosis selection server-side and persist it as a `DiagnosisAttempt`. See `docs/api/round.md`
for how `selectNextCase` uses `DiagnosisAttempt` rows to avoid re-serving an already-diagnosed
case, and `docs/api/day.md` for how `POST /api/v1/day/end` aggregates them into day statistics.

## `POST /api/v1/diagnoses`

Grades `selectedDiagnosisId` (and optional `selectedTreatmentId`) against `caseId`'s answer key,
applies `moneyReward`/`moneyPenalty` to `GameSession.money` (floored at `0`), and creates a
`DiagnosisAttempt` row scoped to the session's currently open `GameDayLog`. A case can only be
submitted once per session — a second submission for the same `caseId` is rejected.

`selectedTreatmentId` is optional: the diagnosis panel has no treatment-selection UI yet, so it
is currently always omitted and `isTreatmentCorrect` is always `null`.

### Request

    POST /api/v1/diagnoses
    Cookie: session=<...>
    Content-Type: application/json

    { "caseId": "<Case.id>", "selectedDiagnosisId": "<Diagnosis.id>", "selectedTreatmentId": "<Treatment.id>" }

### Response

| Condition                                                     | Status | Body                                                                                                   |
| -------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------- |
| No/invalid session cookie                                       | 401    | `{ "error": "unauthenticated" }`                                                                       |
| Malformed body (missing `caseId`/`selectedDiagnosisId`)         | 400    | Fastify's default schema-validation body                                                               |
| No `GameSession`, or latest one is not `ACTIVE`                 | 409    | `{ "error": "no_active_game" }`                                                                        |
| `ACTIVE` session has no open `GameDayLog`                       | 409    | `{ "error": "no_open_day" }`                                                                            |
| `caseId` doesn't match any `Case`                                | 404    | `{ "error": "case_not_found" }`                                                                          |
| `selectedDiagnosisId` doesn't match any `Diagnosis`              | 404    | `{ "error": "diagnosis_not_found" }`                                                                     |
| `selectedTreatmentId` given but matches no `Treatment`           | 404    | `{ "error": "treatment_not_found" }`                                                                     |
| A `DiagnosisAttempt` already exists for this `(session, case)`  | 409    | `{ "error": "diagnosis_already_attempted" }`                                                             |
| Success                                                          | 200    | `{ "gameSession": { ... }, "result": { "isDiagnosisCorrect", "isTreatmentCorrect", "moneyDelta" } }`     |

## Related

- Route: `src/backend/src/routes/diagnoses.ts`
- Business logic: `src/backend/src/services/diagnosis.ts`
- App wiring: `src/backend/src/app.ts`
- Tests: `src/backend/test/routes/diagnoses.test.ts`, `src/backend/test/services/diagnosis.test.ts`
