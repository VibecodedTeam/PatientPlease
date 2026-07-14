import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useRound } from '../../../../providers/Round';
import { useGameSession } from '../GameSession';

export const ResultsContext = createContext(null);

/**
 * Shows the result of a diagnosis submission: whether it matched the case's real
 * correct answer, and the real money reward/penalty. Grading happens server-side,
 * via `submitDiagnosis` (POST /api/v1/diagnoses) — see docs/api/diagnoses.md.
 */
export function ResultsProvider({ children }) {
  const { round, submitDiagnosis, refreshRound } = useRound();
  const { elapsedSeconds, isDayOver } = useGameSession();
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Read via a ref (rather than as a closeResult dependency) so closeResult's
  // identity stays stable while still observing the latest value at call time.
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

  const closeResult = useCallback(() => {
    setResult(null);
    // The just-diagnosed case now has a DiagnosisAttempt, so refetching the round
    // is what actually advances the desk to the next patient — but only while
    // the day is still running. Once the day is over, refetching here would
    // hit POST /api/v1/round before the player ever reaches night phase,
    // which auto-starts the NEXT day's GameDayLog early (resolveOpenGameDayLog
    // creates one whenever none is open) — leaving the backend already past
    // night phase by the time the player actually navigates to the shop, so
    // every purchase 409s. The day-end/Statistics flow owns the round refetch
    // once night phase is properly entered (MainView's own mount effect).
    if (!isDayOverRef.current) {
      refreshRound();
    }
  }, [refreshRound]);

  const value = { isOpen: result !== null, result, error, showResult, closeResult };

  return <ResultsContext.Provider value={value}>{children}</ResultsContext.Provider>;
}

ResultsProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
