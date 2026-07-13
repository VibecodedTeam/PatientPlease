import React from 'react';
import styles from './MainView.module.css';
import { PatientScene, PatientSceneProvider } from '../../components/PatientScene';
import { Wall } from '../../components/Wall';
import { Table } from '../../components/Table';
import { RoundProvider, useRound } from './providers/Round';
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
  );
}

export function MainView() {
  return (
    <RoundProvider>
      <DocumentTableProvider>
        <MainViewContent />
      </DocumentTableProvider>
    </RoundProvider>
  );
}
