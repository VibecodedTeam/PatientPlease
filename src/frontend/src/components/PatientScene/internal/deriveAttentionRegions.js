/**
 * Which BodyRegions need an attention-point dot, derived from a case's real
 * documents (each document's attentionPointRegion is the coarse body region
 * it's about, or null if it isn't tied to one).
 * @param {Array<{ attentionPointRegion: string|null }>} [documents]
 * @returns {string[]} unique, non-null BodyRegion values, in first-seen order
 */
export function deriveAttentionRegions(documents) {
  const regions = (documents ?? [])
    .map((document) => document.attentionPointRegion)
    .filter((region) => region != null);
  return Array.from(new Set(regions));
}
