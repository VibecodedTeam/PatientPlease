import React from 'react';
import PropTypes from 'prop-types';
import { OverlayPortal } from '../OverlayPortal';
import styles from './StatisticsPopup.module.css';

/**
 * Shown when a day ends: money made and lost during the day, and the day's
 * ending money sum.
 * @param {{ statistics: { moneyMade: number, moneyLost: number, endingMoney: number }, onClose: () => void }} props
 */
export function StatisticsPopup({ statistics, onClose }) {
  return (
    // overlay-portal: statistics must render above the day-phase screen; no onDismiss —
    // ending the day is a real state transition (advances to night), so it must only
    // happen via the explicit Continue button, never a backdrop click or Escape.
    <OverlayPortal>
      <div className={styles.panel} onClick={(event) => event.stopPropagation()}>
        <h2 className={styles.title}>Daily Statistics</h2>
        <div className={styles.moneyRow}>
          <div className={styles.moneyBox}>
            <span className={styles.moneyLabel}>Money Made</span>
            <span className={styles.moneyValuePositive}>${statistics.moneyMade}</span>
          </div>
          <div className={styles.moneyBox}>
            <span className={styles.moneyLabel}>Money Lost</span>
            <span className={styles.moneyValueNegative}>${statistics.moneyLost}</span>
          </div>
        </div>
        <div className={styles.endingBox}>
          <span className={styles.moneyLabel}>Ending Money</span>
          <span className={styles.endingValue}>${statistics.endingMoney}</span>
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
    moneyMade: PropTypes.number.isRequired,
    moneyLost: PropTypes.number.isRequired,
    endingMoney: PropTypes.number.isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};
