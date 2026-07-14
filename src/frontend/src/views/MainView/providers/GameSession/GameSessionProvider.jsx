import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useRound } from '../../../../providers/Round';

export const GameSessionContext = createContext(null);

// How long a day runs before it auto-ends and the Daily Statistics popup
// appears (see views/MainView/providers/Statistics).
export const DAY_DURATION_SECONDS = 600;

export function GameSessionProvider({ children }) {
  const { pauseGame, resetDay: roundResetDay, resetGame: roundResetGame, endDay: roundEndDay } =
    useRound();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;
  const isDayOver = elapsedSeconds >= DAY_DURATION_SECONDS;
  const isDayOverRef = useRef(isDayOver);
  isDayOverRef.current = isDayOver;

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

  // Real resume has no dedicated endpoint — per docs/api/game.md, a PAUSED
  // session flips back to ACTIVE the next time POST /api/v1/round is called
  // (e.g. on the next page load), not by resumeTimer itself, so this only
  // updates local timer state. No-ops once the day is over: that freeze is
  // permanent until endDay() actually resets elapsedSeconds, not something
  // an unrelated resume (e.g. closing Settings) should be able to undo.
  const resumeTimer = useCallback(() => {
    if (isDayOverRef.current) {
      return;
    }
    setIsPaused(false);
  }, []);

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
