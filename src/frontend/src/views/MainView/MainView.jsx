import React, { useEffect, useState } from 'react';
import styles from './MainView.module.css';
import { PatientScene, PatientSceneProvider } from '../../components/PatientScene';
import { Wall } from '../../components/Wall';
import { Table } from '../../components/Table';
import { Settings } from '../../components/Settings';
import { RoundProvider } from './providers/Round';
import { DocumentTableProvider } from '../../components/Table/providers/DocumentTable';
import { GameSessionProvider, useGameSession } from './providers/GameSession';

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
      <div className={styles.mainView}>
        <section className={styles.patientArea} aria-label="Patient preview area">
          <PatientSceneProvider url="/3DModels/FinalBaseMesh.obj">
            <PatientScene />
          </PatientSceneProvider>
        </section>
        <div className={styles.rightColumn}>
          <div className={styles.wallCell}>
            <Wall />
          </div>
          <div className={styles.documentsArea}>
            <Table />
          </div>
        </div>
      </div>
      {isSettingsOpen && (
        <Settings onClose={handleCloseSettings} autoPaused={settingsAutoOpened} />
      )}
    </div>
  );
}

export function MainView() {
  return (
    <GameSessionProvider>
      <RoundProvider>
        <DocumentTableProvider>
          <MainViewContent />
        </DocumentTableProvider>
      </RoundProvider>
    </GameSessionProvider>
  );
}
