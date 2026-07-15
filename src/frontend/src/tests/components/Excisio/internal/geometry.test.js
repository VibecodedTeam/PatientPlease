import {
  MM,
  clamp,
  pointInPolygon,
  segmentIntersectionT,
  rayDistanceToPolygon,
  ellipseRadiusAtAngle,
  melanomaRadiusAt,
  formatZloty,
  computeDifficulty,
  computeExcisionScore,
  stitchGeometry,
  isStitchValid,
  scoreSutures,
} from '../../../../components/Excisio/internal/geometry';

/** Closed polygon ring tracing an axis-aligned-then-rotated ellipse, centered at `center`. */
function ellipsePolygon(center, rx, ry, rotation = 0, segments = 360) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const x = rx * Math.cos(t), y = ry * Math.sin(t);
    const cos = Math.cos(rotation), sin = Math.sin(rotation);
    pts.push({ x: center.x + x * cos - y * sin, y: center.y + x * sin + y * cos });
  }
  return pts;
}

/** A perfectly round lesion (constant radius at every sampled angle). */
function circularMel(center, radius, steps = 20) {
  const samples = Array.from({ length: steps }, (_, i) => ({ ang: (i / steps) * Math.PI * 2, rad: radius }));
  return { x: center.x, y: center.y, r: radius, samples, maxR: radius, axisHalf: radius, perpHalf: radius };
}

describe('clamp', () => {
  it('passes values through unchanged when inside the range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it('clamps below the minimum', () => {
    expect(clamp(-1, 0, 10)).toBe(0);
  });
  it('clamps above the maximum', () => {
    expect(clamp(11, 0, 10)).toBe(10);
  });
});

describe('pointInPolygon', () => {
  const square = [
    { x: -5, y: -5 }, { x: 5, y: -5 }, { x: 5, y: 5 }, { x: -5, y: 5 }, { x: -5, y: -5 },
  ];
  it('is true for a point inside', () => {
    expect(pointInPolygon({ x: 0, y: 0 }, square)).toBe(true);
  });
  it('is false for a point outside', () => {
    expect(pointInPolygon({ x: 50, y: 50 }, square)).toBe(false);
  });
});

describe('ellipseRadiusAtAngle', () => {
  it('returns the semi-major length along the axis', () => {
    expect(ellipseRadiusAtAngle(10, 5, 0, 0)).toBeCloseTo(10, 5);
  });
  it('returns the semi-minor length perpendicular to the axis', () => {
    expect(ellipseRadiusAtAngle(10, 5, 0, Math.PI / 2)).toBeCloseTo(5, 5);
  });
});

describe('melanomaRadiusAt', () => {
  it('returns the exact sample radius at a sampled angle', () => {
    const mel = { samples: [{ rad: 10 }, { rad: 20 }, { rad: 30 }, { rad: 40 }] };
    expect(melanomaRadiusAt(mel, 0)).toBeCloseTo(10, 5);
    expect(melanomaRadiusAt(mel, Math.PI / 2)).toBeCloseTo(20, 5);
  });
  it('interpolates between two samples', () => {
    const mel = { samples: [{ rad: 10 }, { rad: 20 }, { rad: 30 }, { rad: 40 }] };
    expect(melanomaRadiusAt(mel, Math.PI / 4)).toBeCloseTo(15, 5);
  });
});

describe('rayDistanceToPolygon / segmentIntersectionT', () => {
  it('measures the distance from center to a square edge along a ray', () => {
    const square = [
      { x: -5, y: -5 }, { x: 5, y: -5 }, { x: 5, y: 5 }, { x: -5, y: 5 }, { x: -5, y: -5 },
    ];
    expect(rayDistanceToPolygon({ x: 0, y: 0 }, 0, square)).toBeCloseTo(5, 5);
  });
  it('returns null when the ray never crosses the polygon', () => {
    const tinyTriangle = [{ x: 100, y: 100 }, { x: 101, y: 100 }, { x: 100, y: 101 }, { x: 100, y: 100 }];
    expect(rayDistanceToPolygon({ x: 0, y: 0 }, 0, tinyTriangle)).toBeNull();
  });
});

describe('formatZloty', () => {
  it('formats with a comma decimal separator and a trailing currency mark', () => {
    expect(formatZloty(12.5)).toBe('12,50 zł');
  });
});

describe('computeDifficulty', () => {
  const parts = [
    { name: 'Przedramię', tone: ['a', 'b', 'c'] },
    { name: 'Plecy', tone: ['d', 'e', 'f'] },
  ];

  it('level 1 has no tremor and the largest lesion radius', () => {
    const cfg = computeDifficulty(1, parts);
    expect(cfg.part).toBe('Przedramię');
    expect(cfg.menace).toBe(0);
    expect(cfg.tremor).toBe(0);
    expect(cfg.melR).toBeCloseTo(33, 5);
    expect(cfg.marginMm).toBe(2);
  });

  it('cycles through parts and ramps up menace/tremor with level', () => {
    const cfg = computeDifficulty(3, parts);
    expect(cfg.part).toBe('Przedramię'); // (3-1) % 2 === 0
    expect(cfg.tremor).toBeGreaterThan(0);
    expect(cfg.menace).toBeGreaterThan(0);
    expect(cfg.melR).toBeLessThan(33);
  });

  it('caps menace and tremor at high levels', () => {
    const cfg = computeDifficulty(20, parts);
    expect(cfg.menace).toBeLessThanOrEqual(0.92);
    expect(cfg.tremor).toBeLessThanOrEqual(4.2);
  });
});

