import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import styles from './Wall.module.css';
import { mockBooks } from './mockBooks';
import { OverlayPortal } from '../OverlayPortal';

const PATIENTS_LEFT_TODAY = 5;

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
 * Shape of a single book entry, shared so future integrations (JSON payload, shop, API
 * response) can validate their data against the same contract Wall expects.
 */
export const bookShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  category: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  hint: PropTypes.string.isRequired,
  bought: PropTypes.bool.isRequired,
});

/**
 * @param {Object} props
 * @param {Array<{id: string, title: string, category: string, description: string, hint: string, bought: boolean}>} [props.books]
 *   Book data to render. Falls back to mockBooks when not provided — later this will come from
 *   the player's purchased inventory once the night shop exists.
 */
export function Wall({ books }) {
  const bookList = books ?? mockBooks;

  const [selectedBookId, setSelectedBookId] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [pinnedNotes, setPinnedNotes] = useState([{ id: 0, text: PREVENTION_TIPS[0], slot: 0, offsetX: 0, offsetY: 0, rotate: -2 }]);
  const [nextTipIndex, setNextTipIndex] = useState(1);
  const nextNoteIdRef = useRef(1);
  const [musicVolume, setMusicVolume] = useState(50);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lampOn, setLampOn] = useState(false);
  const [dermatoscopeOn, setDermatoscopeOn] = useState(false);

  const boughtBooks = bookList.filter((book) => book.bought);
  const selectedBook = boughtBooks.find((book) => book.id === selectedBookId) ?? null;

  useEffect(() => {
    setSelectedBookId((currentId) => {
      if (currentId === null) return null;
      const isCurrentStillBought = bookList.some((book) => book.id === currentId && book.bought);
      return isCurrentStillBought ? currentId : null;
    });
  }, [bookList]);

  const openSettings = () => {
    setSelectedBookId(null);
    setIsSettingsOpen(true);
  };

  const closeSettings = () => setIsSettingsOpen(false);

  const selectBook = (bookId) => {
    setIsSettingsOpen(false);
    setSelectedBookId(bookId);
  };

  const closeBookPopup = () => setSelectedBookId(null);

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
        (slot) => !occupiedSlots.includes(slot)
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
          <div className={styles.board} role="note">
            <p className={styles.boardText}>Patients left today: {PATIENTS_LEFT_TODAY}</p>
          </div>

          <button
            type="button"
            className={styles.settingsButton}
            aria-label="Open settings"
            title="Settings"
            onClick={openSettings}
          >
            <span aria-hidden="true">⚙</span>
          </button>
        </div>

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

        <div className={styles.shelf} aria-label="Medical handbooks shelf">
          {boughtBooks.length === 0 ? (
            <div className={styles.emptyShelf}>
              <p>No handbooks bought yet.</p>
              <p>Visit the night shop to unlock medical handbooks.</p>
            </div>
          ) : (
            <>
              <span className={styles.shelfBookend} aria-hidden="true" />

              {boughtBooks.map((book) => {
                const isSelected = book.id === selectedBookId;
                return (
                  <button
                    key={book.id}
                    type="button"
                    className={withModifierClass(styles.book, styles.bookSelected, isSelected)}
                    aria-pressed={isSelected}
                    title={`${book.title} — ${book.category}`}
                    onClick={() => selectBook(book.id)}
                  >
                    {book.title}
                  </button>
                );
              })}

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
            </>
          )}
        </div>
      </div>

      {selectedBook && (
        // overlay-portal: book details must appear as a centered modal above the whole
        // page, not clipped inside the compact wall panel
        <OverlayPortal onDismiss={closeBookPopup}>
          <div
            className={styles.bookPopup}
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedBook.title} details`}
            onClick={(event) => event.stopPropagation()}
          >
            <p className={styles.detailsLabel}>Selected handbook</p>
            <h3 className={styles.detailsTitle}>{selectedBook.title}</h3>
            <p className={styles.detailsCategory}>{selectedBook.category}</p>
            <p className={styles.detailsDescription}>{selectedBook.description}</p>
            <p className={styles.detailsLabel}>Medical hint</p>
            <p className={styles.detailsHint}>{selectedBook.hint}</p>
            <button type="button" className={styles.closeButton} onClick={closeBookPopup}>
              Close
            </button>
          </div>
        </OverlayPortal>
      )}

      {isSettingsOpen && (
        // overlay-portal: settings must appear as a centered modal above the whole page,
        // not clipped inside the compact wall panel
        <OverlayPortal onDismiss={closeSettings}>
          <div
            className={styles.settingsPopup}
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className={styles.settingsTitle}>Settings</h3>

            <label className={styles.settingsField}>
              Music volume
              <input
                type="range"
                min="0"
                max="100"
                value={musicVolume}
                onChange={(event) => setMusicVolume(Number(event.target.value))}
              />
            </label>

            <label className={styles.settingsField}>
              <input
                type="checkbox"
                checked={soundEffectsEnabled}
                onChange={(event) => setSoundEffectsEnabled(event.target.checked)}
              />
              Sound effects
            </label>

            <label className={styles.settingsField}>
              <input
                type="checkbox"
                checked={isFullscreen}
                onChange={(event) => setIsFullscreen(event.target.checked)}
              />
              Fullscreen
            </label>

            <div className={styles.logoutField}>
              <button type="button" className={styles.logoutButton} disabled title="Not implemented yet">
                Log out
              </button>
              <span className={styles.comingSoonLabel}>Coming soon</span>
            </div>

            <button type="button" className={styles.closeButton} onClick={closeSettings}>
              Close
            </button>
          </div>
        </OverlayPortal>
      )}
    </section>
  );
}

Wall.propTypes = {
  books: PropTypes.arrayOf(bookShape),
};
