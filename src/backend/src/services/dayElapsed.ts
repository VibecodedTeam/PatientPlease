export interface EffectiveElapsedInputs {
  startedAt: Date;
  totalPausedMs: number;
  extraElapsedMs: number;
  now?: Date;
}

/** Elapsed time actually "played" in a GameDayLog: wall-clock time since it started, minus
 * accumulated paused time, plus time added by actions like ordering an examination. */
export function computeEffectiveElapsedMs(inputs: EffectiveElapsedInputs): number {
  const now = inputs.now ?? new Date();
  return now.getTime() - inputs.startedAt.getTime() - inputs.totalPausedMs + inputs.extraElapsedMs;
}
