import React, { createContext, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { useRound } from '../../../../providers/Round';

export const ResultsContext = createContext(null);

/**
 * Shows the result of a diagnosis submission: whether it matched the case's real
 * correct answer, and the real money reward/penalty for the active case from Round.
 *
 * Grading happens here, client-side, against `round.case.correctDiagnosisId` — there
 * is no `POST /diagnoses` (or similar) submission endpoint yet, so the backend has no
 * other way to tell the frontend which selection was right. This is a deliberate,
 * documented exception (see docs/api/round.md) for this single-player educational
 * game, not a pattern to extend to other answer-key fields.
 */
export function ResultsProvider({ children }) {
  const { round } = useRound();
  const [result, setResult] = useState(null);

  const showResult = useCallback(
    (selection) => {
      // A real case always carries real moneyReward/moneyPenalty (required backend
      // fields) — if round.case isn't loaded yet, there's no real result to grade
      // against, so this must not fabricate a fake $0 result.
      if (!round?.case) return;
      const isCorrect = selection.id === round.case.correctDiagnosisId;
      const moneyDelta = isCorrect ? round.case.moneyReward : -round.case.moneyPenalty;
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
