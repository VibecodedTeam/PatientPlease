import React from 'react';
import PropTypes from 'prop-types';
import styles from './TabElem.module.css';
import { Information_1 } from './internal/Information_1/Information_1';
import { Book } from './internal/Book/Book';

export function TabElem({ children, className = '', ...rest }) {
  const rootClassName = className ? `${styles.tabElem} ${className}` : styles.tabElem;

  return (
    <div className={rootClassName} {...rest}>
      <Information_1 />
      <Book />
      {children}
    </div>
  );
}

TabElem.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
