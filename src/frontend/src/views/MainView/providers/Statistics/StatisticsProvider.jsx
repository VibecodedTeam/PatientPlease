import React, { createContext, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { useGameSession } from '../GameSession';

export const StatisticsContext = createContext(null);

/**
 * Owns the Daily Statistics popup's data. `finishDay` calls the real
 * POST /api/v1/day/end (via GameSession's endDay) and opens the popup with
 * the real day statistics derived from the returned dayLog: cases
 * correct/attempted, money earned (ending - starting money), ending
 * balance, and how long the day took.
 *
 * Deciding *when* it's actually safe to end the day — i.e. not while the
 * player is still examining/diagnosing the current patient — is not this
 * provider's job: that decision is made by ResultsProvider's closeResult,
 * the one place that already decides whether to advance to the next case.
 * This provider only owns *how* to end the day once asked.
 */
export function StatisticsProvider({ children }) {
  const { endDay } = useGameSession();
  const [statistics, setStatistics] = useState(null);

  const finishDay = useCallback(
    () =>
      endDay()
        .then(({ dayLog }) => {
          setStatistics({
            dayNumber: dayLog.dayNumber,
            casesAttempted: dayLog.casesAttempted,
            casesCorrect: dayLog.casesCorrect,
            moneyEarned: dayLog.endingMoney - dayLog.startingMoney,
            endingMoney: dayLog.endingMoney,
            elapsedMs: dayLog.elapsedMs,
          });
        })
        .catch((error) => {
          // No retry/error UI yet — the player can still fall back on
          // Settings' existing "Back to start of day"/"Back to start of
          // game" actions, which reset elapsedSeconds regardless of pause
          // state. This only guards against an unhandled rejection.
          // eslint-disable-next-line no-console
          console.error('Failed to end the day:', error);
        }),
    [endDay],
  );

  const closeStatistics = useCallback(() => {
    setStatistics(null);
  }, []);

  const value = { isOpen: statistics !== null, statistics, closeStatistics, finishDay };

  return <StatisticsContext.Provider value={value}>{children}</StatisticsContext.Provider>;
}

StatisticsProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
