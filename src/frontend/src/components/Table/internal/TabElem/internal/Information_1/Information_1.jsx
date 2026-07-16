import React from 'react';
import PropTypes from 'prop-types';
import { useDocumentTable } from '../../../../providers/DocumentTable';
import styles from './Information_1.module.css';

const SEX_LABELS = { MALE: 'Mężczyzna', FEMALE: 'Kobieta' };

/**
 * @param {object} props
 * @param {string} props.title - Card heading, e.g. "Dane pacjenta".
 */
export function Information_1({ title = 'Dane pacjenta', className = '', ...rest }) {
  const { patient } = useDocumentTable();

  const patientName = patient?.name ?? 'Jan Kowalski';
  const patientAge = patient?.age ?? '42';
  const notes = patient
    ? [
        patient.sex ? `Płeć: ${SEX_LABELS[patient.sex] ?? patient.sex}` : null,
        patient.occupation ? `Zawód: ${patient.occupation}` : null,
      ].filter(Boolean)
    : ['Oczekująca notatka kliniczna', 'Oczekująca notatka kliniczna', 'Oczekująca notatka kliniczna'];

  const cardClassName = className ? `${styles.card} ${className}` : styles.card;

  return (
    <div className={styles.slot}>
      <div className={cardClassName} {...rest}>
        <h3 className={styles.title}>{title}</h3>
        <div className={styles.summary}>
          <span className={styles.patientName}>{patientName}</span>
          <span className={styles.patientAge}>Wiek {patientAge}</span>
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
