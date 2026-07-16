import React from 'react';
import PropTypes from 'prop-types';
import styles from './LetterToggle.module.css';

/**
 * One expanded-board row: a letter badge, its label/description, and a slider
 * switch the player flips to mark that trait as present on the current lesion.
 * @param {object} props
 * @param {'A'|'B'|'C'|'D'|'E'} props.letter
 * @param {string} props.label
 * @param {string} props.description
 * @param {boolean} props.isChecked
 * @param {() => void} props.onToggle
 * @param {number} [props.animationDelayMs]
 */
export function LetterToggle({ letter, label, description, isChecked, onToggle, animationDelayMs = 0 }) {
  const switchClassName = isChecked ? `${styles.switch} ${styles.switchOn}` : styles.switch;

  return (
    <div className={styles.row} role="listitem" style={{ animationDelay: `${animationDelayMs}ms` }}>
      <span className={styles.letterBadge} aria-hidden="true">
        {letter}
      </span>
      <div className={styles.text}>
        <p className={styles.label}>{label}</p>
        <p className={styles.description}>{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isChecked}
        aria-label={`Zaznacz cechę: ${label}`}
        className={switchClassName}
        onClick={onToggle}
      >
        <span className={styles.switchThumb} aria-hidden="true" />
      </button>
    </div>
  );
}

LetterToggle.propTypes = {
  letter: PropTypes.oneOf(['A', 'B', 'C', 'D', 'E']).isRequired,
  label: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  isChecked: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  animationDelayMs: PropTypes.number,
};
