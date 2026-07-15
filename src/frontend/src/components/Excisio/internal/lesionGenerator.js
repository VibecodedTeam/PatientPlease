import { clamp } from './geometry';

export const FIELD_WIDTH = 900;
export const FIELD_HEIGHT = 620;

const AXIS_BASES = [Math.PI / 2, Math.PI / 2, Math.PI / 2 - 0.5, Math.PI / 2 + 0.42];

/**
 * Which way the limb (and its lymphatic vessels) run this level - the excision ellipse
 * must be cut along this axis. Cycles through 4 presets with a little random jitter.
 * @param {number} level
 * @param {() => number} [random]
 */
export function computeAxis(level, random = Math.random) {
  return AXIS_BASES[(level - 1) % AXIS_BASES.length] + (random() * 2 - 1) * 0.12;
}

/**
 * Places one irregular melanoma plus `config.benign` round decoy nevi on the field,
 * none overlapping. Decoys skew larger/darker/more irregular ("harder") as `config.menace`
 * rises with level.
 * @param {object} params
 * @param {{melR: number, melLobe?: number, menace?: number, benign: number}} params.config
 * @param {number} params.axis
 * @param {() => number} [params.random]
 */
export function generateLesions({ config, axis, random = Math.random }) {
  const lesions = [];
  const mx = 360 + random() * 180;
  const my = 230 + random() * 150;
  const r = config.melR;
  const steps = 20;
  const phase = random() * 6.28;
  const lobe = (config.melLobe != null ? config.melLobe : 0.14) + random() * 0.06;

  const samples = [];
  for (let i = 0; i < steps; i++) {
    const ang = (i / steps) * Math.PI * 2;
    let rad = r * (1 + (random() * 2 - 1) * 0.2);
    rad *= 1 + lobe * Math.sin(ang * 2 + phase) + 0.08 * Math.sin(ang * 3 + phase * 1.7);
    samples.push({ ang, rad });
  }
  const maxR = Math.max(...samples.map((s) => s.rad));

  const cosAxis = Math.cos(axis);
  const sinAxis = Math.sin(axis);
  let axisHalf = 0;
  let perpHalf = 0;
  for (const sample of samples) {
    const dx = Math.cos(sample.ang) * sample.rad;
    const dy = Math.sin(sample.ang) * sample.rad;
    axisHalf = Math.max(axisHalf, Math.abs(dx * cosAxis + dy * sinAxis));
    perpHalf = Math.max(perpHalf, Math.abs(-dx * sinAxis + dy * cosAxis));
  }

  const mel = { type: 'mel', x: mx, y: my, r, samples, maxR, axisHalf, perpHalf };
  lesions.push(mel);

  const menace = config.menace || 0;
  const decoyCount = config.benign;
  let tries = 0;
  let made = 0;
  while (lesions.length < decoyCount + 1 && tries < 500) {
    tries++;
    // the higher the level, the more decoys are near-melanoma "hard" lookalikes - but always
    // staying a distinctly smaller, plainer mole, never ballooning up toward the melanoma's
    // own size the way it used to at high levels.
    const hardFraction = 0.25 + menace * 0.6;
    const isHard = made < Math.round(decoyCount * hardFraction);
    const k = isHard ? menace : menace * 0.35;
    const br = clamp(9 + random() * 5 + k * (r * 0.35), 8, r * 0.8);
    const x = 175 + random() * 550;
    const y = 150 + random() * 330;
    let ok = true;
    for (const lesion of lesions) {
      const need = (lesion === mel ? lesion.maxR : lesion.r) + br + 75;
      if (Math.hypot(x - lesion.x, y - lesion.y) < need) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    made++;
    const irregularity = (isHard ? 0.05 : 0.03) + k * 0.08; // mild edge waviness, still round overall
    const uneven = isHard && menace > 0.6;
    const darkness = isHard ? 0.45 + random() * 0.25 + k * 0.4 : 0.22 + random() * 0.18; // darker
    const base = Math.round(clamp(96 - darkness * 70, 18, 96));
    lesions.push({
      type: 'benign',
      x,
      y,
      r: br,
      c1: `rgb(${Math.round(base * 0.5)},${Math.round(base * 0.34)},${Math.round(base * 0.26)})`,
      c2: `rgb(${Math.round(base * 0.82)},${Math.round(base * 0.6)},${Math.round(base * 0.45)})`,
      irr: irregularity,
      seed: random() * 6.28,
      uneven,
    });
  }

  return { mel, lesions };
}
