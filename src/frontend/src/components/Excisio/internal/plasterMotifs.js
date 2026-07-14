/** The 24 selectable plaster (adhesive bandage) designs shown on the closing tray. */
export const PLASTER_DEFS = [
  { id: 'classic', name: 'Klasyczny', body: '#e3c19a', pad: '#f2e5d1', motif: null },
  { id: 'classic2', name: 'Klasyczny beż', body: '#d3a878', pad: '#ecd3b2', motif: null },
  { id: 'hearts-pk', name: 'Serduszka różowe', body: '#ff8fb3', pad: '#ffdbe7', motif: 'heart', mc: '#ff3d7a' },
  { id: 'hearts-rd', name: 'Serduszka', body: '#ff5f6d', pad: '#ffdada', motif: 'heart', mc: '#ffffff' },
  { id: 'stars-bl', name: 'Gwiazdki niebieskie', body: '#5fb0f0', pad: '#d6ecff', motif: 'star', mc: '#ffe14d' },
  { id: 'stars-pu', name: 'Gwiazdki fioletowe', body: '#9b7be8', pad: '#e5daff', motif: 'star', mc: '#ffffff' },
  { id: 'flowers-pu', name: 'Kwiatki', body: '#b98ff0', pad: '#eddcff', motif: 'flower', mc: '#ffe14d' },
  { id: 'flowers-tl', name: 'Kwiatki morskie', body: '#57d0c0', pad: '#d6f5ef', motif: 'flower', mc: '#fff0a0' },
  { id: 'dots-rd', name: 'Kropki', body: '#ff6b6b', pad: '#ffdada', motif: 'dot', mc: '#ffffff' },
  { id: 'dots-gn', name: 'Kropki zielone', body: '#69c56e', pad: '#ddf3de', motif: 'dot', mc: '#ffffff' },
  { id: 'paws-or', name: 'Łapki', body: '#f2a65a', pad: '#ffe6cc', motif: 'paw', mc: '#7a4a1e' },
  { id: 'paws-bl', name: 'Łapki niebieskie', body: '#5fb0f0', pad: '#d6ecff', motif: 'paw', mc: '#1f5f9e' },
  { id: 'kitty', name: 'Kotki', body: '#ffd36b', pad: '#fff3d1', motif: 'kitty', mc: '#5a4426' },
  { id: 'puppy', name: 'Piesek (kość)', body: '#c79f6b', pad: '#efe0c8', motif: 'bone', mc: '#ffffff' },
  { id: 'stars-mix', name: 'Gwiazdki tęczowe', body: '#ff9ecb', pad: '#ffe3f1', motif: 'star', mc: '#5fd0ff' },
  { id: 'hearts-tl', name: 'Serduszka morskie', body: '#57c9d0', pad: '#d6f2f5', motif: 'heart', mc: '#ffffff' },
  { id: 'flowers-pk', name: 'Kwiatki różowe', body: '#ff9ecb', pad: '#ffe3f1', motif: 'flower', mc: '#fff0a0' },
  { id: 'flowers-bl', name: 'Kwiatki niebieskie', body: '#6fb6f0', pad: '#dcefff', motif: 'flower', mc: '#ffffff' },
  { id: 'flowers-rd', name: 'Kwiatki czerwone', body: '#ff7a7a', pad: '#ffdede', motif: 'flower', mc: '#fff0a0' },
  { id: 'flowers-mt', name: 'Kwiatki miętowe', body: '#7fd8b0', pad: '#dcf5ea', motif: 'flower', mc: '#ff7ab0' },
  { id: 'house-or', name: 'Domki', body: '#f0a95a', pad: '#ffe6cc', motif: 'house', mc: '#a8571c' },
  { id: 'house-gn', name: 'Domki zielone', body: '#79c98a', pad: '#dff3e4', motif: 'house', mc: '#2f7a44' },
  { id: 'house-bl', name: 'Domki niebieskie', body: '#7cb6e8', pad: '#e0eeff', motif: 'house', mc: '#2f5f9e' },
  { id: 'house-pk', name: 'Domki różowe', body: '#ff9ec0', pad: '#ffe3ee', motif: 'house', mc: '#c23d70' },
];

/**
 * Inline SVG markup for one small motif icon, translated/scaled to (x, y) at size `s`.
 * @param {string|null|undefined} type
 * @param {number} x
 * @param {number} y
 * @param {number} s
 * @param {string} col
 * @returns {string}
 */
