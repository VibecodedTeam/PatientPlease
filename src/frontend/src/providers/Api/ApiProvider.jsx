import React, { createContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import { createHttpClient } from '../../../lib/Api';

export const ApiContext = createContext(null);

export function ApiProvider({ children, baseUrl }) {
  const apiClient = useMemo(
    () => createHttpClient(baseUrl, { withCredentials: true }),
    [baseUrl],
  );
  return <ApiContext.Provider value={apiClient}>{children}</ApiContext.Provider>;
}

ApiProvider.propTypes = {
  children: PropTypes.node.isRequired,
  baseUrl: PropTypes.string.isRequired,
};
