# Diagnoses: Submission

Backend endpoint the frontend calls when the player submits a diagnosis for the active
`Case`. Grades server-side against the case's real `correctDiagnosisId` (never sent to the
client — see `docs/api/round.md`), persists a `DiagnosisAttempt` row, and credits/debits the
`GameSession`'s money by the case's real `moneyReward`/`moneyPenalty`.

This is what makes `selectNextCase` (`src/backend/src/services/round.ts`) stop re-serving the
same case: it excludes any `Case` with a `DiagnosisAttempt` already recorded for the caller's
current `GameDayLog`. Before this endpoint existed, no code path ever created that row, so
`POST /api/v1/round` always returned the same lowest-difficulty case no matter how many
diagnoses were submitted.

## `POST /api/v1/diagnoses`

### Request

    POST /api/v1/diagnoses
    Cookie: session=<...>
    Content-Type: application/json

    {
      "caseId": "uuid",
      "selectedDiagnosisId": "uuid"
    }

Both fields are required, non-empty strings. `caseId` should be the active case's `id` from
the most recent `POST /api/v1/round` response; `selectedDiagnosisId` should be one of that
response's `diagnosisOptions` ids.

### Response

| Condition | Status | Body |
|---|---|---|
| No/invalid session cookie | 401 | `{ "error": "unauthenticated" }` |
| No `GameSession`, or latest one is not `ACTIVE` | 409 | `{ "error": "no_active_game" }` |
| Session is `ACTIVE` but has no open `GameDayLog` | 409 | `{ "error": "no_open_day" }` |
| `caseId` does not match any `Case` | 404 | `{ "error": "case_not_found" }` |
| This `Case` already has a `DiagnosisAttempt` for the open `GameDayLog` | 409 | `{ "error": "case_already_attempted" }` |
| Success | 200 | see shape below |

```jsonc
{
  "gameSession": {
    "id": "uuid",
    "money": 150,
    "studentLoanThreshold": null,
    "consecutiveBadDiagnosisCount": 0,
    "status": "ACTIVE",
    "createdAt": "iso-datetime",
    "updatedAt": "iso-datetime"
  },
  "isDiagnosisCorrect": true,
  "moneyDelta": 50
}
```

`isDiagnosisCorrect` and `moneyDelta` are the authoritative grading result — the frontend's
`ResultsProvider` uses these directly to show the result popup rather than computing its own
copy, since the client never has access to `correctDiagnosisId` to grade against. `moneyDelta`
is `+case.moneyReward` when correct, `-case.moneyPenalty` when not; `gameSession.money` already
reflects it.

`selectedTreatmentId`/`isTreatmentCorrect` on the underlying `DiagnosisAttempt` row are left
`null` by this endpoint — there is no treatment-submission UI yet, so this endpoint only ever
records the diagnosis half of an attempt.

Submitting twice for the same case in the same day returns `409 case_already_attempted` on the
second call rather than silently double-crediting/debiting money.

## Related

- Route: `src/backend/src/routes/diagnoses.ts`
- Business logic: `src/backend/src/services/diagnoses.ts`
- App wiring: `src/backend/src/app.ts`
- Tests: `src/backend/test/routes/diagnoses.test.ts`, `src/backend/test/services/diagnoses.test.ts`
- Related: `docs/api/round.md` (`selectNextCase`'s exclusion filter this endpoint feeds),
  `docs/api/day.md` (`endDay`'s `casesAttempted`/`casesCorrect` stats, counted from the same
  `DiagnosisAttempt` rows)
