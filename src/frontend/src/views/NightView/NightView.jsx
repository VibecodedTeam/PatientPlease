import React from 'react';
import styles from './NightView.module.css';
import { NightShopProvider, useNightShop } from './providers/NightShop';

const ITEM_TYPE_LABELS = {
  HANDBOOK: 'Handbook',
  EQUIPMENT: 'Equipment',
  PLOT_ITEM: 'Plot Item',
};

function itemTypeLabel(itemType) {
  return ITEM_TYPE_LABELS[itemType] ?? itemType;
}

function selectionLabel(count) {
  if (count === 0) return 'No items selected';
  if (count === 1) return '1 item selected';
  return `${count} items selected`;
}

function NightShopScreen() {
  const {
    items,
    money,
    isLoading,
    error,
    selectedIds,
    selectedTotal,
    remaining,
    isSelected,
    canToggle,
    toggleItem,
    buySelected,
    isBuying,
    buyError,
  } = useNightShop();

  const selectedCount = selectedIds.size;

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
        {isLoading && <p className={styles.stateMessage}>Loading the shop…</p>}
        {!isLoading && error && (
          <p className={styles.stateMessage}>Couldn&apos;t load the shop. Try again.</p>
        )}
        {!isLoading && !error && items.length === 0 && (
          <p className={styles.stateMessage}>Nothing in stock right now.</p>
        )}
        {!isLoading &&
          !error &&
          items.map((item) => {
            const selected = isSelected(item.id);
            return (
              <div className={styles.card} key={item.id}>
                <div className={styles.cardCover} />

                <div className={styles.cardBody}>
                  <div className={styles.cardHeading}>
                    <h2 className={styles.cardTitle}>{item.name}</h2>
                    <span className={styles.cardCategory}>{itemTypeLabel(item.itemType)}</span>
                  </div>
                  <p className={styles.cardFlavor}>{item.description}</p>
                </div>

                <div className={styles.cardTrailing}>
                  <span className={styles.cardPrice}>${item.price}</span>
                  <button
                    type="button"
                    aria-label={item.owned ? `${item.name} owned` : `Select ${item.name}`}
                    className={`${styles.selectDot}${selected ? ` ${styles.selectDotSelected}` : ''}`}
                    aria-pressed={selected}
                    disabled={!canToggle(item)}
                    onClick={() => toggleItem(item)}
                  />
                </div>
              </div>
            );
          })}
      </main>

      <div className={styles.summary}>
        <span className={styles.summaryLabel}>{selectionLabel(selectedCount)}</span>
        <span className={styles.total}>
          <span className={styles.totalLabel}>Cart total</span>
          <span className={styles.totalValue}>${selectedTotal}</span>
        </span>
      </div>

      <div className={styles.action}>
        <button
          type="button"
          className={styles.actionButton}
          disabled={selectedCount === 0 || isBuying}
          onClick={() => buySelected()}
        >
          {isBuying ? 'Buying…' : 'Buy'}
        </button>
        <span className={styles.actionHint}>
          {buyError ? 'Purchase failed — try again' : `Remaining balance $${remaining}`}
        </span>
      </div>
    </div>
  );
}

export function NightView() {
  return (
    <NightShopProvider>
      <NightShopScreen />
    </NightShopProvider>
  );
}
