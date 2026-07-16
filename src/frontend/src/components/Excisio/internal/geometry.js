/** Pixels per millimeter on the operating-field canvas. */
export const MM = 10;

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Ray-casting point-in-polygon test.
 * @param {{x: number, y: number}} point
 * @param {{x: number, y: number}[]} polygon
 * @returns {boolean}
 */
export function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const vi = polygon[i];
    const vj = polygon[j];
    if (
      vi.y > point.y !== vj.y > point.y &&
      point.x < ((vj.x - vi.x) * (point.y - vi.y)) / (vj.y - vi.y) + vi.x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Parametric position (0-1) along segment 1 where it crosses segment 2, or null if they don't cross.
 */
export function segmentIntersectionT(x1, y1, x2, y2, x3, y3, x4, y4) {
  const d = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
  if (Math.abs(d) < 1e-9) return null;
  const t = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / d;
  const u = ((x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : null;
}

/**
 * Distance from `center` to the nearest polygon edge along a ray at `angle`, or null if the
 * ray (cast 2600px out) never crosses the polygon.
 * @param {{x: number, y: number}} center
 * @param {number} angle
 * @param {{x: number, y: number}[]} polygon - closed ring (first point repeated as last)
 */
export function rayDistanceToPolygon(center, angle, polygon) {
  const farX = center.x + Math.cos(angle) * 2600;
  const farY = center.y + Math.sin(angle) * 2600;
  let best = null;
  for (let i = 0; i < polygon.length - 1; i++) {
    const t = segmentIntersectionT(
      center.x, center.y, farX, farY,
      polygon[i].x, polygon[i].y, polygon[i + 1].x, polygon[i + 1].y
    );
    if (t != null) {
      const distance = t * 2600;
      if (best == null || distance < best) best = distance;
    }
  }
  return best;
}

/**
 * Polar radius of an ellipse (semi-axes a, b, rotated by `axis`) at angle `theta`.
 */
export function ellipseRadiusAtAngle(semiMajor, semiMinor, axis, theta) {
  const relative = theta - axis;
  return (semiMajor * semiMinor) / Math.hypot(semiMinor * Math.cos(relative), semiMajor * Math.sin(relative));
}

/**
 * Interpolated lesion radius at `theta`, from its evenly-spaced angular samples.
 * @param {{samples: {rad: number}[]}} mel
 * @param {number} theta
 */
export function melanomaRadiusAt(mel, theta) {
  const steps = mel.samples.length;
  const normalized = ((theta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const f = (normalized / (Math.PI * 2)) * steps;
  const i0 = Math.floor(f) % steps;
  const i1 = (i0 + 1) % steps;
  const fraction = f - Math.floor(f);
  return mel.samples[i0].rad * (1 - fraction) + mel.samples[i1].rad * fraction;
}

/**
 * @param {number} amount
 * @returns {string} e.g. "12,50 zł"
 */
export function formatZloty(amount) {
  return `${amount.toFixed(2).replace('.', ',')} zł`;
}

/**
 * Per-level difficulty curve: which body part, how melanoma-like the decoy lesions get,
 * hand tremor on the cutting line, and the real lesion's size/lobing.
 * @param {number} level
 * @param {{name: string, tone: string[]}[]} parts
 */
export function computeDifficulty(level, parts) {
  const part = parts[(level - 1) % parts.length];
  const menace = clamp((level - 1) / 6, 0, 0.92);
  return {
    part: part.name,
    tone: part.tone,
    marginMm: 2,
    menace,
    benign: Math.min(2 + Math.floor(level / 2.5), 4),
    tremor: level >= 2 ? Math.min((level - 1) * 0.9, 4.2) : 0,
    melLobe: 0.15 - menace * 0.09,
    melDark: 1 - menace * 0.35,
    melR: Math.max(19, 33 - (level - 1) * 2.2),
    distractor: level >= 2,
  };
}

/**
 * Scores a freehand excision polygon against the ideal margin ellipse around the melanoma.
 * @param {object} params
 * @param {{x: number, y: number}[]} params.poly - closed excision outline
 * @param {{x: number, y: number, axisHalf: number, perpHalf: number, samples: {rad:number}[]}} params.mel
 * @param {{type: string, x: number, y: number}[]} params.lesions - all lesions on the field (mel + benign decoys)
 * @param {number} params.axis - limb axis, radians
 * @param {number} [params.marginMm]
 * @param {number} [params.fieldWidth] - operating-field width, to catch a grossly oversized cut
 * @param {number} [params.fieldHeight] - operating-field height, to catch a grossly oversized cut
 */
export function computeExcisionScore({ poly, mel, lesions, axis, marginMm = 2, fieldWidth = 900, fieldHeight = 620 }) {
  const center = { x: mel.x, y: mel.y };
  const enclosed = pointInPolygon(center, poly);
  let benignEnclosed = 0;
  for (const lesion of lesions) {
    if (lesion.type === 'benign' && pointInPolygon({ x: lesion.x, y: lesion.y }, poly)) benignEnclosed++;
  }
  const marginPx = marginMm * MM;

  if (!enclosed) {
    const score = benignEnclosed > 0 ? 6 : 2;
    return {
      score,
      wrong: true,
      benignEnclosed,
      moneyNum: score * 0.5,
      money: formatZloty(score * 0.5),
      clearance: 0,
      marginAcc: 0,
      conserv: benignEnclosed > 0 ? 0 : 60,
      tone: '#ff6b6b',
      title: benignEnclosed > 0 ? 'Wycięto zdrowy pieprzyk' : 'Chybione cięcie',
      msg:
        'Czerniak wciąż jest na skórze. To on jest większy, asymetryczny, o poszarpanych brzegach i niejednolitym kolorze — obrysuj właśnie tę zmianę.',
    };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of poly) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  if (maxX - minX > fieldWidth * 0.7 || maxY - minY > fieldHeight * 0.7) {
    return {
      score: 4,
      wrong: true,
      oversized: true,
      benignEnclosed,
      moneyNum: 2,
      money: formatZloty(2),
      clearance: 0,
      marginAcc: 0,
      conserv: 0,
      tone: '#ff6b6b',
      title: 'Wycięto zbyt dużo',
      msg:
        'Elipsa objęła niemal całą kończynę — usunięto ogromny obszar zdrowej skóry zamiast ciasnej elipsy z marginesem 1–3 mm wokół zmiany.',
    };
  }

  const ellipseB = mel.perpHalf + marginPx;
  const ellipseA = Math.max(mel.axisHalf + marginPx, ellipseB * 2.7);

  const N = 140;
  let tumorRays = 0;
  let sumAbs = 0;
  let sumExcess = 0;
  let minMargin = Infinity;
  const cosAxis = Math.cos(axis);
  const sinAxis = Math.sin(axis);
  let extentAlongAxis = 0;
  let extentAcrossAxis = 0;
  for (const point of poly) {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    extentAlongAxis = Math.max(extentAlongAxis, Math.abs(dx * cosAxis + dy * sinAxis));
    extentAcrossAxis = Math.max(extentAcrossAxis, Math.abs(-dx * sinAxis + dy * cosAxis));
  }
  const orientedCross = extentAcrossAxis > extentAlongAxis * 1.12;

  for (let i = 0; i < N; i++) {
    const theta = (i / N) * Math.PI * 2;
    const lesionRadius = melanomaRadiusAt(mel, theta);
    const idealRadius = ellipseRadiusAtAngle(ellipseA, ellipseB, axis, theta);
    const cutRadius = rayDistanceToPolygon(center, theta, poly);
    if (cutRadius == null) {
      sumAbs += marginPx * 2;
      continue;
    }
    if (cutRadius < lesionRadius - 1) tumorRays++;
    const margin = cutRadius - lesionRadius;
    if (margin < minMargin) minMargin = margin;
    sumAbs += Math.abs(cutRadius - idealRadius);
    if (cutRadius > idealRadius) sumExcess += cutRadius - idealRadius;
  }

  const shapeMm = sumAbs / N / MM;
  const excessMm = sumExcess / N / MM;
  const minMm = minMargin / MM;
  const clearance = 1 - tumorRays / N;

  const tumorPenalty = tumorRays > 0 ? 12 + 46 * (tumorRays / N) : 0;
  const shapePenalty = shapeMm * 6.5;
  const orientPenalty = orientedCross ? 18 : 0;
  const tightPenalty = tumorRays === 0 && minMm < 1 ? (1 - Math.max(minMm, 0)) * 20 : 0;
  const benignPenalty = benignEnclosed * 7;

  const score = Math.round(
    clamp(100 - tumorPenalty - shapePenalty - orientPenalty - tightPenalty - benignPenalty, 0, 100)
  );
  const marginAcc = Math.round(clamp(100 - shapeMm * 17, 0, 100));
  const conserv = Math.round(clamp(100 - excessMm * 20, 0, 100));
  const clearancePct = Math.round(clearance * 100);

  let title;
  let msg;
  let tone;
  if (!orientedCross && tumorRays <= N * 0.03 && minMm >= 1 && score >= 97) {
    tone = '#57e0c0';
    title = score === 100 ? 'Perfekcyjne wycięcie!' : 'Wzorowe wycięcie';
    msg = `Elipsa idealnie wzdłuż osi, najmniejszy margines ${minMm.toFixed(1)} mm. Podręcznikowa biopsja wycinająca.`;
  } else if (tumorRays > N * 0.03) {
    tone = '#ff6b6b';
    title = 'Dodatni margines';
    msg = 'Linia cięcia przechodzi przez czerniaka — zostały komórki nowotworowe. Tnij w zdrowej skórze wokół całej zmiany.';
  } else if (orientedCross) {
    tone = '#f0a94d';
    title = 'Zła oś cięcia';
    msg = 'Elipsa idzie w poprzek kończyny. Tnij wzdłuż długiej osi (równolegle do naczyń chłonnych) — inaczej rana źle się zamknie.';
  } else if (minMm < 1) {
    tone = '#f0a94d';
    title = 'Za wąski margines';
    msg = `Najmniejszy margines to tylko ${Math.max(minMm, 0).toFixed(1)} mm. Powinien wynosić 1–3 mm w każdym miejscu.`;
  } else if (conserv < 55) {
    tone = '#f0a94d';
    title = 'Za szeroki margines';
    msg = `Czerniak usunięty, ale margines śr. jest za duży (najmniejszy ${minMm.toFixed(1)} mm). Trzymaj się 1–3 mm.`;
  } else if (score >= 80) {
    tone = '#57e0c0';
    title = 'Dobre wycięcie';
    msg = `Czerniak usunięty elipsą, najmniejszy margines ${minMm.toFixed(1)} mm. Dopracuj równość linii.`;
  } else {
    tone = '#f0a94d';
    title = 'Do poprawy';
    msg = `Zmiana usunięta, ale linia jest nierówna (najmniejszy margines ${minMm.toFixed(1)} mm). Prowadź elipsę spokojniej wzdłuż osi.`;
  }

  return {
    score,
    wrong: false,
    benignEnclosed,
    tumorRays,
    marginPx,
    clearance: clearancePct,
    marginAcc,
    conserv,
    minMm,
    orientedCross,
    tone,
    title,
    msg,
    moneyNum: score * 0.5,
    money: formatZloty(score * 0.5),
    ellipseA,
    ellipseB,
  };
}

/**
 * Geometry of one stitch relative to the wound's center/direction/normal: how far along the
 * wound it sits, whether it actually crosses the gap, how perpendicular and symmetric it is.
 * @param {{x:number,y:number}} center
 * @param {{x:number,y:number}} dir - unit vector along the wound's long axis
 * @param {{x:number,y:number}} normal - unit vector perpendicular to the wound
 * @param {{x:number,y:number}} A - stitch start point
 * @param {{x:number,y:number}} B - stitch end point
 */
export function stitchGeometry(center, dir, normal, A, B) {
  const sA = (A.x - center.x) * dir.x + (A.y - center.y) * dir.y;
  const sB = (B.x - center.x) * dir.x + (B.y - center.y) * dir.y;
  const pA = (A.x - center.x) * normal.x + (A.y - center.y) * normal.y;
  const pB = (B.x - center.x) * normal.x + (B.y - center.y) * normal.y;
  const pos = (sA + sB) / 2;
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const len = Math.hypot(dx, dy) || 1;
  const perp = Math.abs((dx * normal.x + dy * normal.y) / len);
  const sym = 1 - Math.abs(Math.abs(pA) - Math.abs(pB)) / (Math.abs(pA) + Math.abs(pB) + 1e-3);
  return { pos, pA, pB, perp, sym, cross: pA * pB < 0, A: { x: A.x, y: A.y }, B: { x: B.x, y: B.y } };
}

/**
 * A stitch only actually closes the wound if it crosses the gap, stays within the wound's
 * length, and (set by the caller) doesn't cross another already-good stitch in the same layer.
 * @param {{cross: boolean, pos: number, tangled?: boolean}} stitch
 * @param {number} ellipseA - wound half-length along its axis
 */
export function isStitchValid(stitch, ellipseA) {
  return stitch.cross && Math.abs(stitch.pos) <= ellipseA * 1.35 && !stitch.tangled;
}

/**
 * Combined deep+skin suture score: perpendicularity, left/right symmetry and even spacing of
 * the stitches that actually cross the wound, scaled down by how many stitches were botched.
 * @param {ReturnType<typeof stitchGeometry>[]} deepStitches
 * @param {ReturnType<typeof stitchGeometry>[]} skinStitches
 * @param {number} ellipseA
 */
export function scoreSutures(deepStitches, skinStitches, ellipseA) {
  const all = [...deepStitches, ...skinStitches];
  if (!all.length) return 0;
  const good = all.filter((s) => isStitchValid(s, ellipseA));
  if (good.length === 0 || good.length < all.length * 0.5) return 0;

  const average = (key) => good.reduce((sum, s) => sum + s[key], 0) / good.length;
  const perp = average('perp');
  const sym = average('sym');

  const spacingOf = (stitches) => {
    const ok = stitches.filter((s) => isStitchValid(s, ellipseA));
    if (ok.length < 2) return 1;
    const positions = ok.map((s) => s.pos).sort((a, b) => a - b);
    const gaps = [];
    for (let i = 1; i < positions.length; i++) gaps.push(positions[i] - positions[i - 1]);
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const variance = gaps.reduce((a, b) => a + (b - mean) * (b - mean), 0) / gaps.length;
    const cv = Math.sqrt(variance) / (mean + 1e-3);
    return clamp(1 - cv, 0, 1);
  };
  const spacing = (spacingOf(deepStitches) + spacingOf(skinStitches)) / 2;

  const cleanFraction = good.length / all.length;
  return Math.round(clamp(100 * (0.42 * perp + 0.3 * sym + 0.28 * spacing) * cleanFraction, 0, 100));
}
