import React from 'react';
import PropTypes from 'prop-types';
import { formatHistoryContent } from '../formatDocumentContent';
import styles from './SymptomsExamPage.module.css';

/**
 * @param {object} props
 * @param {Array<{id: string, type: string, title: string, content: (string|Record<string, unknown>|null)}>} props.documents
 */
export function SymptomsExamPage({ documents }) {
  const symptomsDocument = documents.find((doc) => doc.type === 'CLINICAL_SYMPTOMS');
  const examDocuments = documents.filter((doc) => doc.type === 'EXAMINATION_RESULTS');

  return (
    <div className={styles.page}>
      <section className={styles.section}>
        <h3 className={styles.heading}>Symptoms</h3>
        {symptomsDocument ? (
          <p className={styles.entry}>{formatHistoryContent(symptomsDocument.content)}</p>
        ) : (
          <p className={styles.empty}>No symptoms documented yet.</p>
        )}
      </section>
      <section className={styles.section}>
        <h3 className={styles.heading}>Exam Results</h3>
        {examDocuments.length > 0 ? (
          examDocuments.map((doc) => (
            <p key={doc.id} className={styles.entry}>
              <strong>{doc.title}: </strong>
              {formatHistoryContent(doc.content)}
            </p>
          ))
        ) : (
          <p className={styles.empty}>No examinations ordered yet.</p>
        )}
      </section>
    </div>
  );
}

SymptomsExamPage.propTypes = {
  documents: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      content: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    }),
  ).isRequired,
};
