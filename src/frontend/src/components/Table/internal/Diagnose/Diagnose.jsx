import React, { useState } from 'react';
import PropTypes from 'prop-types';
import styles from './Diagnose.module.css';

const DEFAULT_OPTIONS = [
  { id: 'no-condition', label: 'Brak zmian skórnych' },
  { id: 'minor-irritation', label: 'Niewielkie podrażnienie skóry' },
  { id: 'skin-cancer', label: 'Rak skóry' },
];

/**
 * @param {object} props
 * @param {string} props.title - Panel heading, e.g. "Diagnosis".
 * @param {{id: string, label: string}[]} props.options - Selectable diagnosis options.
 * @param {function({id: string, label: string}): void} [props.onSubmit] - Called with the selected option when the player submits.
 * @param {string} [props.errorMessage] - Shown near the submit button when the last submission failed.
 * @param {boolean} [props.disabled] - Blocks submission, e.g. while the real diagnosis catalog is still loading and `options` is showing DEFAULT_OPTIONS placeholders that don't exist in the backend.
 */
export function Diagnose({
  title = 'Diagnoza',
  options = DEFAULT_OPTIONS,
  onSubmit,
  errorMessage,
  disabled = false,
  className = '',
  ...rest
}) {
  const [selectedId, setSelectedId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedOption = options.find((option) => option.id === selectedId) || null;

  const cardClassName = className ? `${styles.card} ${className}` : styles.card;

  async function handleSubmit() {
    if (!selectedOption || !onSubmit || isSubmitting || disabled) return;
    setIsSubmitting(true);
    try {
      await onSubmit(selectedOption);
    } finally {
      setIsSubmitting(false);
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
          disabled={!selectedOption || isSubmitting || disabled}
          onClick={handleSubmit}
        >
          Prześlij diagnozę
        </button>
        {errorMessage && <p className={styles.errorMessage}>{errorMessage}</p>}
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
  errorMessage: PropTypes.string,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};
