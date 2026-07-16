import React from 'react';
import { useNavigate } from 'react-router-dom';
import { NightShopProvider, useNightShop } from './providers/NightShop';
import styles from './NightView.module.css';

const ITEM_TYPE_LABELS = {
  HANDBOOK: 'Podręcznik',
  EQUIPMENT: 'Sprzęt',
  EXAMINATION: 'Badanie',
  PLOT_ITEM: 'Przedmiot fabularny',
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

  const anySelected = selectedIds.size > 0;
  const nSelected = selectedIds.size;
  const selectionLabel =
    nSelected === 0 ? 'Nie wybrano przedmiotów' : `Wybrane przedmioty: ${nSelected}`;

  function handleAction() {
    if (anySelected) {
      buySelected().then(() => navigate('/game/main'));
    } else {
      navigate('/game/main');
    }
  }

  let actionLabel;
  let actionDisabled;
  let actionHint;
  if (isBuying) {
    actionLabel = 'Kup';
    actionDisabled = true;
    actionHint = 'Przetwarzanie zakupu…';
  } else if (!anySelected) {
    actionLabel = 'Pomiń';
    actionDisabled = false;
    actionHint = 'Zakończ zmianę bez zakupów';
  } else if (remaining < 0) {
    actionLabel = 'Kup';
    actionDisabled = true;
    actionHint = `Za mało środków — usuń przedmiot (brakuje $${-remaining})`;
  } else {
    actionLabel = `Kup · $${selectedTotal}`;
    actionDisabled = false;
    actionHint = `Pozostanie $${remaining}`;
  }

  const combinedError = buyError ?? error;

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
          Koniec zmiany
        </div>

        <div className={styles.titleBlock}>
          <h1 className={styles.title}>Zakupy</h1>
          <p className={styles.subtitle}>Zaopatrz gabinet przed jutrzejszymi pacjentami</p>
        </div>

        <div className={styles.balance}>
          <span className={styles.balanceLabel}>Saldo</span>
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
                  <span className={styles.ownedBadge}>W bibliotece</span>
                ) : (
                  <button
                    type="button"
                    aria-label={`Wybierz ${item.name}`}
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
          <span className={styles.totalLabel}>Suma koszyka</span>
          <span className={styles.totalValue}>${selectedTotal}</span>
        </span>
      </div>

      <div className={styles.action}>
        <button type="button" className={styles.actionButton} disabled={actionDisabled} onClick={handleAction}>
          {actionLabel}
        </button>
        <span className={styles.actionHint}>
          {combinedError ? `Coś poszło nie tak: ${combinedError.message ?? 'spróbuj ponownie'}` : actionHint}
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
