import React from 'react';
import PropTypes from 'prop-types';
import { OverlayPortal } from '../OverlayPortal';
import styles from './ResultPopup.module.css';

/**
 * Formats a whole-second duration as m:ss (e.g. 42 -> "0:42", 90 -> "1:30").
 * @param {number} totalSeconds
 * @returns {string}
 */
function formatMMSS(totalSeconds) {
  const safeSeconds = Math.max(0, Math.trunc(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Shown after the player submits a diagnosis: whether it was correct, how
 * much money they earned or lost, how long they spent examining this case,
 * and (once submitted) the full account balance.
 * @param {{
 *   isCorrect: boolean,
 *   moneyDelta: number,
 *   examineSeconds?: number,
 *   balance?: number,
 *   onClose: () => void,
 * }} props
 */
export function ResultPopup({ isCorrect, moneyDelta, examineSeconds, balance, onClose }) {
  const verdictClassName = isCorrect
    ? `${styles.verdict} ${styles.verdictCorrect}`
    : `${styles.verdict} ${styles.verdictIncorrect}`;
  // Signed off `isCorrect` rather than `moneyDelta`'s own sign: when a
  // penalty is 0, `-penalty` is `-0` in JS, and `-0 >= 0` is true, which
  // would otherwise show an incorrect answer with a misleading "+" sign.
  const moneyClassName = isCorrect
    ? `${styles.moneyBox} ${styles.moneyPositive}`
    : `${styles.moneyBox} ${styles.moneyNegative}`;
  const formattedMoney = `${isCorrect ? '+' : '-'}${Math.abs(moneyDelta)} $`;

  return (
    // overlay-portal: result must render above the day-phase screen; no onDismiss —
    // closing this popup advances to the next case, so it must only happen via the
    // explicit Continue button, never a backdrop click or Escape.
    <OverlayPortal>
      <div className={styles.panel} onClick={(event) => event.stopPropagation()}>
        <h2 className={styles.title}>Wynik diagnozy</h2>
        <p className={verdictClassName}>{isCorrect ? 'Poprawnie!' : 'Niepoprawnie'}</p>
        <div className={moneyClassName}>{formattedMoney}</div>
        {typeof examineSeconds === 'number' && (
          <p className={styles.meta}>Czas badania: {formatMMSS(examineSeconds)}</p>
        )}
        {typeof balance === 'number' && <p className={styles.meta}>Saldo: {balance} $</p>}
        <button type="button" className={`${styles.button} ${styles.primary}`} onClick={onClose}>
          Kontynuuj
        </button>
      </div>
    </OverlayPortal>
  );
}

ResultPopup.propTypes = {
  isCorrect: PropTypes.bool.isRequired,
  moneyDelta: PropTypes.number.isRequired,
  examineSeconds: PropTypes.number,
  balance: PropTypes.number,
  onClose: PropTypes.func.isRequired,
};
