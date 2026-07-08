import React, { createContext, useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useApi } from '../Api';
import { ENDPOINTS } from '../../lib/endpointList';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const api = useApi();
  const [status, setStatus] = useState('loading');
  const [user, setUser] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get(ENDPOINTS.auth.me)
      .then((body) => {
        if (cancelled) return;
        setUser(body.user);
        setStatus('authenticated');
      })
      .catch(() => {
        if (cancelled) return;
        setUser(null);
        setStatus('unauthenticated');
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  const login = useCallback(
    async (idToken) => {
      const body = await api.post(ENDPOINTS.auth.google, { idToken });
      setUser(body.user);
      setStatus('authenticated');
    },
    [api],
  );

  const logout = useCallback(async () => {
    await api.post(ENDPOINTS.auth.logout);
    setUser(null);
    setStatus('unauthenticated');
  }, [api]);

  return (
    <AuthContext.Provider value={{ status, user, login, logout }}>{children}</AuthContext.Provider>
  );
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
