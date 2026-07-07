import React from 'react';
import { PatientViewer } from '../../components/PatientViewer';
import { Model3D, Model3DProvider } from '../../components/3DModule';
import styles from './MainView.module.css';

export function MainView() {
  return (
    <div className={styles.layout}>
      <PatientViewer />
      {/* TEMPORARY: manual verification of Model3D, remove when told to */}
      <Model3DProvider url="/3DModels/FinalBaseMesh.obj">
        <Model3D />
      </Model3DProvider>
      <div className={styles.content}>Main View</div>
    </div>
  );
}
