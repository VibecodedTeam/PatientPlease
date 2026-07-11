import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useApi } from '../Api';
import { ENDPOINTS } from '../../lib/endpointList';

export const RoundContext = createContext(null);

/**
 * Maps a failed `POST /api/v1/round` to a terminal game state, or `null` if the
 * failure is an ordinary error the caller should surface as such. The backend
 * returns 409 for a game that can no longer produce a round: `game_completed` /
 * `no_cases_remaining` mean the player finished every case, `game_over` means
 * they lost — both are dead-ends the day view renders a message for rather than
 * an empty desk.
 *
 * @param {*} err - The rejected value from the API client (an axios error).
 * @returns {'completed' | 'game_over' | null}
 */
function terminalStateFromError(err) {
  if (err?.response?.status !== 409) return null;
  switch (err.response.data?.error) {
    case 'game_completed':
    case 'no_cases_remaining':
      return 'completed';
    case 'game_over':
      return 'game_over';
    default:
      return null;
  }
}

/**
 * The single provider that talks to the backend for gameplay data. Owns the
 * round payload (game session, owned items, active case, diagnosis/treatment
 * catalogs) from POST /api/v1/round, plus every action that mutates game
 * session state — pause/reset/day-end/shop — so no other frontend provider
 * needs its own useApi() call for gameplay data (see CLAUDE.md's Provider
 * Isolation Contract). Every action updates round.gameSession from its
 * response so any consumer reading round.gameSession stays in sync regardless
 * of which provider triggered the mutation.
 */
export function RoundProvider({ children }) {
  const api = useApi();
  const [round, setRound] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [terminalState, setTerminalState] = useState(null);
  const [shopCatalog, setShopCatalog] = useState(null);
  const [isShopLoading, setIsShopLoading] = useState(false);
  const [shopError, setShopError] = useState(null);

  // Monotonically-increasing token: only the response from the MOST
  // RECENTLY issued call is allowed to update state. Any earlier call's
  // response, arriving after a later one (or after unmount, since the
  // token check runs regardless), is discarded instead of overwriting
  // fresher data or firing a state update nothing is listening for.
  const fetchTokenRef = useRef(0);

  const refreshRound = useCallback(async () => {
    const token = (fetchTokenRef.current += 1);
    setIsLoading(true);
    try {
      const data = await api.post(ENDPOINTS.round.start);
      if (token !== fetchTokenRef.current) return;
      setRound(data);
      setError(null);
      setTerminalState(null);
    } catch (err) {
      if (token !== fetchTokenRef.current) return;
      const terminal = terminalStateFromError(err);
      if (terminal) {
        setTerminalState(terminal);
      } else {
        setError(err);
      }
    } finally {
      if (token === fetchTokenRef.current) setIsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    refreshRound();
    // Fires exactly once for this RoundProvider instance's own mount (first
    // entry into /game/*). MainView additionally calls refreshRound() from
    // its own mount effect, so every subsequent entry into the day view -
    // including returning from /game/night, which does not remount
    // RoundProvider - also refetches.
  }, [refreshRound]);

  const pauseGame = useCallback(async () => {
    const data = await api.post(ENDPOINTS.game.pause);
    setRound((current) => (current ? { ...current, gameSession: data.gameSession } : current));
    return data;
  }, [api]);

  // Unlike pauseGame/endDay/purchaseShopItem, a reset needs a whole new case,
  // not just an updated gameSession — refetching the round is what actually
  // makes the desk show the next case instead of the one that was just reset.
  const resetDay = useCallback(async () => {
    const data = await api.post(ENDPOINTS.day.reset);
    await refreshRound();
    return data;
  }, [api, refreshRound]);

  const resetGame = useCallback(async () => {
    const data = await api.post(ENDPOINTS.game.reset);
    await refreshRound();
    return data;
  }, [api, refreshRound]);

  const endDay = useCallback(async () => {
    const data = await api.post(ENDPOINTS.day.end);
    setRound((current) => (current ? { ...current, gameSession: data.gameSession } : current));
    return data;
  }, [api]);

  // Separate token from fetchTokenRef: loadShopCatalog and refreshRound are
  // independent operations and must not treat each other as superseding.
  const shopFetchTokenRef = useRef(0);

  const loadShopCatalog = useCallback(async () => {
    const token = (shopFetchTokenRef.current += 1);
    setIsShopLoading(true);
    try {
      const data = await api.get(ENDPOINTS.shop.list);
      if (token !== shopFetchTokenRef.current) return null;
      setShopCatalog(data);
      setShopError(null);
      return data;
    } catch (err) {
      if (token !== shopFetchTokenRef.current) return null;
      setShopError(err);
      return null;
    } finally {
      if (token === shopFetchTokenRef.current) setIsShopLoading(false);
    }
  }, [api]);

  const purchaseShopItem = useCallback(
    async (shopItemId) => {
      const data = await api.post(ENDPOINTS.shop.purchase, { shopItemId });
      setRound((current) => (current ? { ...current, gameSession: data.gameSession } : current));
      return data;
    },
    [api],
  );

  const value = {
    round,
    isLoading,
    error,
    terminalState,
    refreshRound,
    pauseGame,
    resetDay,
    resetGame,
    endDay,
    shopCatalog,
    isShopLoading,
    shopError,
    loadShopCatalog,
    purchaseShopItem,
  };

  return <RoundContext.Provider value={value}>{children}</RoundContext.Provider>;
}

RoundProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
