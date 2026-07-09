// TODO(backend): there is no per-case win/loss endpoint yet (see
// docs/api/day.md's POST /api/v1/day/end) — the backend only tracks the net
// endingMoney/startingMoney delta for a day, not how much was separately
// earned and lost across individual cases. Until that exists, this splits
// the one real net figure across the two boxes the Daily Statistics popup
// asks for, rather than fabricating two independent numbers.
/**
 * @param {number} startingMoney
 * @param {number} endingMoney
 * @returns {{ moneyMade: number, moneyLost: number }}
 */
export function derivePlaceholderMoneyBreakdown(startingMoney, endingMoney) {
  const delta = endingMoney - startingMoney;
  return {
    moneyMade: Math.max(delta, 0),
    moneyLost: Math.max(-delta, 0),
  };
}
