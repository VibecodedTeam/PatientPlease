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
    // Clear local auth state regardless of the request outcome: a failed
    // logout call must not leave the user shown as still authenticated, nor
    // surface as an unhandled rejection at the (catch-less) call site.
    try {
      await api.post(ENDPOINTS.auth.logout);
    } catch {
      // Transport/server error on logout is non-actionable — clear the
      // client session anyway.
    }
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
