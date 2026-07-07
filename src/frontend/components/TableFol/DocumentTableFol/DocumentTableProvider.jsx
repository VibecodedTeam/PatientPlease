import React, { createContext } from 'react';
import PropTypes from 'prop-types';
import { useRound } from '../../../views/MainView/useRound';

export const DocumentTableContext = createContext(null);

/**
 * Narrows RoundProvider's full payload down to just the desk documents
 * (case.documents) that Table/TabElem/Information components need —
 * they don't need to know about gameSession, ownedItems, or the
 * diagnosis catalogs at all.
 */
export function DocumentTableProvider({ children }) {
  const { round, isLoading, error } = useRound();
  const documents = round?.case?.documents ?? [];
  return (
    <DocumentTableContext.Provider value={{ documents, isLoading, error }}>
      {children}
    </DocumentTableContext.Provider>
  );
}

DocumentTableProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
