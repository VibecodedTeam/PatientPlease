import * as THREE from 'three';

const scratchTriangle = new THREE.Triangle();
const scratchPoint = new THREE.Vector3();
const scratchA = new THREE.Vector3();
const scratchB = new THREE.Vector3();
const scratchC = new THREE.Vector3();
const scratchPointInMeshLocal = new THREE.Vector3();

/**
 * Finds the closest point on the surface of any Mesh found by traversing `root`,
 * to a given `point` in `root`'s local coordinate space, by brute-force iterating
 * every triangle of every mesh's geometry. No BVH/acceleration structure — a plain
 * O(triangle count) scan, which is fine for a one-off placement call.
 * @param {import('three').Object3D} root
 * @param {import('three').Vector3} point - target point, in root's local space
 * @returns {{ point: import('three').Vector3, mesh: import('three').Mesh, distanceSq: number } | null}
 */
export function closestSurfacePoint(root, point) {
  root.updateMatrixWorld(true);

  let closestPoint = null;
  let closestMesh = null;
  let closestDistanceSq = Infinity;

  root.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;

    const pointInMeshLocal = scratchPointInMeshLocal
      .copy(point)
      .applyMatrix4(root.matrixWorld)
      .applyMatrix4(child.matrixWorld.clone().invert());

    const geometry = child.geometry;
    const position = geometry.attributes.position;
    const index = geometry.index;
    const triangleCount = index ? index.count / 3 : position.count / 3;

    for (let i = 0; i < triangleCount; i += 1) {
      const ia = index ? index.getX(i * 3) : i * 3;
      const ib = index ? index.getX(i * 3 + 1) : i * 3 + 1;
      const ic = index ? index.getX(i * 3 + 2) : i * 3 + 2;

      scratchA.fromBufferAttribute(position, ia);
      scratchB.fromBufferAttribute(position, ib);
      scratchC.fromBufferAttribute(position, ic);
      scratchTriangle.set(scratchA, scratchB, scratchC);
      scratchTriangle.closestPointToPoint(pointInMeshLocal, scratchPoint);

      const distanceSq = scratchPoint.distanceToSquared(pointInMeshLocal);
      if (distanceSq < closestDistanceSq) {
        closestDistanceSq = distanceSq;
        closestMesh = child;
        closestPoint = scratchPoint.clone();
      }
    }
  });

  if (!closestMesh) return null;

  const closestPointInRootLocal = closestPoint
    .applyMatrix4(closestMesh.matrixWorld)
    .applyMatrix4(root.matrixWorld.clone().invert());

  return { point: closestPointInRootLocal, mesh: closestMesh, distanceSq: closestDistanceSq };
}
