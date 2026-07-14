import { resolveDayDurationSeconds } from './config.js';

/** Shared with the frontend's DAY_DURATION_SECONDS (see docker/.env's DAY_DURATION_SECONDS /
 * VITE_DAY_DURATION_SECONDS, and src/frontend's GameSessionProvider) so both sides' notion of
 * "how long a day is" come from one setting instead of two constants that can drift apart. */
export const DAY_DURATION_SECONDS = resolveDayDurationSeconds(
  process.env['DAY_DURATION_SECONDS'],
  60,
);

/** Minimum effective elapsed time (wall-clock minus paused time, plus examination time costs)
 * a GameDayLog must reach before POST /api/v1/day/end will end it. */
export const MIN_DAY_DURATION_MS = DAY_DURATION_SECONDS * 1000;

/** Flat money penalty applied when an ordered EXAMINATION finds no matching results document
 * for that case. Set to 0 to disable — this is a single global constant, not per-item/per-case. */
export const EXAMINATION_FAILURE_PENALTY_MONEY = 25;
