import { BODY_REGION_COORDINATES } from './bodyRegions';

/**
 * Which BodyRegions need an attention-point dot, derived from a case's real
 * documents (each document's attentionPointRegion is the coarse body region
 * it's about, or null if it isn't tied to one). Regions with no known 3D
 * coordinate are dropped rather than passed through, since placing a dot
 * for one would otherwise throw (see dodajKropkeDlaRegionu) — this can
 * happen if the backend's BodyRegion enum ever adds a value ahead of this
 * frontend's mirror in bodyRegions.js.
 * @param {Array<{ attentionPointRegion: string|null }>} [documents]
 * @returns {string[]} unique, non-null, known BodyRegion values, in first-seen order
 */
export function deriveAttentionRegions(documents) {
  const regions = (documents ?? [])
    .map((document) => document.attentionPointRegion)
    .filter((region) => region != null && BODY_REGION_COORDINATES[region] !== undefined);
  return Array.from(new Set(regions));
}
