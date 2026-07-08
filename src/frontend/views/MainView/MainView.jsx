import React, { useEffect, useState } from 'react';
import { ApiProvider } from '../../providers/Api';
import { GameSessionProvider, useGameSession } from '../../providers/GameSession';
import { Settings } from '../../components/Settings';
import styles from './MainView.module.css';

function MainViewContent() {
  const { elapsedSeconds, isPaused } = useGameSession();
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [settingsAutoOpened, setSettingsAutoOpened] = useState(false);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) {
        setSettingsOpen(true);
        setSettingsAutoOpened(true);
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  function handleOpenSettings() {
    setSettingsAutoOpened(false);
    setSettingsOpen(true);
  }

  function handleCloseSettings() {
    setSettingsOpen(false);
    setSettingsAutoOpened(false);
  }

  return (
    <div className={styles.screen}>
      <div className={`${styles.hud} ${isPaused ? styles.hudPaused : ''}`}>
        <div className={styles.readouts}>
          <span className={`${styles.timer} ${isPaused ? styles.timerPaused : ''}`}>
            Elapsed: {elapsedSeconds}s
          </span>
          <div className={styles.statusRow}>
            <span
              aria-hidden="true"
              className={`${styles.statusDot} ${
                isPaused ? styles.statusDotPaused : styles.statusDotRunning
              }`}
            />
            <span className={`${styles.status} ${isPaused ? styles.statusPaused : ''}`}>
              Status: {isPaused ? 'Paused' : 'Running'}
            </span>
          </div>
        </div>
        <button type="button" className={styles.settingsButton} onClick={handleOpenSettings}>
          <span className={styles.gearIcon} aria-hidden="true">
            ⚙
          </span>
          <span>Open Settings</span>
        </button>
      </div>
      <div className={styles.stage}>Main View</div>
      {isSettingsOpen && (
        <Settings onClose={handleCloseSettings} autoPaused={settingsAutoOpened} />
      )}
    </div>
  );
}

export function MainView() {
  return (
    <ApiProvider>
      <GameSessionProvider>
        <MainViewContent />
      </GameSessionProvider>
    </ApiProvider>
  );
}
