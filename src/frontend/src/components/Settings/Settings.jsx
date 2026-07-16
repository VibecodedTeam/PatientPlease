import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { OverlayPortal } from '../OverlayPortal';
import { ConfirmDialog } from '../ConfirmDialog';
import { useGameSession } from '../../views/MainView/providers/GameSession';
import { useAuth } from '../../providers/Auth';
import styles from './Settings.module.css';

const CONFIRM_MESSAGES = {
  day: 'Wrócić do początku dnia? Dzisiejszy postęp zostanie utracony.',
  game: 'Wrócić do początku gry? Cały postęp zostanie utracony.',
};

export function Settings({ onClose, autoPaused = false }) {
  const { pauseTimer, resumeTimer, resetDay, resetGame } = useGameSession();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pendingReset, setPendingReset] = useState(null);
  const [isMusicOn, setIsMusicOn] = useState(true);

  useEffect(() => {
    pauseTimer();
    return () => resumeTimer();
  }, [pauseTimer, resumeTimer]);

  function handleLogout() {
    logout().then(() => navigate('/'));
  }

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
          <span className={styles.kicker}>Sterowanie zmianą</span>
          <h2 className={styles.title}>Ustawienia</h2>
          {autoPaused && (
            <p className={styles.notice}>Gra wstrzymana — karta była nieaktywna.</p>
          )}
          <div className={styles.settingRow}>
            <span>Zalogowano jako {user.name}</span>
            <button
              type="button"
              className={`${styles.button} ${styles.rowButton}`}
              onClick={handleLogout}
            >
              Wyloguj się
            </button>
          </div>
          <div className={styles.settingRow}>
            <span>Muzyka</span>
            <button
              type="button"
              className={`${styles.button} ${styles.toggle}`}
              aria-label="Przełącz muzykę"
              aria-pressed={isMusicOn}
              onClick={() => setIsMusicOn((current) => !current)}
            >
              <span className={styles.toggleTrack} aria-hidden="true">
                <span className={styles.toggleThumb} />
              </span>
              <span className={styles.toggleText}>{isMusicOn ? 'Wł.' : 'Wył.'}</span>
            </button>
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.button} ${styles.primary}`}
              onClick={onClose}
            >
              Wznów
            </button>
            <button
              type="button"
              className={`${styles.button} ${styles.danger}`}
              onClick={() => setPendingReset('day')}
            >
              Wróć do początku dnia
            </button>
            <button
              type="button"
              className={`${styles.button} ${styles.danger}`}
              onClick={() => setPendingReset('game')}
            >
              Wróć do początku gry
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
