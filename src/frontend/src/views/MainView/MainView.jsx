import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './MainView.module.css';
import { PatientScene, PatientSceneProvider } from '../../components/PatientScene';
import { Wall } from '../../components/Wall';
import { Table } from '../../components/Table';
import { RoundProvider } from './providers/Round';
import { DocumentTableProvider } from '../../components/Table/providers/DocumentTable';

const TERMINAL_MESSAGES = {
  completed: "You've completed every case. Well done!",
  game_over: 'Game over. Your practice has closed.',
};

/**
 * Renders the day-phase desk, or — when the backend reports the game can no
 * longer produce a round (`terminalState`) — a finished-game message in place of
 * the empty desk it would otherwise show.
 */
function MainViewContent() {
  const { terminalState } = useRound();

  if (terminalState) {
    return (
      <div className={styles.gameFinished} role="status">
        {TERMINAL_MESSAGES[terminalState]}
      </div>
    );
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
            <PatientScene documents={round?.case?.documents ?? NO_DOCUMENTS} />
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
      {isResultOpen && result && (
        <ResultPopup
          isCorrect={result.isCorrect}
          moneyDelta={result.moneyDelta}
          onClose={closeResult}
        />
      )}
      {/* Deferred while a ResultPopup is open, so the player always sees
          their diagnosis result before the day-end popup can cover it. */}
      {isStatisticsOpen && statistics && !isResultOpen && (
        <StatisticsPopup statistics={statistics} onClose={handleCloseStatistics} />
      )}
    </div>
  );
}

export function MainView() {
  return (
    <GameSessionProvider>
      <StatisticsProvider>
        <RoundProvider>
          <ResultsProvider>
            <DocumentTableProvider>
              <MainViewContent />
            </DocumentTableProvider>
          </ResultsProvider>
        </RoundProvider>
      </StatisticsProvider>
    </GameSessionProvider>
  );
}
