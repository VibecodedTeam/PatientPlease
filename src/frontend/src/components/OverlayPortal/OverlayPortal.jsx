import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import styles from './OverlayPortal.module.css';

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {() => void} [props.onDismiss] - called on backdrop click or Escape key
 */
export function OverlayPortal({ children, onDismiss }) {
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onDismiss?.();
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onDismiss]);

  const target = document.getElementById('overlay-root');
  if (!target) {
    return null;
  }
  return createPortal(
    <div className={styles.overlayLayer} onClick={onDismiss}>
      {children}
    </div>,
    target
  );
}

OverlayPortal.propTypes = {
  children: PropTypes.node.isRequired,
  onDismiss: PropTypes.func,
};
