import React, { createContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useApi } from '../../../../providers/Api';

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
 * Loads the full round payload: game session, owned items, the active
 * case (patient, attention points, documents), and diagnosis/treatment
 * catalogs, by starting a round against the backend via `POST /api/v1/round`.
 */
export function RoundProvider({ children }) {
  const api = useApi();
  const [round, setRound] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [terminalState, setTerminalState] = useState(null);

  useEffect(() => {
    let isCancelled = false;

    api
      .post('/api/v1/round')
      .then((data) => {
        if (!isCancelled) setRound(data);
      })
      .catch((err) => {
        if (isCancelled) return;
        const terminal = terminalStateFromError(err);
        if (terminal) {
          setTerminalState(terminal);
        } else {
          setError(err);
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [api]);

  return (
    <RoundContext.Provider value={{ round, isLoading, error, terminalState }}>
      {children}
    </RoundContext.Provider>
  );
}

RoundProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
