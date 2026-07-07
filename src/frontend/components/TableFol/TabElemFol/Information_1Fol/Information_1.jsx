import React from 'react';
import PropTypes from 'prop-types';
import styles from './Information_1.module.css';

/**
 * @param {object} props
 * @param {string} props.title - Card heading, e.g. "Patient Information".
 * @param {string} props.patientName - Patient's full name.
 * @param {string} props.patientAge - Patient's age.
 * @param {string[]} props.notes - Three placeholder clinical notes, later populated from backend data.
 */
export function Information_1({
  title = 'Patient Information',
  patientName = 'Jane Doe',
  patientAge = '42',
  notes = ['Pending clinical note', 'Pending clinical note', 'Pending clinical note'],
  className = '',
  ...rest
}) {
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
  patientName: PropTypes.string,
  patientAge: PropTypes.string,
  notes: PropTypes.arrayOf(PropTypes.string),
  className: PropTypes.string,
};
