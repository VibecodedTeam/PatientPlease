import React, { useEffect, useState } from 'react';
import styles from './Wall.module.css';
import { OverlayPortal } from '../OverlayPortal';
import { MoleCheckBoard } from '../MoleCheckBoard';
import { Phone } from '../Phone';
import { ExaminationsProvider } from '../Phone/providers/Examinations';
import { WallInventoryProvider, useWallInventory } from './providers/WallInventory';

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
  const [lampOn, setLampOn] = useState(true);
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

  const toggleLamp = () => setLampOn((on) => !on);

  const toggleDermatoscope = () => setDermatoscopeOn((on) => !on);

  return (
    <section className={styles.wall} aria-label="Doctor office wall">
      <div className={styles.panel}>
        <div className={styles.header}>
          <button
            type="button"
            className={styles.settingsButton}
            aria-label="Open test orders"
            title="Order tests"
            onClick={openSettings}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" width="2.2rem" height="2.2rem" fill="#ffffff">
              <path d="M6.62 10.79a15.09 15.09 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24 11.36 11.36 0 0 0 3.57.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.4 21 3 13.6 3 4.5a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.24 1.02z" />
            </svg>
          </button>

          {/* Hardcoded ABCDE mole-check reference, pinned to the wall like a card.
              Collapsed it shows the five letters; clicking opens the draggable
              ABCDE panel. No props — it renders from its own default CRITERIA. */}
          <div className={styles.moleCheckBoardSlot}>
            <MoleCheckBoard />
          </div>
        </div>

        <div className={styles.shelf} aria-label="Medical handbooks shelf">
          {items.length === 0 ? (
            <div className={styles.emptyShelf}>
              <p>No handbooks bought yet.</p>
              <p>Visit the night shop to unlock medical handbooks.</p>
            </div>
          ) : (
            <>
              <span className={styles.shelfBookend} aria-hidden="true" />

              {items.map((item) => {
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
