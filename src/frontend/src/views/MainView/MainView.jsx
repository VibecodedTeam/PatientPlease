import React from 'react';
import styles from './MainView.module.css';
import { PatientScene, PatientSceneProvider } from '../../components/PatientScene';
import { Wall } from '../../components/Wall';
import { Table } from '../../components/Table';
import { RoundProvider } from './providers/Round';
import { DocumentTableProvider } from '../../components/Table/providers/DocumentTable';

export function MainView() {
  return (
    <RoundProvider>
      <DocumentTableProvider>
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
      </DocumentTableProvider>
    </RoundProvider>
  );
}
