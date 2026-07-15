import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './MainView.module.css';
import { PatientScene, PatientSceneProvider } from '../../components/PatientScene';
import { Chat } from '../../components/Chat';
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
  const { round, terminalState, refreshRound } = useRound();
  const { isOpen: isResultOpen, result, closeResult } = useResults();
  const {
    isOpen: isStatisticsOpen,
    statistics,
    closeStatistics,
    endDayError,
    retryFinishDay,
  } = useStatistics();
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [settingsAutoOpened, setSettingsAutoOpened] = useState(false);
  const [activeView, setActiveView] = useState('scene');

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

  // RoundProvider is an app-root singleton (see AppRoutes.jsx) — it does not
  // remount when navigating between /game/main and /game/night, so its own
  // one-time mount effect only ever fires once per session. MainView DOES
  // remount on every entry into the day view (first login, or returning
  // from night), so this is what actually refetches the round each time —
  // without it, returning from night would keep showing the same stale
  // case indefinitely.
  useEffect(() => {
    refreshRound();
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
    navigate('/game/night');
  }

  if (terminalState) {
    return (
      <div className={styles.screen}>
        <div className={styles.gameFinished} role="status">
          {TERMINAL_MESSAGES[terminalState]}
        </div>
        <button type="button" className={styles.settingsButton} onClick={handleOpenSettings}>
          <span className={styles.gearIcon} aria-hidden="true">
            ⚙
          </span>
          <span>Open Settings</span>
        </button>
        {isSettingsOpen && (
          <Settings onClose={handleCloseSettings} autoPaused={settingsAutoOpened} />
        )}
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
          <div className={styles.patientAreaToggle}>
            <button
              type="button"
              className={styles.toggleButton}
              aria-pressed={activeView === 'scene'}
              onClick={() => setActiveView('scene')}
            >
              3D View
            </button>
            <button
              type="button"
              className={styles.toggleButton}
              aria-pressed={activeView === 'chat'}
              onClick={() => setActiveView('chat')}
            >
              Chat
            </button>
          </div>
          <div className={styles.patientAreaContent}>
            {/* PatientScene stays mounted (hidden when Chat is active) so its
                Three.js model setup isn't re-run on every toggle. Chat is
                mounted on demand — its history is restored from localStorage,
                so unmounting it loses nothing. */}
            <div className={activeView === 'scene' ? styles.pane : styles.paneHidden}>
              <PatientSceneProvider url="/3DModels/FinalBaseMesh.obj">
                <PatientScene documents={round?.case?.documents ?? NO_DOCUMENTS} />
              </PatientSceneProvider>
            </div>
            {activeView === 'chat' && (
              <div className={styles.pane}>
                <Chat gameSessionId={round?.gameSession?.id} caseId={round?.case?.id} />
              </div>
            )}
          </div>
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
      {/* A failed day-end (e.g. a transient backend error) would otherwise
          leave the player on a frozen desk with no way forward — this makes
          it recoverable. Hidden once the Daily Statistics popup succeeds. */}
      {endDayError && !isStatisticsOpen && (
        <div className={styles.endDayError} role="alert">
          <span>Couldn't end the day. Please try again.</span>
          <button type="button" className={styles.retryButton} onClick={retryFinishDay}>
            Try again
          </button>
        </div>
      )}
      {isSettingsOpen && (
        <Settings onClose={handleCloseSettings} autoPaused={settingsAutoOpened} />
      )}
      {isResultOpen && result && (
        <ResultPopup
          isCorrect={result.isCorrect}
          moneyDelta={result.moneyDelta}
          examineSeconds={result.examineSeconds}
          balance={result.balance}
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
