# Game: Pause / Reset

Two backend actions on top of the `POST /api/v1/round` flow, letting the frontend pause the
game or abandon the whole save. See `docs/api/day.md` for resetting just the current day.

## `POST /api/v1/game/pause`

Pauses the caller's active game (stamps `pausedAt` on the open `GameDayLog` and flips the
`GameSession` to `PAUSED`). The next call to `POST /api/v1/round` flips it back to `ACTIVE` —
and that's also where the paused duration gets accounted for: `resolveGameSession`
(`src/backend/src/services/round.ts`) adds `now - pausedAt` into the day log's `totalPausedMs`
and clears `pausedAt`, so pausing a second (or third) time in the same day doesn't lose track of
the first pause's duration. See `docs/api/day.md` for how `totalPausedMs` feeds into the
end-of-day elapsed-time floor.

### Request

    POST /api/v1/game/pause
    Cookie: session=<...>

No request body.

### Response

| Condition                                        | Status | Body                                                                  |
| ------------------------------------------------ | ------ | --------------------------------------------------------------------- |
| No/invalid session cookie                        | 401    | `{ "error": "unauthenticated" }`                                      |
| No `GameSession`, or latest one is not `ACTIVE`  | 409    | `{ "error": "no_active_game" }`                                       |
| Session is `ACTIVE` but has no open `GameDayLog` | 409    | `{ "error": "no_open_day" }`                                          |
| Success                                          | 200    | `{ "gameSession": { ...same shape as /api/v1/round's gameSession } }` |

## `POST /api/v1/game/reset`

Ends the caller's current game. History (`GameDayLog`, `DiagnosisAttempt`, `OwnedItem`,
`ChatMessage`, `GameplayLog` rows) is preserved — nothing is deleted. The next call to
`POST /api/v1/round` creates a brand-new `GameSession`.

### Request

    POST /api/v1/game/reset
    Cookie: session=<...>

No request body.

### Response

| Condition                   | Status | Body                             |
| --------------------------- | ------ | -------------------------------- |
| No/invalid session cookie   | 401    | `{ "error": "unauthenticated" }` |
| No `GameSession` exists yet | 200    | `{ "gameSession": null }`        |
| Success                     | 200    | `{ "gameSession": { ... } }`     |

## Related

- Routes: `src/backend/src/routes/game.ts`
- Business logic: `src/backend/src/services/game.ts` (shared with `docs/api/day.md`)
- App wiring: `src/backend/src/app.ts`
- Tests: `src/backend/test/routes/game.test.ts`, `src/backend/test/services/game.test.ts`
- Design spec: `docs/superpowers/specs/2026-07-08-game-pause-reset-endpoints-design.md`
