import React, { createContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { createHttpClient } from '../../../../lib/Api';

export const RoundContext = createContext(null);

// Same-origin client — this fetches the mock JSON from Vite's own dev
// server, not the backend. Swapped for `useApi()` once the real
// POST /api/v1/round endpoint exists.
//
// Uses window.location.origin (not an empty baseURL) because axios's fetch
// adapter has no implicit "current page" to resolve a relative URL against
// the way a browser's native fetch does — it needs a fully qualified base.
const mockClient = createHttpClient(window.location.origin);

/**
 * Loads the full round payload: game session, owned items, the active
 * case (patient, attention points, documents), and diagnosis/treatment
 * catalogs. Currently reads a static mock file; will become a POST to
 * /api/v1/round once the backend route exists.
 */
export function RoundProvider({ children }) {
  const [round, setRound] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isCancelled = false;

    mockClient
      .get('/src/data/round_data.json')
      .then((data) => {
        if (!isCancelled) setRound(data);
      })
      .catch((err) => {
        if (!isCancelled) setError(err);
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <RoundContext.Provider value={{ round, isLoading, error }}>
      {children}
    </RoundContext.Provider>
  );
}

RoundProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
