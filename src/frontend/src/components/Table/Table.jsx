import React from 'react';
import PropTypes from 'prop-types';
import styles from './Table.module.css';
import { TabElem } from './internal/TabElem/TabElem';
import { Diagnose } from './internal/Diagnose/Diagnose';
import { useResults } from '../../views/MainView/providers/Results';

export function Table({ children, className = '', ...rest }) {
  const { showResult } = useResults();
  const rootClassName = className ? `${styles.table} ${className}` : styles.table;

  return (
    <div className={rootClassName} {...rest}>
      <TabElem />
      <Diagnose onSubmit={showResult} />
      {children}
    </div>
  );
}

Table.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
