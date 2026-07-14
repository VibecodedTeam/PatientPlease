import React, { createContext, useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useGameSession } from '../GameSession';

export const StatisticsContext = createContext(null);

/**
 * Watches GameSession's day timer; once a day is over, calls the real
 * POST /api/v1/day/end (via GameSession's endDay) and opens the Daily
 * Statistics popup with the real day statistics derived from the returned
 * dayLog: cases correct/attempted, money earned (ending - starting money),
 * ending balance, and how long the day took.
 */
export function StatisticsProvider({ children }) {
  const { isDayOver, endDay } = useGameSession();
  const [statistics, setStatistics] = useState(null);

  useEffect(() => {
    if (!isDayOver) return undefined;

    let isCancelled = false;

    endDay()
      .then(({ dayLog }) => {
        if (isCancelled) return;
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
      });

    return () => {
      isCancelled = true;
    };
  }, [isDayOver, endDay]);

  const closeStatistics = useCallback(() => {
    setStatistics(null);
  }, []);

  const value = { isOpen: statistics !== null, statistics, closeStatistics };

  return <StatisticsContext.Provider value={value}>{children}</StatisticsContext.Provider>;
}

StatisticsProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
