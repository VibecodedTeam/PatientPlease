import React from 'react';
import PropTypes from 'prop-types';
import styles from './Information_3.module.css';

const DEFAULT_SYMPTOMS = [
  { name: 'Itching', duration: '2 weeks' },
  { name: 'Redness', duration: '3 days' },
  { name: 'Swelling', duration: '5 days' },
];

/**
 * @param {object} props
 * @param {string} props.title - Card heading, e.g. "Clinical Symptoms".
 * @param {{name: string, duration: string}[]} props.symptoms - Reported symptoms paired with onset/duration, later populated from backend data.
 */
export function Information_3({
  title = 'Clinical Symptoms',
  symptoms = DEFAULT_SYMPTOMS,
  className = '',
  ...rest
}) {
  const cardClassName = className ? `${styles.card} ${className}` : styles.card;

  return (
    <div className={styles.slot}>
      <div className={cardClassName} {...rest}>
        <h3 className={styles.title}>{title}</h3>
        <table className={styles.table}>
          <tbody>
            {symptoms.map((symptom) => (
              <tr key={symptom.name} className={styles.row}>
                <td className={styles.symptomName}>{symptom.name}</td>
                <td className={styles.symptomDuration}>{symptom.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

Information_3.propTypes = {
  title: PropTypes.string,
  symptoms: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      duration: PropTypes.string.isRequired,
    })
  ),
  className: PropTypes.string,
};
