import React from 'react';
import PropTypes from 'prop-types';
import styles from './TabElem.module.css';
import { Information_1 } from './internal/Information_1/Information_1';
import { Notebook } from '../../../Notebook';

export function TabElem({ children, className = '', ...rest }) {
  const rootClassName = className ? `${styles.tabElem} ${className}` : styles.tabElem;

  return (
    <div className={rootClassName} {...rest}>
      <Information_1 />
      <Notebook />
      {children}
    </div>
  );
}

TabElem.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
