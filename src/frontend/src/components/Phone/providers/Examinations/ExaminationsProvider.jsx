import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useRound } from '../../../../providers/Round';
import { useGameSession } from '../../../../views/MainView/providers/GameSession';

export const ExaminationsContext = createContext(null);

/**
 * Narrows RoundProvider's shopCatalog down to just the EXAMINATION-type items
 * Phone needs to display: name, description, price, timeCostMs, and whether
 * the player already owns it. Only an owned EXAMINATION can actually be
 * ordered against a case (see docs/api/examinations.md) — `owned` is the
 * real, backend-driven reason a row would be unselectable, not an arbitrary
 * flag.
 *
 * Also owns `order(shopItemId)`: orders an owned examination against the
 * active case (costs in-game time, not money — money, if any, is already
 * merged into round.gameSession by useRound().orderExamination), then
 * refreshes the round so the newly-ordered exam's EXAMINATION_RESULTS
 * document becomes visible on the desk.
 */
export function ExaminationsProvider({ children }) {
  const { round, shopCatalog, isShopLoading, shopError, loadShopCatalog, orderExamination, refreshRound } =
    useRound();
  const { isDayOver, addElapsedSeconds } = useGameSession();
  const [orderingId, setOrderingId] = useState(null);
  const [orderError, setOrderError] = useState(null);

  // Read via a ref (rather than as an order() dependency) so order's identity
  // stays stable while still observing the latest value once its await
  // resolves — mirrors ResultsProvider.closeResult()'s same guard (ee27d0f).
  const isDayOverRef = useRef(isDayOver);
  isDayOverRef.current = isDayOver;

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
          timeCostMs: item.timeCostMs,
        })),
    [shopCatalog],
  );

  const order = useCallback(
    async (shopItemId) => {
      const caseId = round?.case?.id;
      const exam = examinations.find((e) => e.id === shopItemId);
      if (!caseId || !exam?.owned) return;

      setOrderingId(shopItemId);
      setOrderError(null);
      try {
        const data = await orderExamination(caseId, shopItemId);
        addElapsedSeconds(Math.round(data.timeCostMs / 1000));
        // Only refetch the round while the day is still running. If the
        // natural 1-second tick ended the day (closing the GameDayLog) while
        // this request was in flight, refetching here would hit
        // POST /api/v1/round before the player ever reaches night phase,
        // which auto-starts the NEXT day's GameDayLog early
        // (resolveOpenGameDayLog creates one whenever none is open) —
        // leaving the backend already past night-phase eligibility by the
        // time the player navigates to the shop, so every purchase 409s
        // with not_night_phase. Same race, same fix as ResultsProvider
        // .closeResult() (ee27d0f).
        if (!isDayOverRef.current) {
          await refreshRound();
        }
      } catch (err) {
        setOrderError(err);
      } finally {
        setOrderingId(null);
      }
    },
    [round, examinations, orderExamination, addElapsedSeconds, refreshRound],
  );

  const value = useMemo(
    () => ({
      examinations,
      isLoading: isShopLoading,
      error: shopError,
      order,
      orderingId,
      orderError,
    }),
    [examinations, isShopLoading, shopError, order, orderingId, orderError],
  );

  return <ExaminationsContext.Provider value={value}>{children}</ExaminationsContext.Provider>;
}

ExaminationsProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
