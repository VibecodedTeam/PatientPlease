import React from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import styles from './OverlayPortal.module.css';

export function OverlayPortal({ children }) {
  const target = document.getElementById('overlay-root');
  if (!target) {
    return null;
  }
  return createPortal(<div className={styles.overlayLayer}>{children}</div>, target);
}

OverlayPortal.propTypes = {
  children: PropTypes.node.isRequired,
};
