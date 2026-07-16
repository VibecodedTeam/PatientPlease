import React, { createContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useRound } from '../../../../providers/Round';

export const WallInventoryContext = createContext(null);

/** Human-readable label for the office-wall categories the wall renders. */
const CATEGORY_LABELS = {
  HANDBOOK: 'Podręcznik',
  EQUIPMENT: 'Sprzęt',
};

/**
 * Narrows RoundProvider's `ownedItems` down to what the office wall renders:
 * the player's owned handbooks and equipment (bought at night), excluding
 * examinations and plot items. Leaf components consume this provider, not
 * useRound() directly, so nothing downstream is coupled to Round's full
 * OwnedItemRecord shape.
 */
export function WallInventoryProvider({ children }) {
  const { round, isLoading } = useRound();

  const items = useMemo(
    () =>
      (round?.ownedItems ?? [])
        .filter((ownedItem) => CATEGORY_LABELS[ownedItem.shopItem.itemType] !== undefined)
        .map((ownedItem) => ({
          id: ownedItem.shopItem.id,
          title: ownedItem.shopItem.name,
          category: CATEGORY_LABELS[ownedItem.shopItem.itemType],
          description: ownedItem.shopItem.description,
        })),
    [round],
  );

  const value = useMemo(() => ({ items, isLoading }), [items, isLoading]);

  return <WallInventoryContext.Provider value={value}>{children}</WallInventoryContext.Provider>;
}

WallInventoryProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
