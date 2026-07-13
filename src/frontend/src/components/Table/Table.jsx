import React from 'react';
import PropTypes from 'prop-types';
import styles from './Table.module.css';
import { TabElem } from './internal/TabElem/TabElem';
import { Diagnose } from './internal/Diagnose/Diagnose';
import { useResults } from '../../views/MainView/providers/Results';
import { useDocumentTable } from './providers/DocumentTable';

export function Table({ children, className = '', ...rest }) {
  const { showResult, error } = useResults();
  const { diagnosisOptions } = useDocumentTable();
  const rootClassName = className ? `${styles.table} ${className}` : styles.table;
  // undefined (not []) while the catalog isn't loaded yet, so Diagnose falls back to
  // its own DEFAULT_OPTIONS instead of rendering an empty radiogroup.
  const options =
    diagnosisOptions && diagnosisOptions.length > 0
      ? diagnosisOptions.map((diagnosis) => ({ id: diagnosis.id, label: diagnosis.name }))
      : undefined;
  // Diagnose stays presentational and doesn't know about the backend/axios error
  // shape, so this is where the raw error is turned into a message it can render.
  const errorMessage = error ? 'Could not submit diagnosis. Please try again.' : undefined;

  return (
    <div className={rootClassName} {...rest}>
      <TabElem />
      <Diagnose options={options} onSubmit={showResult} errorMessage={errorMessage} />
      {children}
    </div>
  );
}

Table.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
