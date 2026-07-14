/** Selectable plaster (adhesive bandage) designs shown on the closing tray. */
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
  { id: 'sun-yl', name: 'Słoneczka', body: '#ffd34d', pad: '#fff6d1', motif: 'sun', mc: '#ff9d2e' },
  { id: 'sun-or', name: 'Słoneczka pomarańczowe', body: '#ff9f45', pad: '#ffe3c2', motif: 'sun', mc: '#ffe14d' },
  { id: 'dog-br', name: 'Pieski brązowe', body: '#c79f6b', pad: '#efe0c8', motif: 'dog', mc: '#8a5a2e' },
  { id: 'dog-gr', name: 'Pieski szare', body: '#b7bcc4', pad: '#eceef1', motif: 'dog', mc: '#6b7178' },
  { id: 'bunny-pk', name: 'Króliczki różowe', body: '#ffb6d0', pad: '#ffe3ee', motif: 'bunny', mc: '#ffffff' },
  { id: 'bunny-gy', name: 'Króliczki szare', body: '#c9ccd1', pad: '#eef0f2', motif: 'bunny', mc: '#8a8f96' },
  { id: 'frog-gn', name: 'Żabki zielone', body: '#6fcf7a', pad: '#dff3e2', motif: 'frog', mc: '#3fae5a' },
  { id: 'frog-tl', name: 'Żabki morskie', body: '#57c9b0', pad: '#d8f5ee', motif: 'frog', mc: '#2f9d86' },
  { id: 'person-bl', name: 'Ludziki niebieskie', body: '#5fa8f0', pad: '#dcecff', motif: 'person', mc: '#ffffff' },
  { id: 'person-rd', name: 'Ludziki czerwone', body: '#ff6f6f', pad: '#ffdede', motif: 'person', mc: '#ffffff' },
  { id: 'person-gn', name: 'Ludziki zielone', body: '#6fcf8a', pad: '#ddf3e4', motif: 'person', mc: '#ffffff' },
  { id: 'person-pu', name: 'Ludziki fioletowe', body: '#a685f0', pad: '#e6dcff', motif: 'person', mc: '#ffffff' },
  { id: 'person-yl', name: 'Ludziki żółte', body: '#ffcf5f', pad: '#fff3d1', motif: 'person', mc: '#a8571c' },
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
    case 'sun':
      return wrap(
        `<g stroke="${col}" stroke-width="1.4" stroke-linecap="round"><path d="M0 -7.6V-5.6M0 5.6V7.6M-7.6 0H-5.6M5.6 0H7.6M-5.4 -5.4L-3.9 -3.9M3.9 3.9L5.4 5.4M-5.4 5.4L-3.9 3.9M3.9 -3.9L5.4 -5.4"/></g><circle r="3.8" fill="${col}"/>`
      );
    case 'dog':
      return wrap(
        `<path d="M-5.6 -1 Q-9 3 -6 8 Q-4 4 -2.6 1.4Z M5.6 -1 Q9 3 6 8 Q4 4 2.6 1.4Z" fill="${col}"/><circle r="5.6" fill="${col}"/><ellipse cx="0" cy="3.2" rx="2.6" ry="2" fill="#fff8ee"/><circle cx="0" cy="3.4" r="1" fill="#3a2a18"/><circle cx="-2.1" cy="-0.6" r="0.95" fill="#3a2a18"/><circle cx="2.1" cy="-0.6" r="0.95" fill="#3a2a18"/>`
      );
    case 'bunny':
      return wrap(
        `<ellipse cx="-2.6" cy="-6.6" rx="1.7" ry="4.6" fill="${col}"/><ellipse cx="2.6" cy="-6.6" rx="1.7" ry="4.6" fill="${col}"/><ellipse cx="-2.6" cy="-6.4" rx="0.8" ry="3" fill="#ffd9e4"/><ellipse cx="2.6" cy="-6.4" rx="0.8" ry="3" fill="#ffd9e4"/><circle r="5.2" fill="${col}"/><circle cx="-1.9" cy="-0.6" r="0.9" fill="#3a2a18"/><circle cx="1.9" cy="-0.6" r="0.9" fill="#3a2a18"/><ellipse cx="0" cy="1.6" rx="1" ry="0.8" fill="#e88a9a"/>`
      );
    case 'frog':
      return wrap(
        `<circle cx="-3.6" cy="-4.2" r="2.2" fill="${col}"/><circle cx="3.6" cy="-4.2" r="2.2" fill="${col}"/><circle cx="-3.6" cy="-4.2" r="1" fill="#204020"/><circle cx="3.6" cy="-4.2" r="1" fill="#204020"/><ellipse cx="0" cy="1.6" rx="6.4" ry="4.6" fill="${col}"/><path d="M-3 3 Q0 5.2 3 3" stroke="#204020" stroke-width="0.8" fill="none" stroke-linecap="round"/>`
      );
    case 'person':
      return wrap(
        `<circle cx="0" cy="-4.8" r="2.5" fill="${col}"/><path d="M0 -2.2V3.4M-3.6 0.2L0 -1.2L3.6 0.2M-2.8 7.6L0 3.4L2.8 7.6" stroke="${col}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
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
