import React from 'react';
import PropTypes from 'prop-types';
import styles from './Table.module.css';
import { TabElem } from './internal/TabElem/TabElem';
import { Diagnose } from './internal/Diagnose/Diagnose';

export function Table({ children, className = '', ...rest }) {
  const rootClassName = className ? `${styles.table} ${className}` : styles.table;
  
  return (
    <div className={rootClassName} {...rest}>
      <TabElem />
      <Diagnose />
      {children}
    </div>
  );
}

Table.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
