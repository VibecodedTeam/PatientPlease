import React from 'react';
import PropTypes from 'prop-types';
import { formatHistoryContent } from '../formatDocumentContent';
import styles from './HistoryPage.module.css';

/**
 * @param {object} props
 * @param {Array<{id: string, type: string, title: string, content: (string|Record<string, unknown>|null)}>} props.documents
 */
export function HistoryPage({ documents }) {
  const historyDocuments = documents.filter((doc) => doc.type.includes('HISTORY'));

  return (
    <div className={styles.page}>
      <h3 className={styles.heading}>History</h3>
      {historyDocuments.length > 0 ? (
        historyDocuments.map((doc) => (
          <p key={doc.id} className={styles.entry}>
            <strong>{doc.title}: </strong>
            {formatHistoryContent(doc.content)}
          </p>
        ))
      ) : (
        <p className={styles.empty}>No history recorded yet.</p>
      )}
    </div>
  );
}

HistoryPage.propTypes = {
  documents: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      content: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    }),
  ).isRequired,
};
