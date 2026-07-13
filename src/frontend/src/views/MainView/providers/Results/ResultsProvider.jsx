import React, { createContext, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { useRound } from '../../../../providers/Round';

export const ResultsContext = createContext(null);

/**
 * Shows the result of a diagnosis submission: whether it matched the case's real
 * correct answer, and the real money reward/penalty for the active case.
 *
 * Grading happens server-side, via `useRound().submitDiagnosis()` (POST
 * /api/v1/diagnoses — see docs/api/diagnoses.md): the client never has access to
 * `correctDiagnosisId`, so `isDiagnosisCorrect`/`moneyDelta` come straight from
 * that response rather than being computed here. Submitting does NOT advance
 * the round — the popup still needs to show the case just diagnosed. Only
 * closeResult() refetches, so the next case appears once the player has
 * acknowledged this one, not the moment they hit Submit.
 */
export function ResultsProvider({ children }) {
  const { round, submitDiagnosis, refreshRound } = useRound();
  const [result, setResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showResult = useCallback(
    async (selection) => {
      // A real case always carries a real id — if round.case isn't loaded yet, there's
      // nothing to submit against. isSubmitting guards against a second click firing a
      // duplicate submission while the first is still in flight.
      if (!round?.case || isSubmitting) return;
      setIsSubmitting(true);
      try {
        const data = await submitDiagnosis(round.case.id, selection.id);
        setResult({ selection, isCorrect: data.isDiagnosisCorrect, moneyDelta: data.moneyDelta });
      } finally {
        setIsSubmitting(false);
      }
    },
    [round, submitDiagnosis, isSubmitting],
  );

  const closeResult = useCallback(() => {
    setResult(null);
    refreshRound();
  }, [refreshRound]);

  const value = { isOpen: result !== null, result, showResult, closeResult, isSubmitting };

  return <ResultsContext.Provider value={value}>{children}</ResultsContext.Provider>;
}

ResultsProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
