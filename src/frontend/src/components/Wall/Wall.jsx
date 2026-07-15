import React, { useEffect, useRef, useState } from 'react';
import styles from './Wall.module.css';
import { OverlayPortal } from '../OverlayPortal';
import { MoleCheckBoard } from '../MoleCheckBoard';
import { Phone } from '../Phone';
import { ExaminationsProvider } from '../Phone/providers/Examinations';
import { WallInventoryProvider, useWallInventory } from './providers/WallInventory';

const PREVENTION_TIPS = [
  'SPF daily',
  'Reapply SPF',
  'No tanning',
  'Avoid noon sun',
  'Cover skin',
  'Check moles',
  'Watch ABCDE',
  'See derm',
];

const BOARD_COLUMNS = 3;
const BOARD_ROWS = 2;
const BOARD_SLOTS = BOARD_COLUMNS * BOARD_ROWS;
const MAX_PINNED_NOTES = 6;

const randomBetween = (min, max) => Math.random() * (max - min) + min;

const withModifierClass = (baseClass, modifierClass, active) =>
  active ? `${baseClass} ${modifierClass}` : baseClass;

/**
 * Doctor office wall content: a shelf of the player's real owned handbooks and
 * equipment, sourced from useWallInventory() (which narrows RoundProvider's
 * ownedItems down to HANDBOOK/EQUIPMENT), plus the "order tests" button that
 * opens the Phone. Exported separately from the composed `Wall` (see index.js,
 * which wraps this in WallInventoryProvider) so the provider boundary sits
 * outside the presentational content.
 */
