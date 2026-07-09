import React from 'react';
import PropTypes from 'prop-types';
import { OverlayPortal } from '../OverlayPortal';
import styles from './ResultPopup.module.css';

/**
 * Shown after the player submits a diagnosis: whether it was correct, and how
 * much money they earned or lost.
 * @param {{ isCorrect: boolean, moneyDelta: number, onClose: () => void }} props
 */
export function ResultPopup({ isCorrect, moneyDelta, onClose }) {
  const verdictClassName = isCorrect
    ? `${styles.verdict} ${styles.verdictCorrect}`
    : `${styles.verdict} ${styles.verdictIncorrect}`;
  // Signed off `isCorrect` rather than `moneyDelta`'s own sign: when a
  // penalty is 0, `-penalty` is `-0` in JS, and `-0 >= 0` is true, which
  // would otherwise show an incorrect answer with a misleading "+" sign.
  const moneyClassName = isCorrect
    ? `${styles.moneyBox} ${styles.moneyPositive}`
    : `${styles.moneyBox} ${styles.moneyNegative}`;
  const formattedMoney = `${isCorrect ? '+' : '-'}$${Math.abs(moneyDelta)}`;

  return (
    // overlay-portal: result must render above the day-phase screen
    <OverlayPortal onDismiss={onClose}>
      <div className={styles.panel} onClick={(event) => event.stopPropagation()}>
        <h2 className={styles.title}>Diagnosis Result</h2>
        <p className={verdictClassName}>{isCorrect ? 'Correct!' : 'Incorrect'}</p>
        <div className={moneyClassName}>{formattedMoney}</div>
        <button type="button" className={`${styles.button} ${styles.primary}`} onClick={onClose}>
          Continue
        </button>
      </div>
    </OverlayPortal>
  );
}

ResultPopup.propTypes = {
  isCorrect: PropTypes.bool.isRequired,
  moneyDelta: PropTypes.number.isRequired,
  onClose: PropTypes.func.isRequired,
};
