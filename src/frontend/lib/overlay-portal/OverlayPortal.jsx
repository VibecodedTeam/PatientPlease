import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import styles from './OverlayPortal.module.css';

/**
 * The one shared mechanism allowed to render content detached from normal document
 * flow (see CLAUDE.md Section 7 — the only file permitted to declare position: fixed
 * for layering above the page). Renders a full-viewport dimmed backdrop via a portal
 * into document.body, centering whatever is passed as children above everything else.
 *
 * Any feature needing a modal/popup that must escape a clipping or size-constrained
 * ancestor should use this instead of declaring its own position: fixed/absolute.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {() => void} props.onDismiss - called on backdrop click or Escape
 */
export function OverlayPortal({ children, onDismiss }) {
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onDismiss?.();
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onDismiss]);

  return createPortal(
    <div className={styles.overlay} onClick={onDismiss}>
      {children}
    </div>,
    document.body
  );
}

OverlayPortal.propTypes = {
  children: PropTypes.node.isRequired,
  onDismiss: PropTypes.func,
};