describe('computeExcisionScore', () => {
  const center = { x: 100, y: 100 };
  const mel = circularMel(center, 20);

  it('flags a cut that misses the lesion entirely as wrong', () => {
    const missPoly = ellipsePolygon({ x: 500, y: 500 }, 10, 10);
    const res = computeExcisionScore({ poly: missPoly, mel, lesions: [mel], axis: 0 });
    expect(res.wrong).toBe(true);
    expect(res.score).toBeLessThan(10);
  });

  it('scores a well-aligned ideal-margin ellipse near-perfectly', () => {
    // ellipseB = perpHalf(20) + marginPx(2mm*MM=20) = 40; ellipseA = max(20+20, 40*2.7) = 108
    const idealPoly = ellipsePolygon(center, 108, 40, 0, 720);
    const res = computeExcisionScore({ poly: idealPoly, mel, lesions: [mel], axis: 0 });
    expect(res.wrong).toBe(false);
    expect(res.orientedCross).toBe(false);
    expect(res.score).toBeGreaterThanOrEqual(97);
    expect(res.ellipseA).toBeCloseTo(108, 0);
    expect(res.ellipseB).toBeCloseTo(40, 0);
  });

  it('penalizes an excision cut across the limb axis instead of along it', () => {
    const crossPoly = ellipsePolygon(center, 60, 150, 0, 720);
    const res = computeExcisionScore({ poly: crossPoly, mel, lesions: [mel], axis: 0 });
    expect(res.wrong).toBe(false);
    expect(res.orientedCross).toBe(true);
    expect(res.title).toBe('Zła oś cięcia');
  });

  it('penalizes leaving tumor tissue behind', () => {
    const tightPoly = ellipsePolygon(center, 10, 10, 0, 720);
    const res = computeExcisionScore({ poly: tightPoly, mel, lesions: [mel], axis: 0 });
    expect(res.wrong).toBe(false);
    expect(res.tumorRays).toBeGreaterThan(0);
    expect(res.title).toBe('Dodatni margines');
  });

  it('fails an absurdly oversized cut spanning most of the field, even though the lesion is enclosed', () => {
    const hugePoly = ellipsePolygon(center, 400, 400, 0, 720);
    const res = computeExcisionScore({ poly: hugePoly, mel, lesions: [mel], axis: 0, fieldWidth: 900, fieldHeight: 620 });
    expect(res.wrong).toBe(true);
    expect(res.oversized).toBe(true);
    expect(res.score).toBeLessThan(10);
  });

  it('does not flag a normally generous (but not screen-spanning) margin as oversized', () => {
    const wideButNormalPoly = ellipsePolygon(center, 200, 100, 0, 720);
    const res = computeExcisionScore({ poly: wideButNormalPoly, mel, lesions: [mel], axis: 0, fieldWidth: 900, fieldHeight: 620 });
    expect(res.oversized).toBeUndefined();
  });
});

describe('stitchGeometry / isStitchValid / scoreSutures', () => {
  const center = { x: 0, y: 0 };
  const dir = { x: 1, y: 0 };
  const normal = { x: 0, y: 1 };
  const ellipseA = 100;

  it('recognizes a stitch that crosses perpendicular to the wound as valid', () => {
    const s = stitchGeometry(center, dir, normal, { x: 0, y: -20 }, { x: 0, y: 20 });
    expect(s.cross).toBe(true);
    expect(s.perp).toBeCloseTo(1, 5);
    expect(isStitchValid(s, ellipseA)).toBe(true);
  });

  it('rejects a stitch that runs lengthwise and never crosses the wound', () => {
    const s = stitchGeometry(center, dir, normal, { x: -10, y: 5 }, { x: 10, y: 5 });
    expect(s.cross).toBe(false);
    expect(isStitchValid(s, ellipseA)).toBe(false);
  });

  it('scores evenly spaced, perpendicular, symmetric stitches near 100', () => {
    const deep = [-30, 0, 30].map((pos) => stitchGeometry(center, dir, normal, { x: pos, y: -20 }, { x: pos, y: 20 }));
    const skin = [-40, -20, 0, 20, 40].map((pos) => stitchGeometry(center, dir, normal, { x: pos, y: -15 }, { x: pos, y: 15 }));
    expect(scoreSutures(deep, skin, ellipseA)).toBeGreaterThanOrEqual(98);
  });

  it('scores 0 when most stitches never cross the wound', () => {
    const deep = [
      stitchGeometry(center, dir, normal, { x: 0, y: -20 }, { x: 0, y: 20 }),
      stitchGeometry(center, dir, normal, { x: -10, y: 5 }, { x: 10, y: 5 }),
      stitchGeometry(center, dir, normal, { x: -10, y: 6 }, { x: 10, y: 6 }),
    ];
    expect(scoreSutures(deep, [], ellipseA)).toBe(0);
  });

  it('scores 0 for no stitches at all', () => {
    expect(scoreSutures([], [], ellipseA)).toBe(0);
  });
});

describe('constants', () => {
  it('exposes the pixels-per-millimeter scale', () => {
    expect(MM).toBe(10);
  });
});
