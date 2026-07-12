import React, { createContext, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useRound } from '../../../../providers/Round';

export const ExaminationsContext = createContext(null);

/**
 * Narrows RoundProvider's shopCatalog down to just the EXAMINATION-type items
 * Phone needs to display: name, description, price, and whether the player
 * already owns it. Only an owned EXAMINATION can actually be ordered against a
 * case (see docs/api/examinations.md) — `owned` is the real, backend-driven
 * reason a row would be unselectable, not an arbitrary flag.
 *
 * Read-only for now: ordering (POST /api/v1/examinations) and purchasing an
 * unowned one (POST /api/v1/shop/purchase) are deliberately out of scope here
 * — see docs/superpowers/plans/2026-07-12-phone-examinations-provider.md.
 */
export function ExaminationsProvider({ children }) {
  const { shopCatalog, isShopLoading, shopError, loadShopCatalog } = useRound();

  useEffect(() => {
    loadShopCatalog();
  }, [loadShopCatalog]);

  const examinations = useMemo(
    () =>
      (shopCatalog?.items ?? [])
        .filter((item) => item.itemType === 'EXAMINATION')
        .map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: item.price,
          owned: item.owned,
        })),
    [shopCatalog],
  );

  const value = useMemo(
    () => ({ examinations, isLoading: isShopLoading, error: shopError }),
    [examinations, isShopLoading, shopError],
  );

  return <ExaminationsContext.Provider value={value}>{children}</ExaminationsContext.Provider>;
}

ExaminationsProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
