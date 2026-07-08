import React, { createContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useApi } from '../../../../providers/Api';
import { ENDPOINTS } from '../../../../lib/endpointList';

export const RoundContext = createContext(null);

/**
 * Loads the full round payload: game session, owned items, the active
 * case (patient, documents), and diagnosis/treatment catalogs, from
 * POST /api/v1/round (starts a new round or resumes the currently open one).
 */
export function RoundProvider({ children }) {
  const api = useApi();
  const [round, setRound] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isCancelled = false;

    api
      .post(ENDPOINTS.round.start)
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
  }, [api]);

  return (
    <RoundContext.Provider value={{ round, isLoading, error }}>
      {children}
    </RoundContext.Provider>
  );
}

RoundProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
