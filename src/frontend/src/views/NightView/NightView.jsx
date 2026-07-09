import React from 'react';
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
            {STARTING_FUNDS}
          </span>
        </div>
      </header>

      <main className={styles.catalog}>
        {CATALOG.map((item) => (
          <div className={styles.card} key={item.id}>
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
              <span className={styles.selectDot} aria-hidden="true" />
            </div>
          </div>
        ))}
      </main>

      <div className={styles.summary}>
        <span className={styles.summaryLabel}>No items selected</span>
        <span className={styles.total}>
          <span className={styles.totalLabel}>Cart total</span>
          <span className={styles.totalValue}>$0</span>
        </span>
      </div>

      <div className={styles.action}>
        <button type="button" className={styles.actionButton} disabled>
          Skip
        </button>
        <span className={styles.actionHint}>End the shift without buying</span>
      </div>
    </div>
  );
}
