// Polish labels for the camelCase content keys that appear in case-document
// JSON. Unknown keys fall back to the algorithmic spaced/capitalized form.
const KEY_LABELS = {
  history: 'Historia',
  description: 'Opis',
  findings: 'Wyniki',
  finding: 'Wynik',
  sunbedUse: 'Korzystanie z solarium',
  occupationalExposure: 'Ekspozycja zawodowa',
};

/**
 * @param {string} key - camelCase object key, e.g. "sunbedUse".
 * @returns {string} Human-readable Polish label, e.g. "Korzystanie z solarium".
 */
export function formatKeyLabel(key) {
  return (
    KEY_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase())
  );
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
