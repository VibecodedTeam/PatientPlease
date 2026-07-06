import React, { createContext, useMemo } from 'react';
import PropTypes from 'prop-types';

export const ApiContext = createContext(null);

function createApiClient(baseUrl) {
  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    if (!response.ok) {
      throw new Error(`API request to ${path} failed with status ${response.status}`);
    }
    return response.json();
  }

  return {
    get: (path) => request(path),
    post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  };
}

export function ApiProvider({ children, baseUrl = '' }) {
  const apiClient = useMemo(() => createApiClient(baseUrl), [baseUrl]);
  return <ApiContext.Provider value={apiClient}>{children}</ApiContext.Provider>;
}

ApiProvider.propTypes = {
  children: PropTypes.node.isRequired,
  baseUrl: PropTypes.string,
};
