import { pickRandomImage } from '../../../../components/MelanomaImagePopup/internal/pickRandomImage';

describe('pickRandomImage', () => {
  it('returns null for an empty list', () => {
    expect(pickRandomImage([])).toBeNull();
  });

  it('returns the only item for a single-item list', () => {
    expect(pickRandomImage(['a.jpg'])).toBe('a.jpg');
  });

  it('picks the item at the index derived from the given random function', () => {
    const list = ['a.jpg', 'b.jpg', 'c.jpg'];

    expect(pickRandomImage(list, () => 0)).toBe('a.jpg');
    expect(pickRandomImage(list, () => 0.5)).toBe('b.jpg');
    expect(pickRandomImage(list, () => 0.999)).toBe('c.jpg');
  });
});
