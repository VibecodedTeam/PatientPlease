import React from 'react';
import PropTypes from 'prop-types';
import { useDocumentTable } from '../../../../providers/DocumentTable';
import styles from './Information_2.module.css';

const DEFAULT_STORY =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.';

function formatKeyLabel(key) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
}

function formatHistoryContent(content) {
  if (!content) return '';
  if (typeof content === 'string') return content;
  return Object.entries(content)
    .map(([key, value]) => `${formatKeyLabel(key)}: ${value}`)
    .join('; ');
}

/**
 * @param {object} props
 * @param {string} props.title - Card heading, e.g. "General Patient Story".
 */
export function Information_2({ title = 'General Patient Story', className = '', ...rest }) {
  const { documents } = useDocumentTable();
  const historyDocuments = documents.filter((doc) => doc.type.includes('HISTORY'));

  const cardClassName = className ? `${styles.card} ${className}` : styles.card;

  return (
    <div className={styles.slot}>
      <div className={cardClassName} {...rest}>
        <div className={styles.title}>{title}</div>
        <div className={styles.content}>
          {historyDocuments.length > 0 ? (
            historyDocuments.map((doc) => (
              <p key={doc.id} className={styles.body}>
                <strong>{doc.title}: </strong>
                {formatHistoryContent(doc.content)}
              </p>
            ))
          ) : (
            <div className={styles.body}>{DEFAULT_STORY}</div>
          )}
        </div>
      </div>
    </div>
  );
}

Information_2.propTypes = {
  title: PropTypes.string,
  className: PropTypes.string,
};
