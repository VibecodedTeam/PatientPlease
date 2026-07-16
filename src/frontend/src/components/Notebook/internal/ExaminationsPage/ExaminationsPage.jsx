import React from 'react';
import PropTypes from 'prop-types';
import { formatHistoryContent } from '../formatDocumentContent';
import styles from './ExaminationsPage.module.css';

/**
 * @param {object} props
 * @param {Array<{id: string, type: string, title: string, content: (string|Record<string, unknown>|null)}>} props.documents
 */
export function ExaminationsPage({ documents }) {
  const examDocuments = documents.filter((doc) => doc.type === 'EXAMINATION_RESULTS');

  return (
    <div className={styles.page}>
      <h3 className={styles.heading}>Badania</h3>
      {examDocuments.length > 0 ? (
        examDocuments.map((doc) => (
          <p key={doc.id} className={styles.entry}>
            <strong>{doc.title}: </strong>
            {formatHistoryContent(doc.content)}
          </p>
        ))
      ) : (
        <p className={styles.empty}>Nie wykonano jeszcze żadnych badań.</p>
      )}
    </div>
  );
}

ExaminationsPage.propTypes = {
  documents: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      content: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    }),
  ).isRequired,
};
