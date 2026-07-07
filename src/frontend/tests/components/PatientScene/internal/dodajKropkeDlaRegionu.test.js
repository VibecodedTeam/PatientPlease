import * as THREE from 'three';
import { dodajKropkeDlaRegionu } from '../../../../components/PatientScene/internal/dodajKropkeDlaRegionu';
import { BodyRegion } from '../../../../components/PatientScene/internal/bodyRegions';

describe('dodajKropkeDlaRegionu', () => {
  function makeModel() {
    const model = new THREE.Group();
    model.add(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2)));
    return model;
  }

  it.each(Object.values(BodyRegion))('adds a dot tagged with BodyRegion.%s', (region) => {
    const model = makeModel();

    const dot = dodajKropkeDlaRegionu(model, region, 0xffff00);

    expect(model.children).toContain(dot);
    expect(dot.userData.isKropka).toBe(true);
    expect(dot.userData.bodyRegion).toBe(region);
  });

  it('throws for an unknown body region', () => {
    const model = makeModel();

    expect(() => dodajKropkeDlaRegionu(model, 'NOT_A_REGION', 0xffff00)).toThrow(
      'Unknown BodyRegion: NOT_A_REGION'
    );
  });
});
