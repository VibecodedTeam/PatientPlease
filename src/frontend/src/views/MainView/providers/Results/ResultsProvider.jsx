import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useRound } from '../../../../providers/Round';
import { useGameSession } from '../GameSession';
import { useStatistics } from '../Statistics';

export const ResultsContext = createContext(null);

/**
 * Shows the result of a diagnosis submission: whether it matched the case's real
 * correct answer, and the real money reward/penalty. Grading happens server-side,
 * via `submitDiagnosis` (POST /api/v1/diagnoses) — see docs/api/diagnoses.md.
 */
export function ResultsProvider({ children }) {
  const { round, submitDiagnosis, refreshRound } = useRound();
  const { elapsedSeconds, isDayOver } = useGameSession();
  const { finishDay } = useStatistics();
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // isDayOver can flip true at any moment (the day timer is a wall clock),
  // including while the current case is still being examined — closeResult
  // reads it via a ref so that decision uses the latest value rather than a
  // stale one captured when this callback was created.
  const isDayOverRef = useRef(isDayOver);
  isDayOverRef.current = isDayOver;

  // elapsedSeconds ticks every second, so a stale closure over it (captured
  // once when showResult was created) would report the wrong examine time.
  // Reading it via a ref, updated every render, keeps showResult itself
  // stable (see its deps below) while still observing the latest value.
  const elapsedSecondsRef = useRef(elapsedSeconds);
  elapsedSecondsRef.current = elapsedSeconds;

  // Marks when the current case first appeared, so examineSeconds measures
  // only the time spent on THIS case, not the whole day so far. Resets
  // whenever the case identity changes.
  const caseStartElapsedRef = useRef(elapsedSeconds);
  useEffect(() => {
    caseStartElapsedRef.current = elapsedSecondsRef.current;
  }, [round?.case?.id]);

  const showResult = useCallback(
    async (selection) => {
      // No real case loaded yet means there's nothing to grade against.
      if (!round?.case) return;
      setError(null);
      try {
        const data = await submitDiagnosis(round.case.id, selection.id);
        const examineSeconds = Math.max(
          0,
          elapsedSecondsRef.current - caseStartElapsedRef.current,
        );
        setResult({
          selection,
          isCorrect: data.result.isDiagnosisCorrect,
          moneyDelta: data.result.moneyDelta,
          examineSeconds,
          balance: data.gameSession.money,
        });
      } catch (err) {
        // Caught here (rather than left to reject) so a failed submission
        // surfaces via `error` instead of becoming an unhandled rejection.
        setError(err);
      }
    },
    [round, submitDiagnosis],
  );

  // This is the one point that decides whether the player moves on to a new
  // patient or the day ends instead — so a day timer that ran out while the
  // current patient was still being examined never cuts that examination
  // short: the player always finishes (submits + acknowledges) the patient
  // they're on first, and only then, if the day is over, does it actually
  // end rather than loading another case into an already-elapsed day.
  const closeResult = useCallback(() => {
    setResult(null);
    if (isDayOverRef.current) {
      finishDay();
      return;
    }
    // The just-diagnosed case now has a DiagnosisAttempt, so refetching the round
    // is what actually advances the desk to the next patient.
    refreshRound();
  }, [refreshRound, finishDay]);

  const value = { isOpen: result !== null, result, error, showResult, closeResult };

  return <ResultsContext.Provider value={value}>{children}</ResultsContext.Provider>;
}

ResultsProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
