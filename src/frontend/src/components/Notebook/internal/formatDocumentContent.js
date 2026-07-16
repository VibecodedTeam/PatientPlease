/**
 * Polish labels for the camelCase content keys actually used across the case data
 * (src/backend/src/db/data/realCases.ts, fictionalCases.ts, and seed.ts) for the
 * UV_EXPOSURE_HISTORY, CLINICAL_SYMPTOMS, DISEASE_HISTORY, FAMILY_HISTORY,
 * WEATHER_HISTORY, and EXAMINATION_RESULTS document types, plus a couple of
 * illustrative multi-key examples (sunbedUse, occupationalExposure) exercised by tests.
 * `shopItemId` is deliberately excluded: it's an internal EXAMINATION_RESULTS field used
 * only for visibility gating (see ExaminationsPage.jsx) and must never get a display label.
 * Keys not listed here fall back to the generic Title-Case-from-camelCase behavior below.
 */
const KEY_LABELS = {
  history: 'Historia',
  description: 'Opis',
  findings: 'Wyniki',
  sunbedUse: 'Korzystanie z solarium',
  occupationalExposure: 'Narażenie zawodowe',
};

/**
 * @param {string} key - camelCase object key, e.g. "sunbedUse".
 * @returns {string} Polish label if the key is known, e.g. "Korzystanie z solarium";
 * otherwise a generic Title Case fallback, e.g. "Sunbed Use".
 */
export function formatKeyLabel(key) {
  if (Object.prototype.hasOwnProperty.call(KEY_LABELS, key)) return KEY_LABELS[key];
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
}

/**
 * @param {string | Record<string, unknown> | null | undefined} content
 * @returns {string} String content as-is; a single-key object as its bare
 * value; a multi-key object as "Label: value; Label: value".
 */
export function formatHistoryContent(content) {
  if (!content) return '';
  if (typeof content === 'string') return content;
  const entries = Object.entries(content);
  if (entries.length === 1) return String(entries[0][1]);
  return entries.map(([key, value]) => `${formatKeyLabel(key)}: ${value}`).join('; ');
}
