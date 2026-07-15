import React from 'react';
import { useDocumentTable } from '../Table/providers/DocumentTable';
import { HistoryPage } from './internal/HistoryPage/HistoryPage';
import { SymptomsExamPage } from './internal/SymptomsExamPage/SymptomsExamPage';
import styles from './Notebook.module.css';

export function Notebook() {
  const { documents } = useDocumentTable();

  return (
    <div className={styles.notebook}>
      <HistoryPage documents={documents} />
      <SymptomsExamPage documents={documents} />
    </div>
  );
}
