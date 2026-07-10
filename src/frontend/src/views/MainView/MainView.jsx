import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './MainView.module.css';
import { PatientScene, PatientSceneProvider } from '../../components/PatientScene';
import { Wall } from '../../components/Wall';
import { Table } from '../../components/Table';
import { Settings } from '../../components/Settings';
import { ResultPopup } from '../../components/ResultPopup';
import { StatisticsPopup } from '../../components/StatisticsPopup';
import { useRound } from '../../providers/Round';
import { DocumentTableProvider } from '../../components/Table/providers/DocumentTable';
import { GameSessionProvider, useGameSession } from './providers/GameSession';
import { ResultsProvider, useResults } from './providers/Results';
import { StatisticsProvider, useStatistics } from './providers/Statistics';

const TERMINAL_MESSAGES = {
  completed: "You've completed every case. Well done!",
  game_over: 'Game over. Your practice has closed.',
};

// Stable fallback so PatientScene's documents prop keeps the same reference
// across re-renders while round is still loading — a fresh [] literal here
// would otherwise re-trigger PatientScene's model-setup effect on every
// unrelated re-render (e.g. GameSession's per-second timer tick).
const NO_DOCUMENTS = [];

/**
 * Renders the day-phase desk, or — when the backend reports the game can no
 * longer produce a round (`terminalState`) — a finished-game message in place of
 * the empty desk it would otherwise show.
 */
function MainViewContent() {
  const navigate = useNavigate();
  const { elapsedSeconds, isPaused } = useGameSession();
  const { round, terminalState } = useRound();
  const { isOpen: isResultOpen, result, closeResult } = useResults();
  const { isOpen: isStatisticsOpen, statistics, closeStatistics } = useStatistics();
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

  function handleCloseStatistics() {
    closeStatistics();
    navigate('/night');
  }

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
        <ResultsProvider>
          <DocumentTableProvider>
            <MainViewContent />
          </DocumentTableProvider>
        </ResultsProvider>
      </StatisticsProvider>
    </GameSessionProvider>
  );
}
