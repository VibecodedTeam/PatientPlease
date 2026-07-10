import React, { createContext, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { useRound } from '../../../../providers/Round';

export const ResultsContext = createContext(null);

// There is no diagnosis-submission endpoint anywhere in the backend yet (checked
// every branch, local and remote) — docs/api/round.md explicitly states the real
// answer key (case.correctDiagnosisId/correctTreatmentId) is never sent to the
// frontend, since verification is meant to be server-side only. Until that
// endpoint exists, correctness is judged against this placeholder id (matching
// Diagnose.jsx's own DEFAULT_OPTIONS) instead of anything real.
// TODO(backend): delete this placeholder once a real diagnosis-submission
// endpoint exists, and judge correctness from its response instead.
const PLACEHOLDER_CORRECT_DIAGNOSIS_ID = 'skin-cancer';

/**
 * Shows the result of a diagnosis submission: whether it matched the (currently
 * placeholder) correct answer, and the real money reward/penalty for the active
 * case from Round.
 */
export function ResultsProvider({ children }) {
  const { round } = useRound();
  const [result, setResult] = useState(null);

  const showResult = useCallback(
    (selection) => {
      const isCorrect = selection.id === PLACEHOLDER_CORRECT_DIAGNOSIS_ID;
      const moneyDelta = isCorrect
        ? round?.case?.moneyReward ?? 0
        : -(round?.case?.moneyPenalty ?? 0);
      setResult({ selection, isCorrect, moneyDelta });
    },
    [round],
  );

  const closeResult = useCallback(() => {
    setResult(null);
  }, []);

  const value = { isOpen: result !== null, result, showResult, closeResult };

  return <ResultsContext.Provider value={value}>{children}</ResultsContext.Provider>;
}

ResultsProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
