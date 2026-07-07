import React from 'react';
import PropTypes from 'prop-types';
import styles from './Table.module.css';
import { TabElem } from './TabElemFol';

export function Table({ children, className = '', ...rest }) {
  const rootClassName = className ? `${styles.table} ${className}` : styles.table;

  return (
    <div className={rootClassName} {...rest}>
      <TabElem />
      {children}
    </div>
  );
}

Table.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
