import { BodyRegion, BODY_REGION_COORDINATES } from '../../../../components/PatientScene/internal/bodyRegions';

describe('bodyRegions', () => {
  it('has a BODY_REGION_COORDINATES entry for every BodyRegion value', () => {
    Object.values(BodyRegion).forEach((region) => {
      expect(BODY_REGION_COORDINATES[region]).toBeDefined();
    });
  });
});
