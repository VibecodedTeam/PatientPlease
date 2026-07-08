# Day: Reset

Backend action letting the frontend undo just the caller's currently open day. See
`docs/api/game.md` for pausing or fully resetting the game.

## `POST /api/v1/day/reset`

Reverts the caller's currently open day: deletes today's `DiagnosisAttempt` rows, refunds
money back to the day's `startingMoney`, and resets the day's counters. `dayNumber`,
`startingMoney`, and `startedAt` are untouched — this is the same day starting over, not a
new day. If the session was `PAUSED`, it's flipped back to `ACTIVE`.

A session that is `GAME_OVER` or `COMPLETED` (i.e. already ended via `POST /api/v1/game/reset`
or by exhausting every case) cannot have its day reset, even if it has a stray open
`GameDayLog` — it's treated the same as having no active game at all.

### Request

    POST /api/v1/day/reset
    Cookie: session=<...>

No request body.

### Response

| Condition                                                             | Status | Body                                                                  |
| --------------------------------------------------------------------- | ------ | --------------------------------------------------------------------- |
| No/invalid session cookie                                             | 401    | `{ "error": "unauthenticated" }`                                      |
| No `GameSession` at all, or the latest one is `GAME_OVER`/`COMPLETED` | 409    | `{ "error": "no_active_game" }`                                       |
| Session is `ACTIVE`/`PAUSED` but has no open `GameDayLog`             | 409    | `{ "error": "no_open_day" }`                                          |
| Success                                                               | 200    | `{ "gameSession": { ...same shape as /api/v1/round's gameSession } }` |

## Related

- Routes: `src/backend/src/routes/day.ts`
- Business logic: `src/backend/src/services/game.ts` (shared with `docs/api/game.md`)
- App wiring: `src/backend/src/app.ts`
- Tests: `src/backend/test/routes/day.test.ts`, `src/backend/test/services/game.test.ts`
- Design spec: `docs/superpowers/specs/2026-07-08-game-pause-reset-endpoints-design.md`
