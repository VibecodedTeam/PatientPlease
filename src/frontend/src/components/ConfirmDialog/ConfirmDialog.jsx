import React from 'react';
import PropTypes from 'prop-types';
import { OverlayPortal } from '../OverlayPortal';
import styles from './ConfirmDialog.module.css';

export function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    // overlay-portal: confirmation must render above the Settings popup and page content
    <OverlayPortal>
      <div className={styles.dialog}>
        <div className={styles.warningBadge} aria-hidden="true">
          ⚠
        </div>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.button} ${styles.confirm}`}
            onClick={onConfirm}
          >
            Potwierdź
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.cancel}`}
            onClick={onCancel}
          >
            Anuluj
          </button>
        </div>
      </div>
    </OverlayPortal>
  );
}

ConfirmDialog.propTypes = {
  message: PropTypes.string.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};
