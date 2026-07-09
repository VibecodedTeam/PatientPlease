/**
 * Frontend mirror of the backend's Prisma `BodyRegion` enum (src/backend/prisma/schema).
 * Kept as a plain object since the frontend is JS-only (no TypeScript enums, CLAUDE.md ยง1.6).
 */
export const BodyRegion = Object.freeze({
  HEAD: 'HEAD',
  NECK: 'NECK',
  CHEST: 'CHEST',
  BACK: 'BACK',
  ABDOMEN: 'ABDOMEN',
  LEFT_ARM: 'LEFT_ARM',
  RIGHT_ARM: 'RIGHT_ARM',
  LEFT_LEG: 'LEFT_LEG',
  RIGHT_LEG: 'RIGHT_LEG',
  LEFT_HAND: 'LEFT_HAND',
  RIGHT_HAND: 'RIGHT_HAND',
  LEFT_FOOT: 'LEFT_FOOT',
  RIGHT_FOOT: 'RIGHT_FOOT',
});

/**
 * One approximate (x, y, z) point per BodyRegion, in FinalBaseMesh's own raw local
 * coordinate space (roughly x:[-5.8,5.8], y:[-0.06,20.7], z:[-1.85,1.9]). Exact values
 * don't need to be precise - dodajKropke snaps each onto the nearest real surface point.
 * @type {Record<string, { x: number, y: number, z: number }>}
 */
export const BODY_REGION_COORDINATES = {
  [BodyRegion.HEAD]: { x: 0, y: 19, z: 1 },
  [BodyRegion.NECK]: { x: 0, y: 17.5, z: 1 },
  [BodyRegion.CHEST]: { x: 0, y: 14, z: 1.5 },
  [BodyRegion.BACK]: { x: 0, y: 14, z: -1.5 },
  [BodyRegion.ABDOMEN]: { x: 0, y: 11, z: 1.3 },
  [BodyRegion.LEFT_ARM]: { x: -4, y: 14, z: 0 },
  [BodyRegion.RIGHT_ARM]: { x: 4, y: 14, z: 0 },
  [BodyRegion.LEFT_LEG]: { x: -1.5, y: 5, z: 1 },
  [BodyRegion.RIGHT_LEG]: { x: 1.5, y: 5, z: 1 },
  [BodyRegion.LEFT_HAND]: { x: -5, y: 12, z: 0 },
  [BodyRegion.RIGHT_HAND]: { x: 5, y: 12, z: 0 },
  [BodyRegion.LEFT_FOOT]: { x: -1, y: 0.5, z: 1 },
  [BodyRegion.RIGHT_FOOT]: { x: 1, y: 0.5, z: 1 },
};
