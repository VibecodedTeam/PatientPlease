import { dodajKropke } from './dodajKropke';
import { BODY_REGION_COORDINATES } from './bodyRegions';

/**
 * Adds a dot ("kropka") onto glownyModel at the fixed point associated with the given
 * BodyRegion, via dodajKropke - the dot is tagged with that region (userData.bodyRegion)
 * so callers can identify which body part was clicked.
 * @param {import('three').Object3D} glownyModel
 * @param {string} bodyRegion - one of the BodyRegion enum values (see ./bodyRegions)
 * @param {number|string} kolor - THREE.Color-compatible value
 * @returns {import('three').Mesh} the created dot mesh
 */
export function dodajKropkeDlaRegionu(glownyModel, bodyRegion, kolor) {
  const coords = BODY_REGION_COORDINATES[bodyRegion];
  if (!coords) {
    throw new Error(`Unknown BodyRegion: ${bodyRegion}`);
  }

  const dot = dodajKropke(glownyModel, coords.x, coords.y, coords.z, kolor);
  dot.userData.bodyRegion = bodyRegion;
  return dot;
}
