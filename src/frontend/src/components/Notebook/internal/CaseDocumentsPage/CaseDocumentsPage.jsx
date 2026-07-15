import React from 'react';
import PropTypes from 'prop-types';
import { formatHistoryContent } from '../formatDocumentContent';
import styles from './CaseDocumentsPage.module.css';

const CASE_DOCUMENT_TYPES = [
  'DISEASE_HISTORY',
  'UV_EXPOSURE_HISTORY',
  'CLINICAL_SYMPTOMS',
  'FAMILY_HISTORY',
  'WEATHER_HISTORY',
];

/**
 * @param {object} props
 * @param {Array<{id: string, type: string, title: string, content: (string|Record<string, unknown>|null)}>} props.documents
 */
export function CaseDocumentsPage({ documents }) {
  const caseDocuments = documents.filter((doc) => CASE_DOCUMENT_TYPES.includes(doc.type));

  return (
    <div className={styles.page}>
      <h3 className={styles.heading}>Case Documents</h3>
      {caseDocuments.length > 0 ? (
        caseDocuments.map((doc) => (
          <p key={doc.id} className={styles.entry}>
            <strong>{doc.title}: </strong>
            {formatHistoryContent(doc.content)}
          </p>
        ))
      ) : (
        <p className={styles.empty}>No case documents revealed yet.</p>
      )}
    </div>
  );
}

CaseDocumentsPage.propTypes = {
  documents: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      content: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    }),
  ).isRequired,
};
