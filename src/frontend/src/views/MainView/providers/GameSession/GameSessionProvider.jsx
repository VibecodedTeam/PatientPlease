import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useApi } from '../../../../providers/Api';

export const GameSessionContext = createContext(null);

export function GameSessionProvider({ children }) {
  const api = useApi();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!isPausedRef.current) {
        setElapsedSeconds((seconds) => seconds + 1);
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const pauseTimer = useCallback(() => {
    if (isPausedRef.current) {
      return;
    }
    setIsPaused(true);
    // Fire-and-forget: a 401 (shouldn't happen behind AuthGate) or 409
    // (no_active_game/no_open_day, expected until Round is wired to a real
    // session) must not block the local pause state from taking effect.
    api.post('/api/v1/game/pause').catch(() => {});
  }, [api]);

  // Real resume has no dedicated endpoint — per docs/api/game.md, a PAUSED
  // session flips back to ACTIVE on the next POST /api/v1/round call.
  // RoundProvider doesn't make that call yet (still reads mock JSON), so
  // this stays local-only until Round is wired to the real endpoint.
  const resumeTimer = useCallback(() => {
    setIsPaused(false);
  }, []);

  const resetDay = useCallback(() => {
    setElapsedSeconds(0);
    api.post('/api/v1/day/reset').catch(() => {});
  }, [api]);

  const resetGame = useCallback(() => {
    setElapsedSeconds(0);
    api.post('/api/v1/game/reset').catch(() => {});
  }, [api]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) {
        pauseTimer();
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [pauseTimer]);

  const value = { elapsedSeconds, isPaused, pauseTimer, resumeTimer, resetDay, resetGame };

  return <GameSessionContext.Provider value={value}>{children}</GameSessionContext.Provider>;
}

GameSessionProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
