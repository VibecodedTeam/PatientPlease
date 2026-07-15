# Game: Pause / Resume / Reset

Three backend actions on top of the `POST /api/v1/round` flow, letting the frontend pause/resume
the game or abandon the whole save. See `docs/api/day.md` for resetting just the current day.

## `POST /api/v1/game/pause`

Pauses the caller's active game (stamps `pausedAt` on the open `GameDayLog` and flips the
`GameSession` to `PAUSED`). `POST /api/v1/game/resume` (below) is the frontend's explicit
counterpart and must be called to bring the session back to `ACTIVE`. As a fallback, the next
call to `POST /api/v1/round` also flips a stale `PAUSED` session back to `ACTIVE` (e.g. after the
tab was closed mid-pause and the page is reloaded), accounting for the paused duration the same
way `resumeGame` does. See `docs/api/day.md` for how `totalPausedMs` feeds into the end-of-day
elapsed-time floor.

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

## `POST /api/v1/game/resume`

Resumes a game the caller previously paused (clears `pausedAt` on the open `GameDayLog`, folding
`now - pausedAt` into `totalPausedMs`, and flips the `GameSession` back to `ACTIVE`). This is the
explicit counterpart to `POST /api/v1/game/pause` — the frontend calls it whenever it locally
un-pauses (closing the Settings popup, tab becoming visible again) so the backend's session state
never drifts out of sync with what the player sees on screen. Without this call, every subsequent
gameplay action gated on an `ACTIVE` session (submitting a diagnosis, ending the day, ordering an
examination, a shop purchase) would 409 `no_active_game` until something else happened to call
`POST /api/v1/round` (see `docs/api/round.md`).

### Request

    POST /api/v1/game/resume
    Cookie: session=<...>

No request body.

### Response

| Condition                                        | Status | Body                                                                  |
| ------------------------------------------------ | ------ | ---------------------------------------------------------------------|
| No/invalid session cookie                        | 401    | `{ "error": "unauthenticated" }`                                      |
| No `GameSession`, or latest one is not `PAUSED`  | 409    | `{ "error": "not_paused" }`                                           |
| Session is `PAUSED` but has no open `GameDayLog` | 409    | `{ "error": "no_open_day" }`                                          |
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