export function motifSvg(type, x, y, s, col) {
  const t = `translate(${x} ${y}) scale(${(s / 16).toFixed(3)})`;
  const wrap = (inner) => `<g transform="${t}">${inner}</g>`;
  switch (type) {
    case 'heart':
      return wrap(`<path d="M0 6 C-7 0 -6 -6 -2.2 -6 C-0.7 -6 0 -4 0 -4 C0 -4 0.7 -6 2.2 -6 C6 -6 7 0 0 6Z" fill="${col}"/>`);
    case 'star':
      return wrap(
        `<path d="M0 -7 L2 -2.4 L6.7 -2.1 L3 0.9 L4.2 5.6 L0 3 L-4.2 5.6 L-3 0.9 L-6.7 -2.1 L-2 -2.4Z" fill="${col}"/>`
      );
    case 'dot':
      return wrap(`<circle r="4.6" fill="${col}"/>`);
    case 'flower':
      return wrap(
        `<g fill="${col}"><circle cx="0" cy="-5" r="3"/><circle cx="4.8" cy="-1.5" r="3"/><circle cx="3" cy="4.1" r="3"/><circle cx="-3" cy="4.1" r="3"/><circle cx="-4.8" cy="-1.5" r="3"/></g><circle r="2.6" fill="#ffd24d"/>`
      );
    case 'paw':
      return wrap(
        `<g fill="${col}"><ellipse cx="0" cy="2.6" rx="4.3" ry="3.5"/><circle cx="-3.7" cy="-2.5" r="1.9"/><circle cx="-0.7" cy="-4.7" r="1.9"/><circle cx="2.6" cy="-4" r="1.9"/><circle cx="4.5" cy="-1.1" r="1.7"/></g>`
      );
    case 'bone':
      return wrap(
        `<g fill="${col}"><rect x="-5.2" y="-1.7" width="10.4" height="3.4" rx="1.6"/><circle cx="-5" cy="-2.3" r="2.1"/><circle cx="-5" cy="2.3" r="2.1"/><circle cx="5" cy="-2.3" r="2.1"/><circle cx="5" cy="2.3" r="2.1"/></g>`
      );
    case 'kitty':
      return wrap(
        `<path d="M-5.2 -3 L-6.4 -8 L-1.6 -5Z M5.2 -3 L6.4 -8 L1.6 -5Z" fill="${col}"/><circle r="5.6" fill="${col}"/><circle cx="-2" cy="-0.4" r="0.95" fill="#3a2a18"/><circle cx="2" cy="-0.4" r="0.95" fill="#3a2a18"/><g stroke="#3a2a18" stroke-width="0.6" stroke-linecap="round"><path d="M0 1.4 l-1.6 1.1M0 1.4 l1.6 1.1"/></g>`
      );
    case 'house':
      return wrap(
        `<path d="M0 -7.5 L7.2 -1 L-7.2 -1Z" fill="${col}"/><rect x="-5" y="-1" width="10" height="8" rx="1" fill="${col}"/><rect x="-1.7" y="2" width="3.4" height="5" fill="rgba(0,0,0,0.3)"/><rect x="1.8" y="0.4" width="2.6" height="2.6" fill="rgba(255,255,255,0.55)"/>`
      );
    default:
      return '';
  }
}

const MOTIF_POSITIONS = [
  [0.11, 0.32], [0.11, 0.7], [0.27, 0.5], [0.5, 0.28],
  [0.5, 0.72], [0.73, 0.5], [0.89, 0.32], [0.89, 0.7],
];

/**
 * Full inline SVG for one plaster: rounded body, padded center, and either its repeating
 * motif icons or plain perforation dots when it has no motif.
 * @param {{body: string, pad: string, motif?: string|null, mc?: string}} def
 * @returns {string}
 */
export function plasterSvg(def) {
  const w = 224;
  const h = 100;
  const rx = h * 0.5;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">`;
  s += `<rect x="5" y="8" width="${w - 10}" height="${h - 10}" rx="${rx - 3}" fill="rgba(0,0,0,0.14)"/>`;
  s += `<rect x="3" y="3" width="${w - 6}" height="${h - 6}" rx="${rx}" fill="${def.body}"/>`;
  s += `<rect x="3" y="3" width="${w - 6}" height="${(h - 6) * 0.42}" rx="${rx}" fill="rgba(255,255,255,0.14)"/>`;
  const pw = w * 0.44;
  const ph = h * 0.66;
  s += `<rect x="${((w - pw) / 2).toFixed(1)}" y="${((h - ph) / 2).toFixed(1)}" width="${pw.toFixed(1)}" height="${ph.toFixed(1)}" rx="10" fill="${def.pad}"/>`;
  if (def.motif) {
    for (const [fx, fy] of MOTIF_POSITIONS) s += motifSvg(def.motif, w * fx, h * fy, 15, def.mc);
  } else {
    s += `<g fill="rgba(0,0,0,0.16)">`;
    for (const fx of [0.1, 0.16, 0.22, 0.78, 0.84, 0.9]) {
      for (const fy of [0.32, 0.5, 0.68]) {
        s += `<circle cx="${(w * fx).toFixed(1)}" cy="${(h * fy).toFixed(1)}" r="2"/>`;
      }
    }
    s += `</g>`;
  }
  s += `</svg>`;
  return s;
}
