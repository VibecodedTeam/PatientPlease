import * as THREE from 'three';

/**
 * Casts a ray from `camera` through normalized device coordinates `ndc` and
 * returns the nearest intersected mesh among `dots`, or null if none is hit.
 * @param {{ x: number, y: number }} ndc
 * @param {import('three').Camera} camera
 * @param {import('three').Object3D[]} dots
 * @param {import('three').Raycaster} [raycaster]
 * @returns {import('three').Mesh | null}
 */
export function pickDot(ndc, camera, dots, raycaster = new THREE.Raycaster()) {
  raycaster.setFromCamera(ndc, camera);
  const intersections = raycaster.intersectObjects(dots, false);
  return intersections.length > 0 ? intersections[0].object : null;
}
