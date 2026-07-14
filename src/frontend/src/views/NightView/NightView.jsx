import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NightShopProvider, useNightShop } from './providers/NightShop';
import styles from './NightView.module.css';

const ITEM_TYPE_LABELS = {
  HANDBOOK: 'Handbook',
  EQUIPMENT: 'Equipment',
  EXAMINATION: 'Examination',
  PLOT_ITEM: 'Plot Item',
};

/**
 * @param {string} itemType
 * @returns {string}
 */
function itemTypeLabel(itemType) {
  return ITEM_TYPE_LABELS[itemType] ?? itemType;
}

/**
 * Renders the night/shop phase, backed entirely by `useNightShop()` (which in
 * turn is backed by RoundProvider's shopCatalog/purchaseShopItem). Consumed
 * inside `NightShopProvider` — see `index.js`.
 */
export function NightViewContent() {
  const navigate = useNavigate();
  const {
    items,
    money,
    isNightPhase,
    selectedIds,
    selectedTotal,
    remaining,
    isSelected,
    canToggle,
    toggleItem,
    buySelected,
    isBuying,
    errorMessage,
  } = useNightShop();

  // A stale arrival: something (e.g. a page refresh while sitting on this
  // screen) re-ran RoundProvider's mount effect, whose resolveOpenGameDayLog
  // auto-opens the next day whenever none is open — silently ending night
  // phase before the player bought anything. Without this, every purchase
  // would 409 with not_night_phase and look like buying silently does
  // nothing. isNightPhase is null until the catalog's first load resolves,
  // so this only fires once it's a definite false, not on initial mount.
  useEffect(() => {
    if (isNightPhase === false) {
      navigate('/game/main', { replace: true });
    }
  }, [isNightPhase, navigate]);

  const anySelected = selectedIds.size > 0;
  const nSelected = selectedIds.size;
  const selectionLabel =
    nSelected === 0 ? 'No items selected' : `${nSelected} ${nSelected === 1 ? 'item' : 'items'} selected`;

  function handleAction() {
    if (anySelected) {
      // Only leave the shop once every selected item was actually purchased —
      // a failed/partial buy (e.g. a stale not_night_phase 409) must leave the
      // player on this screen, where buyError is rendered, instead of silently
      // stranding them back on the day view with nothing bought.
      buySelected().then((succeeded) => {
        if (succeeded) navigate('/game/main');
      });
    } else {
      navigate('/game/main');
    }
  }

  let actionLabel;
  let actionDisabled;
  let actionHint;
  if (isBuying) {
    actionLabel = 'Buy';
    actionDisabled = true;
    actionHint = 'Processing purchase…';
  } else if (!anySelected) {
    actionLabel = 'Skip';
    actionDisabled = false;
    actionHint = 'End the shift without buying';
  } else if (remaining < 0) {
    actionLabel = 'Buy';
    actionDisabled = true;
    actionHint = `Insufficient funds — remove an item (over by $${-remaining})`;
  } else {
    actionLabel = `Buy · $${selectedTotal}`;
    actionDisabled = false;
    actionHint = `$${remaining} will remain`;
  }


  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.shiftChip}>
          <span className={styles.shiftChipIcon}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A89E96" strokeWidth="2" strokeLinecap="round">
              <path d="M12 3a6 6 0 0 0-6 6c0 4 6 9 6 9s6-5 6-9a6 6 0 0 0-6-6z" />
              <circle cx="12" cy="9" r="1.5" fill="#A89E96" stroke="none" />
            </svg>
          </span>
          End of shift
        </div>

        <div className={styles.titleBlock}>
          <h1 className={styles.title}>Shop for Items</h1>
          <p className={styles.subtitle}>Restock your practice before tomorrow&apos;s patients</p>
        </div>

        <div className={styles.balance}>
          <span className={styles.balanceLabel}>Balance</span>
          <span className={styles.balanceValue}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" fill="#A89E96" stroke="#8c8279" strokeWidth="1.5" />
              <text x="12" y="16" textAnchor="middle" fontFamily="IBM Plex Serif, serif" fontSize="11" fontWeight="600" fill="#212129">
                $
              </text>
            </svg>
            {money}
          </span>
        </div>
      </header>

      <main className={styles.catalog}>
        {items.map((item) => {
          const selected = isSelected(item.id);
          const disabledToggle = !item.owned && !canToggle(item);
          return (
            <div
              className={`${styles.card}${item.owned ? ` ${styles.cardOwned}` : ''}${selected ? ` ${styles.cardSelected}` : ''}`}
              key={item.id}
            >
              <div className={styles.cardCover} />

              <div className={styles.cardBody}>
                <div className={styles.cardHeading}>
                  <h2 className={styles.cardTitle}>{item.name}</h2>
                  <span className={styles.cardCategory}>{itemTypeLabel(item.itemType)}</span>
                </div>
                <p className={styles.cardFlavor}>{item.description}</p>
              </div>

              <div className={styles.cardTrailing}>
                <span className={styles.cardPrice}>
                  ${item.price}
                  {item.itemType === 'EXAMINATION' && typeof item.timeCostMs === 'number'
                    ? ` +${Math.round(item.timeCostMs / 1000)}s`
                    : null}
                </span>
                {item.owned ? (
                  <span className={styles.ownedBadge}>In library</span>
                ) : (
                  <button
                    type="button"
                    aria-label={`Select ${item.name}`}
                    aria-pressed={selected}
                    disabled={disabledToggle}
                    className={`${styles.selectDot}${selected ? ` ${styles.selectDotSelected}` : ''}`}
                    onClick={() => toggleItem(item)}
                  />
                )}
              </div>
            </div>
          );
        })}
      </main>

      <div className={styles.summary}>
        <span className={styles.summaryLabel}>{selectionLabel}</span>
        <span className={styles.total}>
          <span className={styles.totalLabel}>Cart total</span>
          <span className={styles.totalValue}>${selectedTotal}</span>
        </span>
      </div>

      <div className={styles.action}>
        <button type="button" className={styles.actionButton} disabled={actionDisabled} onClick={handleAction}>
          {actionLabel}
        </button>
        <span className={styles.actionHint}>
          {errorMessage ? `Something went wrong: ${errorMessage}` : actionHint}
        </span>
      </div>
    </div>
  );
}

export function NightView() {
  return (
    <NightShopProvider>
      <NightViewContent />
    </NightShopProvider>
  );
}
