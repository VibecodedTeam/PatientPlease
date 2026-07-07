import React from 'react';
import { PatientViewer } from '../../components/PatientViewer';
import styles from './MainView.module.css';

export function MainView() {
  return (
    <div className={styles.layout}>
      <PatientViewer />
      <div className={styles.content}>Main View</div>
    </div>
  );
}
