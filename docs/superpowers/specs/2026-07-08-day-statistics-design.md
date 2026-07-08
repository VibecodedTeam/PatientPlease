# Design: Day Statistics (endDay finalization)

## Problem

`GameDayLog` has always had `casesAttempted`, `casesCorrect`, `thresholdMet`, and
`penaltyApplied` columns, and `GameSession` has always had `consecutiveBadDiagnosisCount` — but
no code path ever wrote to them. `POST /api/v1/day/end` (added alongside shop/inventory work)
stamps `endedAt`/`endingMoney` but leaves the rest at their defaults. This finalizes those
remaining fields when a day ends.

## Data model

No migration — every field involved already exists:
- `GameDayLog.casesAttempted Int @default(0)`
- `GameDayLog.casesCorrect Int @default(0)`
- `GameDayLog.thresholdMet Boolean?`
- `GameDayLog.penaltyApplied Boolean? @default(false)`
- `GameSession.consecutiveBadDiagnosisCount Int @default(0)`

## Computation (`endDay(prisma, userId)` in `src/backend/src/services/game.ts`)

1. Resolve the active `GameSession` and its open `GameDayLog` (unchanged from the existing
   `endDay`).
2. Count that day's `DiagnosisAttempt` rows: `casesAttempted` = total count where
   `gameDayLogId` matches; `casesCorrect` = count where additionally `isDiagnosisCorrect: true`.
3. `endingMoney` = the session's current `money` (unchanged from the existing `endDay`).
4. `thresholdMet` = `null` if `GameSession.studentLoanThreshold` is `null`, otherwise
   `endingMoney >= studentLoanThreshold`.
5. `penaltyApplied` = `thresholdMet === false` (i.e. only `true` when a threshold exists and was
   missed).
6. `consecutiveBadDiagnosisCount` = `0` if `casesCorrect === casesAttempted` (including a
   zero-attempt day), otherwise the session's current count plus `casesAttempted - casesCorrect`.
7. Persist `casesAttempted`/`casesCorrect`/`thresholdMet`/`penaltyApplied`/`endingMoney`/`endedAt`
   on the `GameDayLog`, and `consecutiveBadDiagnosisCount` on the `GameSession`, and return both.

This is an intentionally simple placeholder rule for `penaltyApplied`/
`consecutiveBadDiagnosisCount` — no broader game-design spec for the "student-loan payoff" /
"repeated bad diagnoses" mechanics (CLAUDE.md Section 2) exists yet. Nothing currently *reads*
these fields to gate `POST /api/v1/round` or end the game; that wiring is deliberately deferred
to a future change once the mechanic itself is specced.

## Out of scope

- Any change to `POST /api/v1/round` or `services/round.ts`'s orchestration.
- Any new Prisma migration.
- Defining what a "penalty" actually does beyond setting `penaltyApplied`/
  `consecutiveBadDiagnosisCount` (no money deduction, no game-over trigger, etc. yet).

## Files

- `src/backend/src/services/round.ts` — `GameDayLogRecord` type gains 4 fields
- `src/backend/src/services/game.ts` — `GamePrismaClient` interface, `toGameDayLogResponse`,
  `endDay`
- `src/backend/test/services/game.test.ts` — unit tests (mocked Prisma)
- `src/backend/test/routes/day.test.ts` — integration test (real Postgres via `app.inject()`)
- `docs/api/day.md`
