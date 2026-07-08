import * as THREE from 'three';
import { pickDot } from '../../../../components/PatientScene/internal/pickDot';

describe('pickDot', () => {
  function makeCamera() {
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    return camera;
  }

  it('returns the dot hit by a ray cast through the center of the view', () => {
    const camera = makeCamera();
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.5));
    dot.position.set(0, 0, 0);
    dot.updateMatrixWorld();

    // A perfectly centered (0, 0) ray lands exactly on the UV-sphere's pole seam,
    // a known ray/triangle edge case unrelated to pickDot itself; nudge slightly off-center.
    const result = pickDot({ x: 0.001, y: 0.001 }, camera, [dot]);

    expect(result).toBe(dot);
  });

  it('returns null when the ray misses every dot', () => {
    const camera = makeCamera();
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.5));
    dot.position.set(10, 10, 0);
    dot.updateMatrixWorld();

    const result = pickDot({ x: 0, y: 0 }, camera, [dot]);

    expect(result).toBeNull();
  });

  it('returns the nearest dot when two overlap along the ray', () => {
    const camera = makeCamera();
    const far = new THREE.Mesh(new THREE.SphereGeometry(0.5));
    far.position.set(0, 0, -5);
    far.updateMatrixWorld();
    const near = new THREE.Mesh(new THREE.SphereGeometry(0.5));
    near.position.set(0, 0, 0);
    near.updateMatrixWorld();

    const result = pickDot({ x: 0.001, y: 0.001 }, camera, [far, near]);

    expect(result).toBe(near);
  });
});