export function WallContent() {
  const { items } = useWallInventory();

  const [selectedItemId, setSelectedItemId] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [pinnedNotes, setPinnedNotes] = useState([]);
  const [nextTipIndex, setNextTipIndex] = useState(0);
  const nextNoteIdRef = useRef(0);
  const [lampOn, setLampOn] = useState(false);
  const [dermatoscopeOn, setDermatoscopeOn] = useState(false);

  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;

  useEffect(() => {
    setSelectedItemId((currentId) => {
      if (currentId === null) return null;
      const isCurrentStillOwned = items.some((item) => item.id === currentId);
      return isCurrentStillOwned ? currentId : null;
    });
  }, [items]);

  const openSettings = () => {
    setSelectedItemId(null);
    setIsSettingsOpen(true);
  };

  const closeSettings = () => setIsSettingsOpen(false);

  const selectItem = (itemId) => {
    setIsSettingsOpen(false);
    setSelectedItemId(itemId);
  };

  const closeItemPopup = () => setSelectedItemId(null);

  const pinNewNote = () => {
    const noteId = nextNoteIdRef.current;
    nextNoteIdRef.current += 1;
    const text = PREVENTION_TIPS[nextTipIndex];
    const jitter = {
      offsetX: randomBetween(-6, 6),
      offsetY: randomBetween(-5, 5),
      rotate: randomBetween(-7, 7),
    };

    setPinnedNotes((notes) => {
      const remaining = notes.length >= MAX_PINNED_NOTES ? notes.slice(1) : notes;
      const occupiedSlots = remaining.map((note) => note.slot);
      const availableSlots = Array.from({ length: BOARD_SLOTS }, (_, index) => index).filter(
        (slot) => !occupiedSlots.includes(slot),
      );
      const slot = availableSlots[Math.floor(Math.random() * availableSlots.length)];
      return [...remaining, { id: noteId, text, slot, ...jitter }];
    });
    setNextTipIndex((index) => (index + 1) % PREVENTION_TIPS.length);
  };

  const handleBoardKeyDown = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    pinNewNote();
  };

  const toggleLamp = () => setLampOn((on) => !on);

  const toggleDermatoscope = () => setDermatoscopeOn((on) => !on);

  return (
    <section className={styles.wall} aria-label="Doctor office wall">
      <div className={styles.panel}>
        <div className={styles.header}>
          <div
            className={styles.corkboard}
            role="button"
            tabIndex={0}
            aria-label="Pin new prevention note"
            title="Click to pin a new prevention note"
            onClick={pinNewNote}
            onKeyDown={handleBoardKeyDown}
          >
            <div className={styles.corkboardNotes} role="list" aria-label="Pinned prevention notes" aria-live="polite">
              {pinnedNotes.map((note) => (
                <div
                  key={note.id}
                  role="listitem"
                  className={styles.corkboardNote}
                  style={{
                    gridColumn: (note.slot % BOARD_COLUMNS) + 1,
                    gridRow: Math.floor(note.slot / BOARD_COLUMNS) + 1,
                    '--note-rotate': `${note.rotate}deg`,
                    '--note-offset-x': `${note.offsetX}px`,
                    '--note-offset-y': `${note.offsetY}px`,
                  }}
                >
                  <span className={styles.corkboardPin} aria-hidden="true" />
                  {note.text}
                </div>
              ))}
            </div>
          </div>

          {/* Hardcoded ABCDE mole-check reference, pinned to the wall like a card.
              Collapsed it shows the five letters; clicking opens the draggable
              ABCDE panel. No props — it renders from its own default CRITERIA. */}
          <div className={styles.moleCheckBoardSlot}>
            <MoleCheckBoard />
          </div>

          <button
            type="button"
            className={styles.settingsButton}
            aria-label="Open test orders"
            title="Order tests"
            onClick={openSettings}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" width="1.76rem" height="1.76rem" fill="#ffffff">
              <path d="M6.62 10.79a15.09 15.09 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24 11.36 11.36 0 0 0 3.57.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.4 21 3 13.6 3 4.5a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.24 1.02z" />
            </svg>
          </button>
        </div>

        <div className={styles.shelf} aria-label="Medical handbooks shelf">
          <span className={styles.shelfBookend} aria-hidden="true" />

          {items.length === 0 ? (
            <div className={styles.emptyShelf}>
              <p>No handbooks bought yet.</p>
              <p>Visit the night shop to unlock medical handbooks.</p>
            </div>
          ) : (
            items.map((item) => {
              const isSelected = item.id === selectedItemId;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={withModifierClass(styles.book, styles.bookSelected, isSelected)}
                  aria-pressed={isSelected}
                  title={`${item.title} — ${item.category}`}
                  onClick={() => selectItem(item.id)}
                >
                  {item.title}
                </button>
              );
            })
          )}

          <button
            type="button"
            className={withModifierClass(styles.shelfDermatoscope, styles.shelfDermatoscopeOn, dermatoscopeOn)}
            aria-label="Toggle dermatoscope"
            aria-pressed={dermatoscopeOn}
            title="Toggle dermatoscope"
            onClick={toggleDermatoscope}
          >
            <span className={styles.dermatoscopeLens} aria-hidden="true">
              <span className={styles.dermatoscopeGlint} aria-hidden="true" />
            </span>
            <span className={styles.dermatoscopeHandle} aria-hidden="true" />
            {dermatoscopeOn && <span className={styles.dermatoscopeLabel}>Dermatoscope ready</span>}
          </button>

          <span className={styles.shelfStamp} aria-hidden="true">
            Reviewed
          </span>

          <button
            type="button"
            className={withModifierClass(styles.shelfLamp, styles.shelfLampOn, lampOn)}
            aria-label="Toggle desk lamp"
            aria-pressed={lampOn}
            title="Toggle desk lamp"
            onClick={toggleLamp}
          >
            <span className={styles.lampShade} aria-hidden="true" />
            <span className={styles.lampJoint} aria-hidden="true" />
            <span className={styles.lampArmUpper} aria-hidden="true" />
            <span className={styles.lampJoint} aria-hidden="true" />
            <span className={styles.lampArmLower} aria-hidden="true" />
            <span className={styles.lampBase} aria-hidden="true" />
          </button>
        </div>
      </div>

      {selectedItem && (
        // overlay-portal: item details must appear as a centered modal above the whole
        // page, not clipped inside the compact wall panel
        <OverlayPortal onDismiss={closeItemPopup}>
          <div
            className={styles.bookPopup}
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedItem.title} details`}
            onClick={(event) => event.stopPropagation()}
          >
            <p className={styles.detailsLabel}>Selected handbook</p>
            <h3 className={styles.detailsTitle}>{selectedItem.title}</h3>
            <p className={styles.detailsCategory}>{selectedItem.category}</p>
            <p className={styles.detailsDescription}>{selectedItem.description}</p>
            <button type="button" className={styles.closeButton} onClick={closeItemPopup}>
              Close
            </button>
          </div>
        </OverlayPortal>
      )}

      {isSettingsOpen && (
        // overlay-portal: the order-tests popup must appear as a centered modal above the
        // whole page, not clipped inside the compact wall panel
        <OverlayPortal onDismiss={closeSettings}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Order tests"
            onClick={(event) => event.stopPropagation()}
          >
            <ExaminationsProvider>
              <Phone onCancel={closeSettings} />
            </ExaminationsProvider>
          </div>
        </OverlayPortal>
      )}
    </section>
  );
}

/**
 * The doctor office wall: WallContent composed with the WallInventoryProvider
 * domain that sources the shelf items from RoundProvider's ownedItems. This is
 * the only export the barrel (index.js) re-exports — WallContent itself stays
 * internal to this folder.
 */
export function Wall() {
  return (
    <WallInventoryProvider>
      <WallContent />
    </WallInventoryProvider>
  );
}
