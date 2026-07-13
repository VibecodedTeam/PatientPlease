import { pickRandomStartIndex, nextIndex } from '../../../../components/Music/internal/playbackQueue';

describe('playbackQueue', () => {
  describe('pickRandomStartIndex', () => {
    it('returns a valid index within bounds for a multi-track list', () => {
      for (let i = 0; i < 50; i += 1) {
        const index = pickRandomStartIndex(4);
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(4);
      }
    });

    it('returns 0 for a single-track list', () => {
      expect(pickRandomStartIndex(1)).toBe(0);
    });
  });

  describe('nextIndex', () => {
    it('advances sequentially through a multi-track list', () => {
      expect(nextIndex(0, 3)).toBe(1);
      expect(nextIndex(1, 3)).toBe(2);
    });

    it('wraps back to 0 after the last track', () => {
      expect(nextIndex(2, 3)).toBe(0);
    });

    it('wraps to itself for a single-track list', () => {
      expect(nextIndex(0, 1)).toBe(0);
    });
  });
});
