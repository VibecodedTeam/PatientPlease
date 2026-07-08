import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { OverlayPortal } from '../OverlayPortal';
import { ConfirmDialog } from '../ConfirmDialog';
import { useGameSession } from '../../providers/GameSession';
import styles from './Settings.module.css';

const CONFIRM_MESSAGES = {
  day: 'Return to the start of the day? Your progress today will be lost.',
  game: 'Return to the start of the game? All progress will be lost.',
};

export function Settings({ onClose, autoPaused = false }) {
  const { pauseTimer, resumeTimer, resetTimer } = useGameSession();
  const [pendingReset, setPendingReset] = useState(null);
  const [isMusicOn, setIsMusicOn] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    pauseTimer();
    return () => resumeTimer();
  }, [pauseTimer, resumeTimer]);

  function handleConfirmReset() {
    resetTimer();
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
            <span>{isLoggedIn ? 'Logged in as Doctor' : 'Logged out'}</span>
            <button
              type="button"
              className={`${styles.button} ${styles.rowButton} ${
                isLoggedIn ? '' : styles.primary
              }`}
              onClick={() => setIsLoggedIn((current) => !current)}
            >
              {isLoggedIn ? 'Log out' : 'Log in'}
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
