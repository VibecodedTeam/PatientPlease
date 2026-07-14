import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useRound } from '../../../../providers/Round';

export const GameSessionContext = createContext(null);

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
  // docs/api/round.md's dayLog.elapsedMs, backed by services/dayElapsed.ts)
  // exactly once, the first time round data arrives after mount — this is
  // what makes a page refresh resume the timer instead of restarting it at
  // 0. Only fires once: later round updates (e.g. after pauseGame merges a
  // fresh gameSession into round) must not re-seed and clobber ticking that
  // has since happened locally, or the explicit 0 that resetDay/resetGame/
  // endDay already set.
  //
  // Clamped to DAY_DURATION_SECONDS: once the day is over, the frontend
  // freezes locally without ever calling the backend's pause endpoint (that
  // would flip GameSession to PAUSED and block submitting the last
  // diagnosis/examination — see services/diagnosis.ts and
  // services/examination.ts), so the server's real clock keeps running
  // while the player finishes the last case. Without the clamp, a refresh
  // during that window would seed an ever-growing raw value instead of the
  // frozen display the local ticker already shows everyone else.
  const hasSeededElapsedRef = useRef(false);
  useEffect(() => {
    if (hasSeededElapsedRef.current) return;
    if (typeof round?.dayLog?.elapsedMs !== 'number') return;
    hasSeededElapsedRef.current = true;
    const seededSeconds = Math.min(
      Math.floor(round.dayLog.elapsedMs / 1000),
      DAY_DURATION_SECONDS,
    );
    setElapsedSeconds(seededSeconds);
    if (seededSeconds >= DAY_DURATION_SECONDS) {
      setIsPaused(true);
    }
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

  const pauseTimer = useCallback(() => {
    if (isPausedRef.current) {
      return;
    }
    setIsPaused(true);
    // Fire-and-forget: a 401 (shouldn't happen behind AuthGate) or a 409
    // (no active session/open day yet — e.g. pausing before Round's own
    // POST /api/v1/round call resolves, or on an already-paused/completed
    // session) must not block the local pause state from taking effect.
    pauseGame().catch(() => {});
  }, [pauseGame]);

  // Mirrors pauseTimer: POSTs /api/v1/game/resume (see docs/api/game.md) so the
  // backend's GameSession flips back to ACTIVE as soon as the player actually
  // resumes, instead of staying PAUSED until some unrelated later call to
  // POST /api/v1/round happens to run. Without this, submitting a diagnosis or
  // ending the day after any earlier pause (Settings, a tab switch) would 409
  // no_active_game against a session the frontend already believes is running.
  // No-ops once the day is over: that freeze is permanent until endDay()
  // actually resets elapsedSeconds, not something an unrelated resume (e.g.
  // closing Settings) should be able to undo. Also no-ops when not currently
  // paused, so a redundant resumeTimer call never fires a needless request.
  const resumeTimer = useCallback(() => {
    if (isDayOverRef.current) {
      return;
    }
    if (!isPausedRef.current) {
      return;
    }
    setIsPaused(false);
    // Fire-and-forget, same reasoning as pauseTimer: a 401/409 here must not
    // block the local resume from taking effect.
    resumeGame().catch(() => {});
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
