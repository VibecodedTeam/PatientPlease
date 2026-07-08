import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useApi } from '../../../../providers/Api';
import { ENDPOINTS } from '../../../../lib/endpointList';

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
    api.post(ENDPOINTS.game.pause).catch(() => {});
  }, [api]);

  // Real resume has no dedicated endpoint — per docs/api/game.md, a PAUSED
  // session flips back to ACTIVE the next time POST /api/v1/round is called
  // (e.g. on the next page load), not by resumeTimer itself, so this only
  // updates local timer state.
  const resumeTimer = useCallback(() => {
    setIsPaused(false);
  }, []);

  const resetDay = useCallback(() => {
    setElapsedSeconds(0);
    api.post(ENDPOINTS.day.reset).catch(() => {});
  }, [api]);

  const resetGame = useCallback(() => {
    setElapsedSeconds(0);
    api.post(ENDPOINTS.game.reset).catch(() => {});
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
