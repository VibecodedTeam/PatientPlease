import React from 'react';
import styles from './MainView.module.css';
import { Wall } from '../../components/Wall';

export function MainView() {
  return (
    <div className={styles.mainView}>
      <section className={styles.patientArea} aria-label="Patient preview area placeholder" />
      <div className={styles.rightColumn}>
        <div className={styles.wallCell}>
          <Wall />
        </div>
        <section className={styles.documentsArea} aria-label="Documents area placeholder" />
      </div>
    </div>
  );
}
