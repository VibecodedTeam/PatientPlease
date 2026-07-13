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

## `POST /api/v1/day/end`

Ends the caller's currently open day, entering the night phase. Does **not** create the next
day's `GameDayLog` — that still happens lazily on the next `POST /api/v1/round` call. The
session's `status` is untouched (stays `ACTIVE`) — there is deliberately no `GameSessionStatus`
value for "night"; night-ness is derived from whether the latest `GameDayLog` has `endedAt` set
(see `docs/api/shop.md`/`docs/api/inventory.md`).

Ending a day also finalizes its statistics: `casesAttempted`/`casesCorrect` are counted from
that day's `DiagnosisAttempt` rows, `thresholdMet` compares `endingMoney` (the session's current
`money`) against `GameSession.studentLoanThreshold` (`null` if no threshold is configured), and
`penaltyApplied` is `true` exactly when a threshold is configured and missed.
`GameSession.consecutiveBadDiagnosisCount` resets to `0` on a day where every attempted case was
diagnosed correctly (including a zero-attempt day), and otherwise increases by that day's number
of incorrect diagnoses. None of this yet feeds back into `POST /api/v1/round` or otherwise gates
play — see `docs/superpowers/specs/2026-07-08-day-statistics-design.md`.

The day must have reached at least `MIN_DAY_DURATION_MS` (10 minutes;
`src/backend/src/constants.ts`) of **effective elapsed time** before it can be ended — a
server-side anti-cheat check, independent of whatever timer the frontend displays. This is a
hard minimum, not a forced maximum: the frontend is expected to run its own ~10-minute countdown
and call this endpoint once it elapses (after letting the player finish whatever patient they
were already examining), but the backend only ever verifies "has enough time passed," never
"has too much."

Effective elapsed time is not simply `Date.now() - GameDayLog.startedAt` — it accounts for time
spent paused and time added by in-game actions:

    effectiveElapsedMs = (now - startedAt) - totalPausedMs + extraElapsedMs

- `totalPausedMs` accumulates every pause/resume cycle: `POST /api/v1/game/pause` stamps
  `pausedAt`, and the *next* resume (the implicit `PAUSED` → `ACTIVE` transition inside
  `POST /api/v1/round`, see `docs/api/game.md`) adds `now - pausedAt` into `totalPausedMs` and
  clears `pausedAt` back to `null`. This is cumulative across any number of pause cycles within
  the same day — pausing a second (or third) time no longer clobbers the first pause's duration.
- `extraElapsedMs` accumulates time added by ordering an examination
  (`POST /api/v1/examinations`, see `docs/api/examinations.md`) — each `ShopItem`'s
  `content.timeCostMs` is added on top, so ordering examinations lets the floor be reached
  sooner, the same direction as time already passing.

The calculation lives in `computeEffectiveElapsedMs` (`src/backend/src/services/dayElapsed.ts`),
shared by `endDay` and the examination-ordering service.

### Request

    POST /api/v1/day/end
    Cookie: session=<...>

No request body.

### Response

| Condition                                          | Status | Body                                                                                                                                                             |
| --------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No/invalid session cookie                            | 401    | `{ "error": "unauthenticated" }`                                                                                                                                 |
| No `GameSession`, or latest one is not `ACTIVE`      | 409    | `{ "error": "no_active_game" }`                                                                                                                                  |
| Session is `ACTIVE` but has no open `GameDayLog`     | 409    | `{ "error": "no_open_day" }`                                                                                                                                     |
| Open `GameDayLog` has been open less than `MIN_DAY_DURATION_MS` | 409 | `{ "error": "day_not_elapsed", "remainingMs": 342000 }` |
| Success                                              | 200    | `{ "gameSession": { ..., "consecutiveBadDiagnosisCount" }, "dayLog": { "id", "dayNumber", "startingMoney", "endingMoney", "casesAttempted", "casesCorrect", "thresholdMet", "penaltyApplied", "startedAt", "endedAt" } }` |

Calling this twice in a row is safe: the second call finds no open day log and returns
`409 no_open_day`, which doubles as an "you're already at night" signal.

## Related

- Routes: `src/backend/src/routes/day.ts`
- Business logic: `src/backend/src/services/game.ts` (shared with `docs/api/game.md`)
- App wiring: `src/backend/src/app.ts`
- Tests: `src/backend/test/routes/day.test.ts`, `src/backend/test/services/game.test.ts`
- Design spec: `docs/superpowers/specs/2026-07-08-game-pause-reset-endpoints-design.md`
- Design spec: `docs/superpowers/specs/2026-07-08-day-statistics-design.md`
