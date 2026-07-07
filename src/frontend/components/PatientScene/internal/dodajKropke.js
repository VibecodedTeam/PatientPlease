import * as THREE from 'three';
import { closestSurfacePoint } from './closestSurfacePoint';

const DOT_RADIUS_RATIO = 0.015;

/**
 * Diagonal of the union of every mesh's own LOCAL geometry bounding box under `root`
 * (i.e. ignoring root's own transform). The dot mesh is added as root's child, so its
 * geometry radius is itself multiplied by root's scale at render time - sizing from
 * root's world-space (already-scaled) bounding box would apply that scale twice.
 * @param {import('three').Object3D} root
 * @returns {number}
 */
function localBoundingDiagonal(root) {
  const box = new THREE.Box3();
  let hasMesh = false;
  root.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    child.geometry.computeBoundingBox();
    box.union(child.geometry.boundingBox);
    hasMesh = true;
  });
  return hasMesh && !box.isEmpty() ? box.getSize(new THREE.Vector3()).length() : 1;
}

/**
 * Adds a small colored sphere ("kropka") as a child of glownyModel, snapped onto
 * the nearest point on glownyModel's own mesh surface to the requested (x, y, z).
 * Falls back to the raw (x, y, z) if glownyModel contains no mesh.
 * @param {import('three').Object3D} glownyModel
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {number|string} kolor - THREE.Color-compatible value
 * @returns {import('three').Mesh} the created dot mesh, already added as a child of glownyModel
 */
export function dodajKropke(glownyModel, x, y, z, kolor) {
  const requested = new THREE.Vector3(x, y, z);
  const closest = closestSurfacePoint(glownyModel, requested);
  const position = closest ? closest.point : requested;
  const radius = localBoundingDiagonal(glownyModel) * DOT_RADIUS_RATIO;

  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 12, 8),
    new THREE.MeshBasicMaterial({ color: kolor })
  );
  dot.position.copy(position);
  dot.userData.isKropka = true;

  glownyModel.add(dot);
  return dot;
}
