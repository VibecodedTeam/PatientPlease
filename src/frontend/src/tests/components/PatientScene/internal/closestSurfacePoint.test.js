import * as THREE from 'three';
import { closestSurfacePoint } from '../../../../components/PatientScene/internal/closestSurfacePoint';

describe('closestSurfacePoint', () => {
  it('returns null when root has no mesh', () => {
    const root = new THREE.Group();
    expect(closestSurfacePoint(root, new THREE.Vector3(0, 0, 0))).toBeNull();
  });

  it('snaps a point above a face onto that face', () => {
    const root = new THREE.Group();
    // 2x2x2 box centered at the origin: faces at x/y/z = +-1.
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2));
    root.add(mesh);

    const result = closestSurfacePoint(root, new THREE.Vector3(0, 5, 0));

    expect(result).not.toBeNull();
    expect(result.mesh).toBe(mesh);
    expect(result.point.y).toBeCloseTo(1, 5);
    expect(result.point.x).toBeCloseTo(0, 5);
    expect(result.point.z).toBeCloseTo(0, 5);
  });

  it('returns ~the same point when it is already on the surface', () => {
    const root = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2));
    root.add(mesh);

    const onSurface = new THREE.Vector3(1, 0, 0);
    const result = closestSurfacePoint(root, onSurface);

    expect(result.distanceSq).toBeCloseTo(0, 5);
    expect(result.point.x).toBeCloseTo(1, 5);
  });
});
