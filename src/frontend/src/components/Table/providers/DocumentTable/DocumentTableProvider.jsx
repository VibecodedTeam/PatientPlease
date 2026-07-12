import React, { createContext } from 'react';
import PropTypes from 'prop-types';
import { useRound } from '../../../../providers/Round';

export const DocumentTableContext = createContext(null);

/**
 * Narrows RoundProvider's full payload down to what the desk/table
 * components need: the case's documents and patient identity. Leaf
 * components consume this provider, not useRound() directly — RoundProvider
 * itself is only ever read here, so nothing downstream is coupled to its
 * full shape.
 */
export function DocumentTableProvider({ children }) {
  const { round, isLoading, error } = useRound();
  const documents = round?.case?.documents ?? [];
  const patient = round?.case?.patient ?? null;
  const diagnosisOptions = round?.diagnosisOptions ?? [];

  return (
    <DocumentTableContext.Provider value={{ documents, patient, diagnosisOptions, isLoading, error }}>
      {children}
    </DocumentTableContext.Provider>
  );
}

DocumentTableProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
