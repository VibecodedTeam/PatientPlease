import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useRound } from '../../../../providers/Round';

export const NightShopContext = createContext(null);

/** Human-readable copy for the backend's known /api/v1/shop* error codes (see
 * docs/api — purchaseItem/getShopCatalog). Axios's own err.message is just
 * "Request failed with status code 409", which tells the player nothing
 * about what actually went wrong or how to fix it. */
const SHOP_ERROR_MESSAGES = {
  not_night_phase: "It's not night yet — come back once the day ends.",
  insufficient_funds: "You don't have enough money for this purchase.",
  item_locked: "This item isn't unlocked yet.",
  item_already_owned: 'You already own this item.',
  item_not_found: 'This item is no longer available.',
  no_active_game: 'No active game session — try restarting.',
};

/**
 * @param {*} err - The rejected value from the API client (an axios error), or null.
 * @returns {string | null} A human-readable message, or null if there's no error.
 */
function describeShopError(err) {
  if (!err) return null;
  return SHOP_ERROR_MESSAGES[err.response?.data?.error] ?? err.message ?? 'please try again';
}

/**
 * Owns the night-shop domain's UI-selection state: a budget-aware cart built
 * on top of RoundProvider's shopCatalog/loadShopCatalog/purchaseShopItem
 * (the only place that talks to GET/POST /api/v1/shop*).
 *
 * Budget invariants: an item can only be selected while its price fits in the
 * remaining balance, so `selectedTotal` never exceeds `money` and `remaining`
 * never goes negative. The backend independently rejects `insufficient_funds`.
 */
export function NightShopProvider({ children }) {
  const { shopCatalog, isShopLoading, shopError, loadShopCatalog, purchaseShopItem } = useRound();
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [isBuying, setIsBuying] = useState(false);
  const [buyError, setBuyError] = useState(null);

  useEffect(() => {
    loadShopCatalog();
  }, [loadShopCatalog]);

  const items = useMemo(() => shopCatalog?.items ?? [], [shopCatalog]);
  const money = shopCatalog?.money ?? 0;

  const selectedTotal = useMemo(
    () =>
      items
        .filter((item) => selectedIds.has(item.id))
        .reduce((sum, item) => sum + item.price, 0),
    [items, selectedIds],
  );
  const remaining = money - selectedTotal;

  const isSelected = useCallback((id) => selectedIds.has(id), [selectedIds]);

  const canToggle = useCallback(
    (item) => !item.owned && (selectedIds.has(item.id) || item.price <= remaining),
    [selectedIds, remaining],
  );

  const toggleItem = useCallback(
    (item) => {
      if (!canToggle(item)) return;
      setSelectedIds((previous) => {
        const next = new Set(previous);
        if (next.has(item.id)) {
          next.delete(item.id);
        } else {
          next.add(item.id);
        }
        return next;
      });
    },
    [canToggle],
  );

  // Returns whether every selected item was actually purchased — callers
  // (NightView's Buy button) must only leave the shop once this is true, or a
  // failed/partial purchase would silently strand the player back on the day
  // view with nothing actually bought and no visible error.
  const buySelected = useCallback(async () => {
    if (selectedIds.size === 0) return true;
    setIsBuying(true);
    setBuyError(null);
    try {
      for (const shopItemId of selectedIds) {
        // Sequential: the backend debits money per purchase, so ordering matters.
        // eslint-disable-next-line no-await-in-loop
        await purchaseShopItem(shopItemId);
      }
      setSelectedIds(new Set());
      await loadShopCatalog();
      return true;
    } catch (err) {
      setBuyError(err);
      // Resync from the server so money/owned reflect any partial success, then
      // drop from the selection any item that is now owned or no longer present
      // — otherwise already-purchased items stay "selected", double-counting the
      // cart total and getting re-POSTed (item_already_owned) on the next Buy.
      const latest = await loadShopCatalog();
      if (latest) {
        const selectable = new Set(
          (latest.items ?? []).filter((item) => !item.owned).map((item) => item.id),
        );
        setSelectedIds((previous) => new Set([...previous].filter((id) => selectable.has(id))));
      }
      return false;
    } finally {
      setIsBuying(false);
    }
  }, [selectedIds, purchaseShopItem, loadShopCatalog]);

  // buyError takes priority: it's the most recent thing the player did
  // (clicking Buy), so it's more relevant than a stale catalog-load error.
  const errorMessage = useMemo(
    () => describeShopError(buyError ?? shopError),
    [buyError, shopError],
  );

  const value = useMemo(
    () => ({
      items,
      money,
      isLoading: isShopLoading,
      error: shopError,
      selectedIds,
      selectedTotal,
      remaining,
      isSelected,
      canToggle,
      toggleItem,
      buySelected,
      isBuying,
      buyError,
      errorMessage,
    }),
    [
      items,
      money,
      isShopLoading,
      shopError,
      selectedIds,
      selectedTotal,
      remaining,
      isSelected,
      canToggle,
      toggleItem,
      buySelected,
      isBuying,
      buyError,
      errorMessage,
    ],
  );

  return <NightShopContext.Provider value={value}>{children}</NightShopContext.Provider>;
}

NightShopProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
