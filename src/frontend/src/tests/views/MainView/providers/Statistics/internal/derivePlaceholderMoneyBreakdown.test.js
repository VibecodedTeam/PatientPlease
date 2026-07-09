import { derivePlaceholderMoneyBreakdown } from '../../../../../../views/MainView/providers/Statistics/internal/derivePlaceholderMoneyBreakdown';

describe('derivePlaceholderMoneyBreakdown', () => {
  it('attributes a net gain entirely to moneyMade, with moneyLost at zero', () => {
    expect(derivePlaceholderMoneyBreakdown(100, 130)).toEqual({ moneyMade: 30, moneyLost: 0 });
  });

  it('attributes a net loss entirely to moneyLost, with moneyMade at zero', () => {
    expect(derivePlaceholderMoneyBreakdown(100, 70)).toEqual({ moneyMade: 0, moneyLost: 30 });
  });

  it('returns zero for both when the money is unchanged', () => {
    expect(derivePlaceholderMoneyBreakdown(100, 100)).toEqual({ moneyMade: 0, moneyLost: 0 });
  });
});
