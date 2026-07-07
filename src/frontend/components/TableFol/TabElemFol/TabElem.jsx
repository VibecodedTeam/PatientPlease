import React from 'react';
import PropTypes from 'prop-types';
import './TabElem.module.css';
import { Information_1 } from './Information_1Fol/Information_1';

export function TabElem({ children, className = '', ...rest }) {
  const rootClassName = className ? `tabElem ${className}` : 'tabElem';

  return (
    <div className={rootClassName} {...rest}>
      <Information_1 />
      {children}
    </div>
  );
}

TabElem.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};