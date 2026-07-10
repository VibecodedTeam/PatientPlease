import { computeEffectiveElapsedMs } from '../../src/services/dayElapsed.js';

describe('computeEffectiveElapsedMs', () => {
  it('returns raw wall-clock elapsed time when there is no pause or extra time', () => {
    const now = new Date('2026-07-09T00:10:00.000Z');
    const startedAt = new Date('2026-07-09T00:00:00.000Z');

    const result = computeEffectiveElapsedMs({
      startedAt,
      totalPausedMs: 0,
      extraElapsedMs: 0,
      now,
    });

    expect(result).toBe(10 * 60 * 1000);
  });

  it('subtracts totalPausedMs from the raw elapsed time', () => {
    const now = new Date('2026-07-09T00:10:00.000Z');
    const startedAt = new Date('2026-07-09T00:00:00.000Z');

    const result = computeEffectiveElapsedMs({
      startedAt,
      totalPausedMs: 4 * 60 * 1000,
      extraElapsedMs: 0,
      now,
    });

    expect(result).toBe(6 * 60 * 1000);
  });

  it('adds extraElapsedMs on top of the raw elapsed time', () => {
    const now = new Date('2026-07-09T00:10:00.000Z');
    const startedAt = new Date('2026-07-09T00:00:00.000Z');

    const result = computeEffectiveElapsedMs({
      startedAt,
      totalPausedMs: 0,
      extraElapsedMs: 2 * 60 * 1000,
      now,
    });

    expect(result).toBe(12 * 60 * 1000);
  });

  it('combines subtracted paused time and added extra time in the same calculation', () => {
    const now = new Date('2026-07-09T00:10:00.000Z');
    const startedAt = new Date('2026-07-09T00:00:00.000Z');

    const result = computeEffectiveElapsedMs({
      startedAt,
      totalPausedMs: 4 * 60 * 1000,
      extraElapsedMs: 2 * 60 * 1000,
      now,
    });

    expect(result).toBe(8 * 60 * 1000);
  });

  it('defaults now to the current time when not provided', () => {
    const startedAt = new Date(Date.now() - 5000);

    const result = computeEffectiveElapsedMs({ startedAt, totalPausedMs: 0, extraElapsedMs: 0 });

    expect(result).toBeGreaterThanOrEqual(5000);
    expect(result).toBeLessThan(6000);
  });
});
