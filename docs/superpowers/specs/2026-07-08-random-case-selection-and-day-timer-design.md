# Design: Random Lowest-Difficulty Case Selection + Day-End Timer

## Problem

Two gaps in the existing day-phase flow:

1. `POST /api/v1/round`'s case selection (`selectNextCase` in `services/round.ts`) already
   picks the lowest-`difficulty` active `Case` with no `DiagnosisAttempt` yet in the caller's
   session, but ties at that difficulty are broken deterministically (`findFirst` +
   `orderBy: difficulty asc`) — the same case is always served first whenever several share
   the lowest difficulty, across every player and every replay.
2. `POST /api/v1/day/end` (`endDay` in `services/game.ts`) ends the caller's open `GameDayLog`
   unconditionally. The frontend is expected to run its own ~10-minute day timer and call this
   endpoint once it elapses, but nothing on the backend verifies that any time has actually
   passed — a player could call it immediately after `POST /api/v1/round` to cut every day
   short.

## Data model

No migration required. `GameDayLog.startedAt` (`prisma/schema/progression.prisma`) already
exists and is already stamped at day-open time (`resolveOpenGameDayLog` in `services/round.ts`)
— it just wasn't read by `endDay` before.

## 1. Random tie-breaking (`services/round.ts`)

`selectNextCase` becomes a two-step lookup instead of one:

1. `case.findFirst` with `select: { difficulty: true }` to find the minimum difficulty among
   active, un-attempted cases (same `where`/`orderBy` as before, narrowed `select`).
2. `case.findMany` for every active, un-attempted case at exactly that difficulty, ordered by
   `id: 'asc'` (deterministic ordering so index-based selection is reproducible), with the
   existing `patient`/`documents` `include`.
3. Pick one candidate via `pickIndexForSeed(gameSessionId, candidates.length)`.

`pickIndexForSeed(seed, length)` is a small pure function (FNV-1a-style string hash, `%
length`) — not `Math.random()`. This was a deliberate correction during implementation: raw
`Math.random()` re-rolls on every call, which broke the pre-existing, tested guarantee that
calling `/round` again before the current case is diagnosed returns the *same* case (see
`round.test.ts`: `'resumes an open day log: calling twice returns the same case'`,
`docs/api/round.md`'s idempotency note). A hash of `gameSessionId` is stable across repeat
calls for the same candidate set, varies across sessions/players, and naturally lands on a
different index once a tied case is diagnosed and the candidate set shrinks — without a stored
"current case" pointer or a schema migration.

## 2. Day-end timing gate (`config.ts`, `services/game.ts`, `routes/day.ts`)

- `config.ts`: `export const MIN_DAY_DURATION_MS = 10 * 60 * 1000;` — a plain constant, not an
  env-resolved value like `SESSION_TTL_MS`. Unlike session TTL (which genuinely needs
  per-environment tuning), the 10-minute day length is a fixed game-design rule; threading it
  through `app.ts` → route options → service, the way `sessionTtlMs` is threaded for auth,
  would add configurability nobody asked for.
- `services/game.ts`: new `DayNotElapsedError extends Error` carrying `remainingMs`. In
  `endDay`, immediately after `requireOpenGameDayLog` resolves the open day log:
  ```ts
  const elapsedMs = Date.now() - openDayLog.startedAt.getTime();
  if (elapsedMs < MIN_DAY_DURATION_MS) {
    throw new DayNotElapsedError(MIN_DAY_DURATION_MS - elapsedMs);
  }
  ```
  Thrown before any stats are read/written, so a rejected call has zero side effects.
- `GameDayLogRecord` (defined in `services/round.ts`, shared with `game.ts`) gains a required
  `startedAt: Date` field; `toGameDayLogResponse` now includes it in the `day/end` response
  body (not sensitive, and useful for a frontend that wants to sync its own countdown against
  the server's clock).
- `routes/day.ts`: catches `DayNotElapsedError` and returns
  `409 { "error": "day_not_elapsed", "remainingMs": <number> }`, alongside the existing
  `no_active_game`/`no_open_day` mappings.
- `resetDay`, `pauseGame`, `resetGame` are untouched. Pausing does not freeze the 10-minute
  clock — a currently-`PAUSED` session already can't call `endDay` at all
  (`requireActiveGameSession` demands `status === 'ACTIVE'`), so the only case where paused
  time "counts" is time spent paused *before* resuming, which is an accepted simplification
  rather than a bug.

## Files

- `src/backend/src/services/round.ts` — `pickIndexForSeed`, `selectNextCase`,
  `RoundPrismaClient['case']`, `GameDayLogRecord.startedAt`.
- `src/backend/src/services/game.ts` — `DayNotElapsedError`, `endDay` timing check,
  `toGameDayLogResponse`.
- `src/backend/src/config.ts` — `MIN_DAY_DURATION_MS`.
- `src/backend/src/routes/day.ts` — `DayNotElapsedError` → `409 day_not_elapsed` mapping.
- `src/backend/test/services/round.test.ts`, `src/backend/test/routes/round.test.ts`.
- `src/backend/test/services/game.test.ts`, `src/backend/test/routes/day.test.ts`.
- `docs/api/round.md`, `docs/api/day.md`.

## Testing

TDD red-green-refactor per CLAUDE.md §8. Unit tests mock `RoundPrismaClient`/`GamePrismaClient`
directly (`pickIndexForSeed` determinism/range, `selectNextCase`'s two-query shape and
tie-breaking, `endDay`'s gate and `remainingMs`). Route tests use `app.inject()` against a real
test Postgres: seeding two same-difficulty cases and asserting the served case matches
`pickIndexForSeed`'s prediction and stays stable across repeat calls; asserting `day/end`
returns `409 day_not_elapsed` (with the `GameDayLog` still open) when called immediately after
`POST /api/v1/round`, and succeeds once `startedAt` is far enough in the past.

Out of scope: wiring the frontend `RoundProvider` to the real `/api/v1/round` endpoint (it
still reads a static mock file), the frontend's own countdown UI, and a diagnosis-submission
endpoint (`DiagnosisAttempt` creation) — none of these exist yet and are unrelated pre-existing
gaps.
