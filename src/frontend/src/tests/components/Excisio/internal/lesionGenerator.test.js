import { computeAxis, generateLesions } from '../../../../components/Excisio/internal/lesionGenerator';

/** Deterministic, seedable PRNG (mulberry32) so generator tests don't depend on Math.random. */
function seededRandom(seed) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('computeAxis', () => {
  it('picks the level-1 base with no jitter when random() is exactly midpoint', () => {
    expect(computeAxis(1, () => 0.5)).toBeCloseTo(Math.PI / 2, 10);
  });

  it('cycles through the 4 axis bases as level increases', () => {
    const a1 = computeAxis(1, () => 0.5);
    const a3 = computeAxis(3, () => 0.5);
    const a4 = computeAxis(4, () => 0.5);
    expect(a3).not.toBeCloseTo(a1, 5);
    expect(a4).not.toBeCloseTo(a1, 5);
  });
});

describe('generateLesions', () => {
  const config = { melR: 30, melLobe: 0.14, menace: 0, benign: 3 };

  it('always places exactly one melanoma plus the configured number of benign decoys', () => {
    const { mel, lesions } = generateLesions({ config, axis: Math.PI / 2, random: seededRandom(1) });
    expect(lesions).toHaveLength(config.benign + 1);
    expect(lesions[0]).toBe(mel);
    expect(mel.type).toBe('mel');
    expect(lesions.slice(1).every((l) => l.type === 'benign')).toBe(true);
  });

  it('gives the melanoma 20 angular samples and positive axis/perp half-extents', () => {
    const { mel } = generateLesions({ config, axis: Math.PI / 2, random: seededRandom(2) });
    expect(mel.samples).toHaveLength(20);
    expect(mel.maxR).toBeGreaterThan(0);
    expect(mel.axisHalf).toBeGreaterThan(0);
    expect(mel.perpHalf).toBeGreaterThan(0);
  });

  it('keeps every lesion pair far enough apart to not visually overlap', () => {
    const { mel, lesions } = generateLesions({ config, axis: Math.PI / 2, random: seededRandom(3) });
    for (let i = 0; i < lesions.length; i++) {
      for (let j = i + 1; j < lesions.length; j++) {
        const a = lesions[i];
        const b = lesions[j];
        const aRadius = a === mel ? a.maxR : a.r;
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        expect(distance).toBeGreaterThanOrEqual(aRadius + b.r + 75 - 1e-6);
      }
    }
  });

  it('is reproducible for the same seed', () => {
    const first = generateLesions({ config, axis: Math.PI / 2, random: seededRandom(42) });
    const second = generateLesions({ config, axis: Math.PI / 2, random: seededRandom(42) });
    expect(second.mel.x).toBeCloseTo(first.mel.x, 10);
    expect(second.lesions.length).toBe(first.lesions.length);
  });
});
