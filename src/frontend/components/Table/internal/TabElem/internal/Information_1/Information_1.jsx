import React from 'react';
import PropTypes from 'prop-types';
import { useDocumentTable } from '../../../../providers/DocumentTable';
import styles from './Information_1.module.css';

/**
 * @param {object} props
 * @param {string} props.title - Card heading, e.g. "Patient Information".
 */
export function Information_1({ title = 'Patient Information', className = '', ...rest }) {
  const { patient } = useDocumentTable();

  const patientName = patient?.name ?? 'Jane Doe';
  const patientAge = patient?.age ?? '42';
  const notes = patient
    ? [
        patient.sex ? `Sex: ${patient.sex}` : null,
        patient.occupation ? `Occupation: ${patient.occupation}` : null,
        patient.chiefComplaint ? `Chief complaint: ${patient.chiefComplaint}` : null,
      ].filter(Boolean)
    : ['Pending clinical note', 'Pending clinical note', 'Pending clinical note'];

  const cardClassName = className ? `${styles.card} ${className}` : styles.card;

  return (
    <div className={styles.slot}>
      <div className={cardClassName} {...rest}>
        <h3 className={styles.title}>{title}</h3>
        <div className={styles.summary}>
          <span className={styles.patientName}>{patientName}</span>
          <span className={styles.patientAge}>Age {patientAge}</span>
        </div>
        <ul className={styles.notesList}>
          {notes.map((note, index) => (
            <li key={index} className={styles.noteItem}>
              {note}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

Information_1.propTypes = {
  title: PropTypes.string,
  className: PropTypes.string,
};
