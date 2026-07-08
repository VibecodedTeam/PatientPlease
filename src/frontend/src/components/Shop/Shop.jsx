import React, { useState } from 'react';
import PropTypes from 'prop-types';
import styles from './Shop.module.css';

const SAMPLE_ITEMS = [
  {
    id: 'shop-item-uuid-1',
    sku: 'EQ-UVMETER-01',
    name: 'UV Exposure Meter',
    itemType: 'EQUIPMENT',
    price: 200,
    unlockDay: 2,
    iconImageUrl: '/assets/shop/uv_meter.png',
    affordable: true,
  },
  {
    id: 'shop-item-uuid-2',
    sku: 'HB-DERM-01',
    name: 'Dermatology Handbook',
    itemType: 'HANDBOOK',
    price: 400,
    unlockDay: 1,
    iconImageUrl: '/assets/shop/handbook.png',
    affordable: true,
  },
  {
    id: 'shop-item-uuid-3',
    sku: 'EQ-DERMASCOPE-01',
    name: 'Dermatoscope',
    itemType: 'EQUIPMENT',
    price: 600,
    unlockDay: 3,
    iconImageUrl: '/assets/shop/dermatoscope.png',
    affordable: false,
  },
];

/**
 * @param {{ items?: Array<{id: string, name: string, price: number, iconImageUrl: string, affordable: boolean}> }} props
 */
export function Shop({ items = SAMPLE_ITEMS }) {
  const [selectedIds, setSelectedIds] = useState(new Set());

  function toggleItem(item) {
    if (!item.affordable) return;
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }
      return next;
    });
  }

  function handleBuy() {
    console.log(Array.from(selectedIds));
  }

  return (
    <div className={styles.shop}>
      <div className={styles.list}>
        {items.map((item) => {
          const isSelected = selectedIds.has(item.id);
          return (
            <div
              key={item.id}
              className={`${styles.item} ${!item.affordable ? styles.itemUnaffordable : ''}`}
            >
              <img className={styles.icon} src={item.iconImageUrl} alt="" />
              <div className={styles.details}>
                <span className={styles.name}>{item.name}</span>
                <span className={styles.price}>${item.price}</span>
              </div>
              <button
                type="button"
                aria-label={`Select ${item.name}`}
                className={`${styles.toggle} ${isSelected ? styles.toggleSelected : ''}`}
                disabled={!item.affordable}
                onClick={() => toggleItem(item)}
              />
            </div>
          );
        })}
      </div>
      <div className={styles.footer}>
        <button
          type="button"
          className={styles.buyButton}
          disabled={selectedIds.size === 0}
          onClick={handleBuy}
        >
          Buy
        </button>
      </div>
    </div>
  );
}

Shop.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      sku: PropTypes.string,
      name: PropTypes.string.isRequired,
      itemType: PropTypes.string,
      price: PropTypes.number.isRequired,
      unlockDay: PropTypes.number,
      iconImageUrl: PropTypes.string,
      affordable: PropTypes.bool,
    })
  ),
};
