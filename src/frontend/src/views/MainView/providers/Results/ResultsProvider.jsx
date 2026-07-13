import React, { createContext, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { useRound } from '../../../../providers/Round';

export const ResultsContext = createContext(null);

/**
 * Shows the result of a diagnosis submission: whether it matched the case's real
 * correct answer, and the real money reward/penalty. Grading happens server-side,
 * via `submitDiagnosis` (POST /api/v1/diagnoses) — see docs/api/diagnoses.md.
 */
export function ResultsProvider({ children }) {
  const { round, submitDiagnosis, refreshRound } = useRound();
  const [result, setResult] = useState(null);

  const showResult = useCallback(
    async (selection) => {
      // No real case loaded yet means there's nothing to grade against.
      if (!round?.case) return;
      const data = await submitDiagnosis(round.case.id, selection.id);
      setResult({
        selection,
        isCorrect: data.result.isDiagnosisCorrect,
        moneyDelta: data.result.moneyDelta,
      });
    },
    [round, submitDiagnosis],
  );

  const closeResult = useCallback(() => {
    setResult(null);
    // The just-diagnosed case now has a DiagnosisAttempt, so refetching the round
    // is what actually advances the desk to the next patient.
    refreshRound();
  }, [refreshRound]);

  const value = { isOpen: result !== null, result, showResult, closeResult };

  return <ResultsContext.Provider value={value}>{children}</ResultsContext.Provider>;
}

ResultsProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
