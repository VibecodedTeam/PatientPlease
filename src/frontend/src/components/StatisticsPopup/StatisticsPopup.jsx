import React from 'react';
import PropTypes from 'prop-types';
import { OverlayPortal } from '../OverlayPortal';
import styles from './StatisticsPopup.module.css';

/**
 * Formats a whole-millisecond duration as m:ss (e.g. 65000 -> "1:05").
 * @param {number} elapsedMs
 * @returns {string}
 */
function formatMMSS(elapsedMs) {
  const totalSeconds = Math.max(0, Math.round(elapsedMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Shown when a day ends: the real day-end statistics returned by the
 * backend (POST /api/v1/day/end) — how many cases were diagnosed correctly,
 * how much money was earned or lost that day, the ending balance, and how
 * long the day took.
 * @param {{
 *   statistics: {
 *     dayNumber: number,
 *     casesAttempted: number,
 *     casesCorrect: number,
 *     moneyEarned: number,
 *     endingMoney: number,
 *     elapsedMs: number,
 *   },
 *   onClose: () => void,
 * }} props
 */
export function StatisticsPopup({ statistics, onClose }) {
  const { casesAttempted, casesCorrect, moneyEarned, endingMoney, elapsedMs } = statistics;
  // Signed off moneyEarned's own sign (unlike ResultPopup, there's no
  // isCorrect to key off here — a day's net money is a genuine two-sided
  // figure) — a net loss shows "-$X", a net gain (or exactly zero) shows
  // "+$X".
  const isNetGain = moneyEarned >= 0;
  const moneyClassName = isNetGain
    ? `${styles.moneyValuePositive}`
    : `${styles.moneyValueNegative}`;
  const formattedMoney = `${isNetGain ? '+' : '-'}$${Math.abs(moneyEarned)}`;

  return (
    // overlay-portal: statistics must render above the day-phase screen
    <OverlayPortal onDismiss={onClose}>
      <div className={styles.panel} onClick={(event) => event.stopPropagation()}>
        <h2 className={styles.title}>Daily Statistics</h2>
        <div className={styles.moneyRow}>
          <div className={styles.moneyBox}>
            <span className={styles.moneyLabel}>Correct Diagnoses</span>
            <span className={styles.endingValue}>
              {casesCorrect} / {casesAttempted}
            </span>
          </div>
          <div className={styles.moneyBox}>
            <span className={styles.moneyLabel}>Day Time</span>
            <span className={styles.endingValue}>{formatMMSS(elapsedMs)}</span>
          </div>
        </div>
        <div className={styles.endingBox}>
          <span className={styles.moneyLabel}>Money Earned</span>
          <span className={moneyClassName}>{formattedMoney}</span>
        </div>
        <div className={styles.endingBox}>
          <span className={styles.moneyLabel}>Ending Money</span>
          <span className={styles.endingValue}>${endingMoney}</span>
        </div>
        <button type="button" className={`${styles.button} ${styles.primary}`} onClick={onClose}>
          Continue
        </button>
      </div>
    </OverlayPortal>
  );
}

StatisticsPopup.propTypes = {
  statistics: PropTypes.shape({
    dayNumber: PropTypes.number.isRequired,
    casesAttempted: PropTypes.number.isRequired,
    casesCorrect: PropTypes.number.isRequired,
    moneyEarned: PropTypes.number.isRequired,
    endingMoney: PropTypes.number.isRequired,
    elapsedMs: PropTypes.number.isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};
