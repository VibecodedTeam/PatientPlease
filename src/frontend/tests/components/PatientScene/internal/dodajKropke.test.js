import * as THREE from 'three';
import { dodajKropke } from '../../../../components/PatientScene/internal/dodajKropke';

describe('dodajKropke', () => {
  it('adds a sphere mesh as a child of glownyModel, snapped onto its surface', () => {
    const glownyModel = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2));
    glownyModel.add(mesh);

    const dot = dodajKropke(glownyModel, 0, 5, 0, 0x00ff00);

    expect(glownyModel.children).toContain(dot);
    expect(dot.isMesh).toBe(true);
    expect(dot.geometry.type).toBe('SphereGeometry');
    expect(dot.material.color.getHex()).toBe(0x00ff00);
    expect(dot.userData.isKropka).toBe(true);
    expect(dot.position.y).toBeCloseTo(1, 5);
    expect(dot.position.x).toBeCloseTo(0, 5);
    expect(dot.position.z).toBeCloseTo(0, 5);
  });

  it('sizes the dot from the local (unscaled) geometry, not the parent-scaled world size', () => {
    // A scaled-down parent must not shrink the dot's own local radius: since the dot
    // is a child of glownyModel, its geometry radius is *also* multiplied by
    // glownyModel.scale at render time. Sizing from the world-space (already-scaled)
    // bounding box would apply that scale twice, shrinking dots to invisible specks.
    const unscaled = new THREE.Group();
    unscaled.add(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2)));
    const unscaledDot = dodajKropke(unscaled, 0, 5, 0, 0x00ff00);

    const scaledDown = new THREE.Group();
    scaledDown.add(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2)));
    scaledDown.scale.set(0.1, 0.1, 0.1);
    const scaledDot = dodajKropke(scaledDown, 0, 5, 0, 0x00ff00);

    expect(scaledDot.geometry.parameters.radius).toBeCloseTo(unscaledDot.geometry.parameters.radius, 5);
  });

  it('falls back to the raw coordinates when glownyModel has no mesh', () => {
    const glownyModel = new THREE.Group();

    const dot = dodajKropke(glownyModel, 1, 2, 3, 'red');

    expect(glownyModel.children).toContain(dot);
    expect(dot.position.x).toBe(1);
    expect(dot.position.y).toBe(2);
    expect(dot.position.z).toBe(3);
  });
});
