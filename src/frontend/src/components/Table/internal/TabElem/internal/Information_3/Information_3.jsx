import React from 'react';
import PropTypes from 'prop-types';
import { useDocumentTable } from '../../../../providers/DocumentTable';
import styles from './Information_3.module.css';

const DEFAULT_SYMPTOMS = [
  { name: 'Itching', duration: '2 weeks' },
  { name: 'Redness', duration: '3 days' },
  { name: 'Swelling', duration: '5 days' },
];

/**
 * @param {object} props
 * @param {string} props.title - Card heading, e.g. "Clinical Symptoms".
 */
export function Information_3({ title = 'Clinical Symptoms', className = '', ...rest }) {
  const { documents } = useDocumentTable();
  const symptomsDocument = documents.find((doc) => doc.type === 'CLINICAL_SYMPTOMS');
  // realCases.ts stores CLINICAL_SYMPTOMS as free-text `content: { description }` —
  // there is no structured symptom list in the schema.
  const note = symptomsDocument?.content?.description;

  const cardClassName = className ? `${styles.card} ${className}` : styles.card;

  return (
    <div className={styles.slot}>
      <div className={cardClassName} {...rest}>
        <h3 className={styles.title}>{title}</h3>
        {note ? (
          <p className={styles.body}>{note}</p>
        ) : (
          <table className={styles.table}>
            <tbody>
              {DEFAULT_SYMPTOMS.map((symptom) => (
                <tr key={symptom.name} className={styles.row}>
                  <td className={styles.symptomName}>{symptom.name}</td>
                  <td className={styles.symptomDuration}>{symptom.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

Information_3.propTypes = {
  title: PropTypes.string,
  className: PropTypes.string,
};
