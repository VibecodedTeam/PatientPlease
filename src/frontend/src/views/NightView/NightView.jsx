import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './NightView.module.css';

const CATALOG = [
  {
    id: 'h1',
    title: 'Atlas of Dermoscopy',
    category: 'Handbook',
    price: 45,
    flavor: 'High-resolution reference for reading pigment networks and vascular patterns under magnification.',
  },
  {
    id: 'h2',
    title: 'Clinical Guide to Skin Cancer',
    category: 'Handbook',
    price: 60,
    flavor: 'ABCDE criteria, staging tables, and differential diagnosis, worked chapter by chapter.',
  },
  {
    id: 'h3',
    title: 'Sun & Skin: UV Exposure Manual',
    category: 'Handbook',
    price: 80,
    flavor: 'Cumulative-dose charts and phototype risk tables for reading patient sun-history records.',
  },
];

const STARTING_FUNDS = 120;

export function NightView() {
  const navigate = useNavigate();
  const [funds, setFunds] = useState(STARTING_FUNDS);
  const [ownedIds, setOwnedIds] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  function toggle(id) {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  const total = CATALOG.filter((item) => selectedIds.includes(item.id)).reduce((sum, item) => sum + item.price, 0);
  const anySelected = selectedIds.length > 0;
  const canAfford = total <= funds;

  function buy() {
    if (!anySelected || !canAfford) return;
    setFunds((f) => f - total);
    setOwnedIds((ids) => [...ids, ...selectedIds]);
    setSelectedIds([]);
    navigate('/game/main');
  }

  function skip() {
    navigate('/game/main');
  }

  let actionLabel;
  let actionDisabled;
  let actionHint;
  if (!anySelected) {
    actionLabel = 'Skip';
    actionDisabled = false;
    actionHint = 'End the shift without buying';
  } else if (!canAfford) {
    actionLabel = 'Buy';
    actionDisabled = true;
    actionHint = `Insufficient funds — remove an item (over by $${total - funds})`;
  } else {
    actionLabel = `Buy · $${total}`;
    actionDisabled = false;
    actionHint = `$${funds - total} will remain`;
  }

  const nSelected = selectedIds.length;
  const selectionLabel =
    nSelected === 0 ? 'No items selected' : `${nSelected} ${nSelected === 1 ? 'item' : 'items'} selected`;

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
            {funds}
          </span>
        </div>
      </header>

      <main className={styles.catalog}>
        {CATALOG.map((item) => {
          const owned = ownedIds.includes(item.id);
          const selected = selectedIds.includes(item.id);
          return (
            <div className={`${styles.card}${owned ? ` ${styles.cardOwned}` : ''}${selected ? ` ${styles.cardSelected}` : ''}`} key={item.id}>
              <div className={styles.cardCover} />

              <div className={styles.cardBody}>
                <div className={styles.cardHeading}>
                  <h2 className={styles.cardTitle}>{item.title}</h2>
                  <span className={styles.cardCategory}>{item.category}</span>
                </div>
                <p className={styles.cardFlavor}>{item.flavor}</p>
              </div>

              <div className={styles.cardTrailing}>
                <span className={styles.cardPrice}>${item.price}</span>
                {owned ? (
                  <span className={styles.ownedBadge}>In library</span>
                ) : (
                  <button
                    type="button"
                    aria-label={`Select ${item.title}`}
                    aria-pressed={selected}
                    className={`${styles.selectDot}${selected ? ` ${styles.selectDotSelected}` : ''}`}
                    onClick={() => toggle(item.id)}
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
          <span className={styles.totalValue}>${total}</span>
        </span>
      </div>

      <div className={styles.action}>
        <button
          type="button"
          className={styles.actionButton}
          disabled={actionDisabled}
          onClick={anySelected ? buy : skip}
        >
          {actionLabel}
        </button>
        <span className={styles.actionHint}>{actionHint}</span>
      </div>
    </div>
  );
}
