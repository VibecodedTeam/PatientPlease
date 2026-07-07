import React from 'react';
import { PatientScene, PatientSceneProvider } from '../../components/PatientScene';
import styles from './MainView.module.css';

export function MainView() {
  return (
    <div className={styles.layout}>
      {/* TEMPORARY: manual verification of PatientScene's dots/click detection, remove when told to */}
      <PatientSceneProvider url="/3DModels/FinalBaseMesh.obj">
        <PatientScene />
      </PatientSceneProvider>
      <div className={styles.content}>Main View</div>
    </div>
  );
}
