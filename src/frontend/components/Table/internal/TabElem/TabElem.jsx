import React from 'react';
import PropTypes from 'prop-types';
import styles from './TabElem.module.css';
import { Information_1 } from './internal/Information_1/Information_1';
import { Information_2 } from './internal/Information_2/Information_2';
import { Information_3 } from './internal/Information_3/Information_3';

export function TabElem({ children, className = '', ...rest }) {
  const rootClassName = className ? `${styles.tabElem} ${className}` : styles.tabElem;

  return (
    <div className={rootClassName} {...rest}>
      <Information_1 />
      <Information_2 />
      <Information_3 />
      {children}
    </div>
  );
}

TabElem.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
