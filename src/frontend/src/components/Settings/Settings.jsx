import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { OverlayPortal } from '../OverlayPortal';
import { ConfirmDialog } from '../ConfirmDialog';
import { useGameSession } from '../../views/MainView/providers/GameSession';
import { useAuth } from '../../providers/Auth';
import styles from './Settings.module.css';

const CONFIRM_MESSAGES = {
  day: 'Return to the start of the day? Your progress today will be lost.',
  game: 'Return to the start of the game? All progress will be lost.',
};

export function Settings({ onClose, autoPaused = false }) {
  const { pauseTimer, resumeTimer, resetDay, resetGame } = useGameSession();
  const { user, logout } = useAuth();
  const [pendingReset, setPendingReset] = useState(null);
  const [isMusicOn, setIsMusicOn] = useState(true);

  useEffect(() => {
    pauseTimer();
    return () => resumeTimer();
  }, [pauseTimer, resumeTimer]);

  function handleConfirmReset() {
    if (pendingReset === 'day') {
      resetDay();
    } else if (pendingReset === 'game') {
      resetGame();
    }
    setPendingReset(null);
    onClose();
  }

  function handleCancelReset() {
    setPendingReset(null);
  }

  return (
    <>
      {/* overlay-portal: settings must render above the day-phase screen */}
      <OverlayPortal>
        <div className={styles.panel}>
          <div className={styles.clip} aria-hidden="true" />
          <span className={styles.kicker}>Night Shift Control</span>
          <h2 className={styles.title}>Settings</h2>
          {autoPaused && (
            <p className={styles.notice}>Game paused because you left the tab.</p>
          )}
          <div className={styles.settingRow}>
            <span>Logged in as {user.name}</span>
            <button
              type="button"
              className={`${styles.button} ${styles.rowButton}`}
              onClick={() => logout()}
            >
              Log out
            </button>
          </div>
          <div className={styles.settingRow}>
            <span>Music</span>
            <button
              type="button"
              className={`${styles.button} ${styles.toggle}`}
              aria-label="Toggle music"
              aria-pressed={isMusicOn}
              onClick={() => setIsMusicOn((current) => !current)}
            >
              <span className={styles.toggleTrack} aria-hidden="true">
                <span className={styles.toggleThumb} />
              </span>
              <span className={styles.toggleText}>{isMusicOn ? 'On' : 'Off'}</span>
            </button>
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.button} ${styles.primary}`}
              onClick={onClose}
            >
              Resume
            </button>
            <button
              type="button"
              className={`${styles.button} ${styles.danger}`}
              onClick={() => setPendingReset('day')}
            >
              Back to start of day
            </button>
            <button
              type="button"
              className={`${styles.button} ${styles.danger}`}
              onClick={() => setPendingReset('game')}
            >
              Back to start of game
            </button>
          </div>
        </div>
      </OverlayPortal>
      {pendingReset && (
        <ConfirmDialog
          message={CONFIRM_MESSAGES[pendingReset]}
          onConfirm={handleConfirmReset}
          onCancel={handleCancelReset}
        />
      )}
    </>
  );
}

Settings.propTypes = {
  onClose: PropTypes.func.isRequired,
  autoPaused: PropTypes.bool,
};
