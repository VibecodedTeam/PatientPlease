# Design: Game Pause / Reset / Day Reset Endpoints

## Problem

The frontend needs three new backend actions on top of the existing `POST /api/v1/round`
flow:

1. Pause the current game (stamp `pausedAt` on the open `GameDayLog`).
2. Reset the whole game (abandon the current save, start fresh next time `/round` is called).
3. Reset the current day (undo today's progress without losing prior days).

## Data model

`GameDayLog.pausedAt DateTime?` already exists in `prisma/schema/progression.prisma` — no
migration required.

## Endpoints

### `POST /api/v1/game/pause`

Pauses the caller's active game.

Orchestration (`pauseGame(prisma, userId)` in `src/backend/src/services/game.ts`):

1. Find the latest `GameSession` for `userId` (`orderBy: createdAt desc`). If none exists, or
   its `status !== 'ACTIVE'`, throw `NoActiveGameError`.
2. Find the session's open `GameDayLog` (`endedAt: null`). If none, throw `NoOpenDayError`.
3. Update the day log: `pausedAt = now()`.
4. Update the session: `status = 'PAUSED'`.
5. Return the updated `GameSession`.

This mirrors `resolveGameSession` in `round.ts`, which already flips a `PAUSED` session back
to `ACTIVE` on the next `/round` call — no changes needed there.

| Condition | Status | Body |
|---|---|---|
| No/invalid session cookie | 401 | `{ "error": "unauthenticated" }` |
| No `GameSession`, or latest one is not `ACTIVE` | 409 | `{ "error": "no_active_game" }` |
| Session is `ACTIVE` but has no open `GameDayLog` | 409 | `{ "error": "no_open_day" }` |
| Success | 200 | `{ "gameSession": { ...same shape as /api/v1/round's gameSession } }` |

### `POST /api/v1/game/reset`

Ends the caller's current game. History (`GameDayLog`, `DiagnosisAttempt`, `OwnedItem`,
`ChatMessage`, `GameplayLog` rows) is preserved — nothing is deleted. The next call to
`POST /api/v1/round` will create a brand-new `GameSession`, since `resolveGameSession`
already creates a fresh session whenever the latest one is `GAME_OVER`/`COMPLETED`.

Orchestration (`resetGame(prisma, userId)`):

1. Find the latest `GameSession` for `userId`. If none exists, return `null` (no-op — a
   brand-new player has nothing to reset).
2. Update the session: `status = 'GAME_OVER'`.
3. If the session has an open `GameDayLog` (`endedAt: null`), stamp `endedAt = now()` on it
   too, so no day is left "open" under a game-over session. This is pure data-consistency
   cleanup: `resolveOpenGameDayLog` scopes its lookup by `gameSessionId`, so a stray open day
   log under an ended session can never be resumed by the new session created next `/round`
   call anyway — but leaving it open would be misleading in the historical record.
4. Return the updated `GameSession`.

| Condition | Status | Body |
|---|---|---|
| No/invalid session cookie | 401 | `{ "error": "unauthenticated" }` |
| No `GameSession` exists yet | 200 | `{ "gameSession": null }` |
| Success | 200 | `{ "gameSession": { ... } }` |

### `POST /api/v1/day/reset`

Reverts the caller's currently open day: deletes today's `DiagnosisAttempt` rows, refunds
money back to the day's `startingMoney`, and resets the day's counters. `dayNumber`,
`startingMoney`, and `startedAt` are untouched — this is the same day starting over, not a
new day.

Orchestration (`resetDay(prisma, userId)`):

1. Find the latest `GameSession` for `userId`. If none exists, throw `NoActiveGameError`.
2. Find the session's open `GameDayLog` (`endedAt: null`). If none, throw `NoOpenDayError`.
3. Delete all `DiagnosisAttempt` rows where `gameDayLogId` is that day log's id.
4. Update the session: `money = <day log's startingMoney>`; if `status === 'PAUSED'`, flip it
   back to `'ACTIVE'` (resetting the day implies the player is back in it, not stuck paused).
5. Update the day log: `casesAttempted = 0`, `casesCorrect = 0`, `penaltyApplied = false`,
   `pausedAt = null`.
6. Return the updated `GameSession`.

`consecutiveBadDiagnosisCount` and `studentLoanThreshold` on `GameSession` are untouched —
those are session-level plotline-pressure mechanics, not day-scoped state.

| Condition | Status | Body |
|---|---|---|
| No/invalid session cookie | 401 | `{ "error": "unauthenticated" }` |
| No `GameSession` at all | 409 | `{ "error": "no_active_game" }` |
| Session exists but has no open `GameDayLog` | 409 | `{ "error": "no_open_day" }` |
| Success | 200 | `{ "gameSession": { ... } }` |

## Files

- `src/backend/src/services/game.ts` — `pauseGame`, `resetGame`, `resetDay`,
  `NoActiveGameError`, `NoOpenDayError`, narrow `GamePrismaClient` interface (mirrors
  `RoundPrismaClient` in `services/round.ts`).
- `src/backend/src/routes/game.ts` — the three routes, registered in `src/backend/src/app.ts`
  alongside `roundRoutes`.
- `src/backend/test/services/game.test.ts` — mocked-Prisma unit tests per function.
- `src/backend/test/routes/game.test.ts` — real-test-DB `app.inject()` integration tests per
  endpoint.
- `docs/api/game.md` — new API doc, mirroring `docs/api/round.md`'s format.

## Testing

TDD red-green-refactor per CLAUDE.md §8, mirroring the existing `round.ts`/`round.test.ts`
split: mocked-Prisma unit tests for service logic, real-Postgres `app.inject()` tests for
route-level behavior (auth, status codes, error bodies).
