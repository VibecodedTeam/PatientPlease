import React from 'react';
import PropTypes from 'prop-types';
import { OverlayPortal } from '../OverlayPortal';
import styles from './LabDisasterPopup.module.css';

/**
 * Shown instead of the normal examination result when the excision-biopsy
 * minigame (components/Excisio, run in its own browser tab — see
 * views/MinigameView) finishes with a score below the pass threshold. Styled
 * like ConfirmDialog (components/ConfirmDialog) — the same warning-badge,
 * danger-bordered, glowing dialog already used for the "back to start of
 * day"/"back to start of game" confirmations — since both are "something
 * went wrong, here's the consequence" moments. No findings document is
 * ordered for a failed attempt (see views/MainView/providers/BiopsyMinigame),
 * so Phone can be used to try again.
 * @param {{ onClose: () => void }} props
 */
export function LabDisasterPopup({ onClose }) {
  return (
    // overlay-portal: result must render above the day-phase screen and any open
    // Settings popup, matching ConfirmDialog's own stacking; no onDismiss —
    // acknowledging the failed sample is a deliberate action, so it must only happen
    // via the explicit Continue button, never a backdrop click or Escape.
    <OverlayPortal>
      <div className={styles.dialog}>
        <div className={styles.warningBadge} aria-hidden="true">
          ⚠
        </div>
        <h2 className={styles.title}>Katastrofa laboratoryjna</h2>
        <p className={styles.message}>
          Próbka tkanki uległa uszkodzeniu podczas przetwarzania. Wyniki tego badania nie są
          dostępne.
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.button} onClick={onClose}>
            Kontynuuj
          </button>
        </div>
      </div>
    </OverlayPortal>
  );
}

LabDisasterPopup.propTypes = {
  onClose: PropTypes.func.isRequired,
};
