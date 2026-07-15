import React from 'react';
import { useDocumentTable } from '../Table/providers/DocumentTable';
import { CaseDocumentsPage } from './internal/CaseDocumentsPage/CaseDocumentsPage';
import { ExaminationsPage } from './internal/ExaminationsPage/ExaminationsPage';
import styles from './Notebook.module.css';

export function Notebook() {
  const { documents } = useDocumentTable();

  return (
    <div className={styles.notebook}>
      <CaseDocumentsPage documents={documents} />
      <ExaminationsPage documents={documents} />
    </div>
  );
}
