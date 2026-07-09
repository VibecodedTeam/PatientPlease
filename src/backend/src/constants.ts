/** Minimum effective elapsed time (wall-clock minus paused time, plus examination time costs)
 * a GameDayLog must reach before POST /api/v1/day/end will end it. */
export const MIN_DAY_DURATION_MS = 10 * 60 * 1000;

/** Flat money penalty applied when an ordered EXAMINATION finds no matching results document
 * for that case. Set to 0 to disable — this is a single global constant, not per-item/per-case. */
export const EXAMINATION_FAILURE_PENALTY_MONEY = 25;
