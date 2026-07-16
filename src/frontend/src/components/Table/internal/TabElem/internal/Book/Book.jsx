import React from 'react';
import PropTypes from 'prop-types';
import styles from './Book.module.css';

const DEFAULT_STORY_PARAGRAPHS = [
  'Pacjent zgłosił się w celu oceny utrzymującej się zmiany skórnej zauważonej w ciągu ostatnich tygodni. ' +
    'Nie podaje istotnego wywiadu dermatologicznego i opisuje zmianę jako stopniowo coraz bardziej ' +
    'widoczną podczas codziennych czynności.',
];

const DEFAULT_SYMPTOMS = [
  { name: 'Świąd', duration: '2 tygodnie' },
  { name: 'Zaczerwienienie', duration: '3 dni' },
  { name: 'Obrzęk', duration: '5 dni' },
];

/**
 * Presentational, isolated component: renders static/prop-driven patient
 * information as an open two-page book spread. Not wired to any provider —
 * callers pass content via props, defaults are shown otherwise.
 *
 * @param {object} props
 * @param {string} [props.storyTitle] - Left page heading.
 * @param {string[]} [props.storyParagraphs] - Left page prose paragraphs.
 * @param {string} [props.symptomsTitle] - Right page heading.
 * @param {{name: string, duration: string}[]} [props.symptoms] - Right page symptom rows.
 */
export function Book({
  storyTitle = 'Ogólny opis pacjenta',
  storyParagraphs = DEFAULT_STORY_PARAGRAPHS,
  symptomsTitle = 'Objawy kliniczne',
  symptoms = DEFAULT_SYMPTOMS,
  className = '',
  ...rest
}) {
  const rootClassName = className ? `${styles.book} ${className}` : styles.book;

  return (
    <div className={rootClassName} {...rest}>
      <div className={styles.pageLeft}>
        <h3 className={styles.pageTitle}>{storyTitle}</h3>
        <div className={styles.pageContent}>
          {storyParagraphs.map((paragraph, index) => (
            <p key={index} className={styles.storyParagraph}>
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      <div className={styles.spine} aria-hidden="true" />

      <div className={styles.pageRight}>
        <h3 className={styles.pageTitle}>{symptomsTitle}</h3>
        <ul className={styles.symptomsList}>
          {symptoms.map((symptom) => (
            <li key={symptom.name} className={styles.symptomRow}>
              <span className={styles.symptomName}>{symptom.name}</span>
              <span className={styles.symptomDuration}>{symptom.duration}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

Book.propTypes = {
  storyTitle: PropTypes.string,
  storyParagraphs: PropTypes.arrayOf(PropTypes.string),
  symptomsTitle: PropTypes.string,
  symptoms: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      duration: PropTypes.string.isRequired,
    }),
  ),
  className: PropTypes.string,
};
