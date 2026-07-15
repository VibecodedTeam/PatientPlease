import { FICTIONAL_CASES } from '../../src/db/data/fictionalCases.js';
import { REAL_CASES } from '../../src/db/data/realCases.js';
import { DIAGNOSES, TREATMENTS, SHOP_ITEMS } from '../../src/db/seed.js';

const diagnosisByCode = new Map(DIAGNOSES.map((d) => [d.code, d]));
const treatmentCodes = new Set(TREATMENTS.map((t) => t.code));
const examinationSkus = new Set(
  SHOP_ITEMS.filter((item) => item.itemType === 'EXAMINATION').map((item) => item.sku),
);
const SUPPORTING_TYPES = new Set([
  'DISEASE_HISTORY',
  'UV_EXPOSURE_HISTORY',
  'CLINICAL_SYMPTOMS',
  'FAMILY_HISTORY',
  'WEATHER_HISTORY',
]);

describe('FICTIONAL_CASES', () => {
  it('has exactly 30 cases', () => {
    expect(FICTIONAL_CASES.length).toBe(30);
  });

  it('maps every diagnosisCode to a real catalog entry', () => {
    for (const fictionalCase of FICTIONAL_CASES) {
      expect(diagnosisByCode.has(fictionalCase.diagnosisCode)).toBe(true);
    }
  });

  it('maps every non-null treatmentCode to a real catalog entry', () => {
    for (const fictionalCase of FICTIONAL_CASES) {
      if (fictionalCase.treatmentCode !== null) {
        expect(treatmentCodes.has(fictionalCase.treatmentCode)).toBe(true);
      }
    }
  });

  it('maps every examinationSku to a real EXAMINATION shop item', () => {
    for (const fictionalCase of FICTIONAL_CASES) {
      expect(examinationSkus.has(fictionalCase.examinationSku)).toBe(true);
    }
  });

  it('only uses supporting document types, never SKIN_IMAGE or EXAMINATION_RESULTS', () => {
    for (const fictionalCase of FICTIONAL_CASES) {
      for (const document of fictionalCase.documents) {
        expect(SUPPORTING_TYPES.has(document.type)).toBe(true);
      }
    }
  });

  it('every case carries a sourceNote disclosing its fictional origin', () => {
    for (const fictionalCase of FICTIONAL_CASES) {
      expect(fictionalCase.sourceNote).not.toBeNull();
    }
  });

  it('uses a unique imageFile per case, not overlapping REAL_CASES', () => {
    const imageFiles = FICTIONAL_CASES.map((c) => c.imageFile);
    expect(new Set(imageFiles).size).toBe(imageFiles.length);

    const realImageFiles = new Set(REAL_CASES.map((c) => c.imageFile));
    for (const imageFile of imageFiles) {
      expect(realImageFiles.has(imageFile)).toBe(false);
    }
  });

  it('covers at least 15 diagnosis codes not otherwise used by REAL_CASES', () => {
    const realCodes = new Set(REAL_CASES.map((c) => c.diagnosisCode));
    const newlyCoveredCodes = new Set(
      FICTIONAL_CASES.map((c) => c.diagnosisCode).filter((code) => !realCodes.has(code)),
    );
    expect(newlyCoveredCodes.size).toBeGreaterThanOrEqual(15);
  });
});
