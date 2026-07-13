import React, { useState } from 'react';
import PropTypes from 'prop-types';
import styles from './Diagnose.module.css';

const DEFAULT_OPTIONS = [
  { id: 'no-condition', label: 'No Skin Condition' },
  { id: 'minor-irritation', label: 'Minor Skin Irritation' },
  { id: 'skin-cancer', label: 'Skin Cancer' },
];

/**
 * @param {object} props
 * @param {string} props.title - Panel heading, e.g. "Diagnosis".
 * @param {{id: string, label: string}[]} props.options - Selectable diagnosis options.
 * @param {function({id: string, label: string}): void} [props.onSubmit] - Called with the selected option when the player submits.
 */
export function Diagnose({
  title = 'Diagnosis',
  options = DEFAULT_OPTIONS,
  onSubmit,
  isSubmitting = false,
  className = '',
  ...rest
}) {
  const [selectedId, setSelectedId] = useState(null);
  const selectedOption = options.find((option) => option.id === selectedId) || null;

  const cardClassName = className ? `${styles.card} ${className}` : styles.card;

  function handleSubmit() {
    if (selectedOption && onSubmit) {
      onSubmit(selectedOption);
    }
  }

  return (
    <div className={styles.slot}>
      <div className={cardClassName} {...rest}>
        <h3 className={styles.title}>{title}</h3>
        <div className={styles.optionList} role="radiogroup" aria-label={title}>
          {options.map((option) => {
            const isSelected = option.id === selectedId;
            const optionClassName = isSelected
              ? `${styles.option} ${styles.optionSelected}`
              : styles.option;

            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                className={optionClassName}
                onClick={() => setSelectedId(option.id)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className={styles.submitButton}
          disabled={!selectedOption || isSubmitting}
          onClick={handleSubmit}
        >
          Submit Diagnosis
        </button>
      </div>
    </div>
  );
}

Diagnose.propTypes = {
  title: PropTypes.string,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
  onSubmit: PropTypes.func,
  isSubmitting: PropTypes.bool,
  className: PropTypes.string,
};
