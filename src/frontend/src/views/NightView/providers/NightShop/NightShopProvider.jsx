import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useApi } from '../../../../providers/Api';

export const NightShopContext = createContext(null);

/**
 * Owns the night-shop domain: the purchasable catalog + the player's money
 * (fetched from `GET /api/v1/shop`), a budget-aware selection, and a
 * `buySelected` action that commits each selection via `POST /api/v1/shop/purchase`.
 *
 * Budget invariants: an item can only be selected while its price fits in the
 * remaining balance, so `selectedTotal` never exceeds `money` and `remaining`
 * never goes negative. The backend independently rejects `insufficient_funds`.
 */
export function NightShopProvider({ children }) {
  const api = useApi();
  const [catalog, setCatalog] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [isBuying, setIsBuying] = useState(false);
  const [buyError, setBuyError] = useState(null);

  const loadCatalog = useCallback(() => {
    setIsLoading(true);
    return api
      .get('/api/v1/shop')
      .then((data) => {
        setCatalog(data);
        setError(null);
      })
      .catch((err) => setError(err))
      .finally(() => setIsLoading(false));
  }, [api]);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    api
      .get('/api/v1/shop')
      .then((data) => {
        if (!isCancelled) {
          setCatalog(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!isCancelled) setError(err);
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });
    return () => {
      isCancelled = true;
    };
  }, [api]);

  const items = useMemo(() => catalog?.items ?? [], [catalog]);
  const money = catalog?.money ?? 0;

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

  const buySelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setIsBuying(true);
    setBuyError(null);
    try {
      for (const shopItemId of selectedIds) {
        // Sequential: the backend debits money per purchase, so ordering matters.
        // eslint-disable-next-line no-await-in-loop
        await api.post('/api/v1/shop/purchase', { shopItemId });
      }
      setSelectedIds(new Set());
      await loadCatalog();
    } catch (err) {
      setBuyError(err);
      // Resync from the server so money/owned reflect any partial success.
      await loadCatalog();
    } finally {
      setIsBuying(false);
    }
  }, [api, selectedIds, loadCatalog]);

  const value = useMemo(
    () => ({
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
    }),
    [
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
    ],
  );

  return <NightShopContext.Provider value={value}>{children}</NightShopContext.Provider>;
}

NightShopProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
