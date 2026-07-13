import { CRITERIA } from '../../../../components/MoleCheckBoard/internal/criteria';

describe('MoleCheckBoard internal/criteria', () => {
  it('contains exactly five entries in A-E order', () => {
    expect(CRITERIA).toHaveLength(5);
    expect(CRITERIA.map((c) => c.letter)).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it('gives every entry a non-empty Polish label and description', () => {
    CRITERIA.forEach((c) => {
      expect(typeof c.label).toBe('string');
      expect(c.label.length).toBeGreaterThan(0);
      expect(typeof c.description).toBe('string');
      expect(c.description.length).toBeGreaterThan(0);
    });
  });

  it('labels C as "Kolor", matching the ABCDE mole-check mnemonic', () => {
    expect(CRITERIA.find((c) => c.letter === 'C').label).toBe('Kolor');
  });
});
