import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import styles from './OverlayPortal.module.css';

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {() => void} [props.onDismiss] - called on Escape key, and on backdrop click unless dismissOnBackdropClick is false
 * @param {string} [props.overlayClassName] - extra class appended to the overlay layer, e.g. to make it transparent/non-blocking for a floating (non-modal) usage
 * @param {boolean} [props.dismissOnBackdropClick] - set to false for a non-modal, floating usage where clicking outside the content must not close it
 */
export function OverlayPortal({ children, onDismiss, overlayClassName = '', dismissOnBackdropClick = true }) {
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
  const layerClassName = overlayClassName ? `${styles.overlayLayer} ${overlayClassName}` : styles.overlayLayer;
  return createPortal(
    <div className={layerClassName} onClick={dismissOnBackdropClick ? onDismiss : undefined}>
      {children}
    </div>,
    target
  );
}

OverlayPortal.propTypes = {
  children: PropTypes.node.isRequired,
  onDismiss: PropTypes.func,
  overlayClassName: PropTypes.string,
  dismissOnBackdropClick: PropTypes.bool,
};
