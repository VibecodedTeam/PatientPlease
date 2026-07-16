import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { OverlayPortal } from '../OverlayPortal';
import { CRITERIA } from './internal/criteria';
import { LetterToggle } from './internal/LetterToggle/LetterToggle';
import { useDraggable } from './internal/useDraggable';
import styles from './MoleCheckBoard.module.css';

/**
 * Standalone ABCDE mole-check board. Collapsed, it shows only the five bold
 * letters; clicking it opens an enlarged dialog listing what each letter
 * means, with a slider switch per letter to mark that trait as present on
 * the lesion being examined. Selection state lives locally - callers that
 * need it elsewhere read it via `onSelectionChange`.
 * @param {object} props
 * @param {('A'|'B'|'C'|'D'|'E')[]} [props.initialSelected] - letters pre-checked on first render
 * @param {(selected: ('A'|'B'|'C'|'D'|'E')[]) => void} [props.onSelectionChange] - called with the full, A-E ordered list of currently marked letters after every toggle
 * @param {boolean} [props.initialExpanded]
 * @param {(expanded: boolean) => void} [props.onExpandedChange]
 * @param {{letter: string, label: string, description: string}[]} [props.criteria]
 * @param {string} [props.className]
 */
export function MoleCheckBoard({
  initialSelected = [],
  onSelectionChange,
  initialExpanded = false,
  onExpandedChange,
  criteria = CRITERIA,
  className = '',
  ...rest
}) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [selected, setSelected] = useState(() => new Set(initialSelected));
  const { position, dragHandleProps } = useDraggable();

  const outerClassName = className ? `${styles.wrapper} ${className}` : styles.wrapper;

  function openBoard() {
    setIsExpanded(true);
    onExpandedChange?.(true);
  }

  function closeBoard() {
    setIsExpanded(false);
    onExpandedChange?.(false);
  }

  function handleToggle(letter) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(letter)) {
        next.delete(letter);
      } else {
        next.add(letter);
      }
      onSelectionChange?.(criteria.filter((c) => next.has(c.letter)).map((c) => c.letter));
      return next;
    });
  }

  return (
    <div className={outerClassName} {...rest}>
      <button
        type="button"
        className={styles.board}
        aria-haspopup="dialog"
        aria-expanded={isExpanded}
        aria-label="Otwórz samobadanie znamion ABCDE"
        onClick={openBoard}
      >
        <span className={styles.frame}>
          <span className={styles.lettersRow}>
            {criteria.map((c) => (
              <span key={c.letter} className={styles.letter}>
                {c.letter}
              </span>
            ))}
          </span>
        </span>
      </button>

      {isExpanded && (
        // overlay-portal: the enlarged ABCDE board must render above the rest of the
        // page (so it can be dragged freely into any corner) but as a NON-blocking,
        // floating layer — the rest of the page stays visible and interactive, unlike
        // the modal overlays in MelanomaImagePopup/Wall.
        <OverlayPortal onDismiss={closeBoard} overlayClassName={styles.floatingLayer} dismissOnBackdropClick={false}>
          <div
            className={styles.expandedBoard}
            role="dialog"
            aria-label="Samobadanie znamion — reguła ABCDE"
            style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.dragHandle} onMouseDown={dragHandleProps.onMouseDown} data-testid="drag-handle">
              <span className={styles.dragGrip} aria-hidden="true" />
            </div>

            <button type="button" className={styles.closeButton} aria-label="Zamknij" onClick={closeBoard}>
              ×
            </button>

            <div className={styles.expandedLettersRow} aria-hidden="true">
              {criteria.map((c) => (
                <span key={c.letter} className={styles.expandedLetter}>
                  {c.letter}
                </span>
              ))}
            </div>

            <div className={styles.rows} role="list" aria-label="Kryteria ABCDE">
              {criteria.map((c, index) => (
                <LetterToggle
                  key={c.letter}
                  letter={c.letter}
                  label={c.label}
                  description={c.description}
                  isChecked={selected.has(c.letter)}
                  onToggle={() => handleToggle(c.letter)}
                  animationDelayMs={index * 70}
                />
              ))}
            </div>
          </div>
        </OverlayPortal>
      )}
    </div>
  );
}

MoleCheckBoard.propTypes = {
  initialSelected: PropTypes.arrayOf(PropTypes.oneOf(['A', 'B', 'C', 'D', 'E'])),
  onSelectionChange: PropTypes.func,
  initialExpanded: PropTypes.bool,
  onExpandedChange: PropTypes.func,
  criteria: PropTypes.arrayOf(
    PropTypes.shape({
      letter: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
    })
  ),
  className: PropTypes.string,
};
