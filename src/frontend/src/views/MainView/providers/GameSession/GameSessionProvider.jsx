import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useRound } from '../../../../providers/Round';

export const GameSessionContext = createContext(null);

// Sentinel distinct from every real dayNumber (including undefined, for a
// round payload whose dayLog omits it) so the very first seed always runs.
const UNSEEDED_DAY = Symbol('unseeded-day');

/** Mirrors the backend's resolveDayDurationSeconds (src/backend/src/config.ts) so both sides
 * fall back to the same default when the shared env var is unset/invalid. */
export function resolveDayDurationSeconds(value, fallback) {
  const parsed = Number(value);
  return value && Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

// How long a day runs before it auto-ends and the Daily Statistics popup
// appears (see views/MainView/providers/Statistics). Shared with the
// backend's DAY_DURATION_SECONDS via docker/.env's DAY_DURATION_SECONDS /
// VITE_DAY_DURATION_SECONDS (see src/backend/src/constants.ts), so one
// setting controls both instead of two constants that can drift apart.
export const DAY_DURATION_SECONDS = resolveDayDurationSeconds(
  import.meta.env && import.meta.env.VITE_DAY_DURATION_SECONDS,
  60,
);

export function GameSessionProvider({ children }) {
  const {
    round,
    pauseGame,
    resumeGame,
    resetDay: roundResetDay,
    resetGame: roundResetGame,
    endDay: roundEndDay,
  } = useRound();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;
  const isDayOver = elapsedSeconds >= DAY_DURATION_SECONDS;
  const isDayOverRef = useRef(isDayOver);
  isDayOverRef.current = isDayOver;

  // Seeds the timer from the backend's true elapsed time (see
  // docs/api/round.md's dayLog.elapsedMs, backed by services/dayElapsed.ts),
  // keyed on dayLog.dayNumber so it seeds once *per day*, not once per mount:
  //  - First round load after mount seeds the current day — this is what
  //    makes a page refresh resume the timer instead of restarting it at 0.
  //  - A new day (a different dayNumber, e.g. returning from night) re-seeds
  //    from that day's fresh elapsed (~0), instead of the previous seed
  //    latching the finished day's elapsed and freezing the new day at "day
  //    over". (RoundProvider.endDay also drops the finished day's dayLog so
  //    nothing stale is even seeded in the gap before the new round arrives.)
  //  - An unrelated round update within the same day (e.g. pauseGame merging
  //    a fresh gameSession) has an unchanged dayNumber, so it does NOT re-seed
  //    and clobber ticking that has since happened locally.
  //
  // Clamped to DAY_DURATION_SECONDS: once the day is over, the frontend
  // freezes locally without ever calling the backend's pause endpoint (that
  // would flip GameSession to PAUSED and block submitting the last
  // diagnosis/examination — see services/diagnosis.ts and
  // services/examination.ts), so the server's real clock keeps running
  // while the player finishes the last case. Without the clamp, a refresh
  // during that window would seed an ever-growing raw value instead of the
  // frozen display the local ticker already shows everyone else.
  const lastSeededDayRef = useRef(UNSEEDED_DAY);
  useEffect(() => {
    const dayLog = round?.dayLog;
    if (typeof dayLog?.elapsedMs !== 'number') return;
    const dayNumber = dayLog.dayNumber;
    if (lastSeededDayRef.current !== UNSEEDED_DAY && lastSeededDayRef.current === dayNumber) {
      return;
    }
    lastSeededDayRef.current = dayNumber;
    const seededSeconds = Math.min(Math.floor(dayLog.elapsedMs / 1000), DAY_DURATION_SECONDS);
    setElapsedSeconds(seededSeconds);
    setIsPaused(seededSeconds >= DAY_DURATION_SECONDS);
  }, [round]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!isPausedRef.current) {
        setElapsedSeconds((seconds) => {
          const next = seconds + 1;
          // Freezes the timer the instant the day is over, so it doesn't
          // keep ticking past DAY_DURATION_SECONDS while the real
          // POST /api/v1/day/end call (triggered by Statistics watching
          // isDayOver) is in flight or its popup is showing.
          if (next >= DAY_DURATION_SECONDS) {
            setIsPaused(true);
          }
          return next;
        });
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Tracks whether a backend pause WE initiated (via pauseTimer) is still
  // outstanding. resumeTimer uses this to release that pause even once the day
  // is over — otherwise a pause taken just before the day ended (Settings, a
  // tab switch) would strand the session PAUSED and block submitting the final
  // diagnosis / ending the day (both require an ACTIVE session server-side —
  // see services/diagnosis.ts and services/game.ts). A day-over freeze that
  // came from the local tick (not a real pause) leaves this false, so
  // resumeTimer correctly stays a pure no-op there.
  const backendPausedRef = useRef(false);

  const pauseTimer = useCallback(() => {
    if (isPausedRef.current) {
      return;
    }
    setIsPaused(true);
    backendPausedRef.current = true;
    // Fire-and-forget: a 401 (shouldn't happen behind AuthGate) or a 409
    // (no active session/open day yet — e.g. pausing before Round's own
    // POST /api/v1/round call resolves, or on an already-paused/completed
    // session) must not block the local pause state from taking effect.
    pauseGame().catch(() => {});
  }, [pauseGame]);

  // POSTs /api/v1/game/resume (see docs/api/game.md) so the backend's
  // GameSession flips back to ACTIVE as soon as the player resumes, instead of
  // staying PAUSED until some unrelated later call to POST /api/v1/round
  // happens to run. Without this, submitting a diagnosis or ending the day
  // after any earlier pause would 409 no_active_game against a session the
  // frontend already believes is running.
  const resumeTimer = useCallback(() => {
    // Always release a backend pause we initiated — even once the day is over
    // — so the final case stays submittable and the day can be ended.
    if (backendPausedRef.current) {
      backendPausedRef.current = false;
      // Fire-and-forget, same reasoning as pauseTimer: a 401/409 (e.g. the
      // session is no longer PAUSED) must not block anything.
      resumeGame().catch(() => {});
    }
    // The local day-over freeze is permanent until endDay() actually resets
    // elapsedSeconds — an unrelated resume (e.g. closing Settings) must not
    // visually un-freeze it. Also no-ops when not currently paused.
    if (isDayOverRef.current) {
      return;
    }
    if (!isPausedRef.current) {
      return;
    }
    setIsPaused(false);
  }, [resumeGame]);

  const resetDay = useCallback(() => {
    setElapsedSeconds(0);
    roundResetDay().catch(() => {});
  }, [roundResetDay]);

  const resetGame = useCallback(() => {
    setElapsedSeconds(0);
    roundResetGame().catch(() => {});
  }, [roundResetGame]);

  // Unlike resetDay/resetGame, the caller needs the real dayLog payload (for
  // the Statistics popup), so this awaits the request and lets a failure
  // propagate rather than swallowing it fire-and-forget.
  const endDay = useCallback(async () => {
    const data = await roundEndDay();
    setElapsedSeconds(0);
    return data;
  }, [roundEndDay]);

  // Advances the visible day timer by a fixed amount instead of waiting for
  // the real-time tick above — used when an action (e.g. ordering an
  // examination) consumes in-game time faster than the wall clock does.
  // Mirrors the tick's own freeze-at-the-limit behavior so a large enough
  // bump can end the day immediately, same as ticking there naturally would.
  const addElapsedSeconds = useCallback((seconds) => {
    setElapsedSeconds((current) => {
      const next = current + seconds;
      if (next >= DAY_DURATION_SECONDS) {
        setIsPaused(true);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) {
        pauseTimer();
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [pauseTimer]);

  const value = {
    elapsedSeconds,
    isPaused,
    isDayOver,
    pauseTimer,
    resumeTimer,
    resetDay,
    resetGame,
    endDay,
    addElapsedSeconds,
  };

  return <GameSessionContext.Provider value={value}>{children}</GameSessionContext.Provider>;
}

GameSessionProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
