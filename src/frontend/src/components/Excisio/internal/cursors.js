function cursorUrl(svg, hotspot) {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hotspot}, crosshair`;
}

const SCISSORS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><g stroke="#0b1215" stroke-width="4"><circle cx="6" cy="6" r="2.6"/><circle cx="6" cy="18" r="2.6"/><path d="M8 8 L20 20 M8 16 L20 4"/></g><g stroke="#fff" stroke-width="2.1"><circle cx="6" cy="6" r="2.6"/><circle cx="6" cy="18" r="2.6"/><path d="M8 8 L20 20 M8 16 L20 4"/></g></svg>`;

const SYRINGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><g stroke="#0b1215" stroke-width="4"><path d="M3 21 L9 15"/><path d="M8 16 L18 6"/><path d="M13 7 L17 11"/><path d="M16 4 L20 8"/></g><g stroke="#fff" stroke-width="2.1"><path d="M3 21 L9 15"/><path d="M8 16 L18 6"/><path d="M13 7 L17 11"/><path d="M16 4 L20 8"/></g></svg>`;

const WIPE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="3.5" fill="#eef4f2" stroke="#0b1215" stroke-width="1.6"/><path d="M7 8.5H17M7 12H17M7 15.5H17" stroke="#aebfbd" stroke-width="1.2" stroke-linecap="round"/></svg>`;

const NEEDLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><g stroke="#0b1215" stroke-width="4"><path d="M3 21 Q9 20 13 16"/><path d="M13 16 A6 6 0 1 1 20 9"/></g><g stroke="#fff" stroke-width="2"><path d="M3 21 Q9 20 13 16"/><path d="M13 16 A6 6 0 1 1 20 9"/></g></svg>`;

const CREAM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><g stroke="#0b1215" stroke-width="3" fill="none" stroke-linejoin="round"><rect x="6" y="9" width="12" height="11" rx="2"/><path d="M9 9V6h6v3M12 6V3"/></g><rect x="6" y="9" width="12" height="11" rx="2" fill="#eaf3ef" stroke="#0b1215" stroke-width="1.2"/><path d="M9 9V6h6v3" fill="none" stroke="#0b1215" stroke-width="1.2"/><rect x="10.6" y="2.6" width="2.8" height="3.6" rx="1" fill="#cdd9d6" stroke="#0b1215" stroke-width="1"/></svg>`;

/** CSS `cursor` values for each tool, rendered as inline SVG data URIs so no asset files are needed. */
export const TOOL_CURSORS = {
  scissors: cursorUrl(SCISSORS_SVG, '15 15'),
  syringe: cursorUrl(SYRINGE_SVG, '3 21'),
  wipe: cursorUrl(WIPE_SVG, '17 17'),
  needle: cursorUrl(NEEDLE_SVG, '3 21'),
  cream: cursorUrl(CREAM_SVG, '16 16'),
};
