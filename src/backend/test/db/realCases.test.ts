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

describe('REAL_CASES', () => {
  it('has at least 20 cases', () => {
    expect(REAL_CASES.length).toBeGreaterThanOrEqual(20);
  });

  it('maps every diagnosisCode to a real catalog entry', () => {
    for (const realCase of REAL_CASES) {
      expect(diagnosisByCode.has(realCase.diagnosisCode)).toBe(true);
    }
  });

  it('maps every non-null treatmentCode to a real catalog entry', () => {
    for (const realCase of REAL_CASES) {
      if (realCase.treatmentCode !== null) {
        expect(treatmentCodes.has(realCase.treatmentCode)).toBe(true);
      }
    }
  });

  it('maps every examinationSku to a real EXAMINATION shop item', () => {
    for (const realCase of REAL_CASES) {
      expect(examinationSkus.has(realCase.examinationSku)).toBe(true);
    }
  });

  it('only uses supporting document types, never SKIN_IMAGE or EXAMINATION_RESULTS', () => {
    for (const realCase of REAL_CASES) {
      for (const document of realCase.documents) {
        expect(SUPPORTING_TYPES.has(document.type)).toBe(true);
      }
    }
  });

  it('uses a unique imageFile per case', () => {
    const imageFiles = REAL_CASES.map((c) => c.imageFile);
    expect(new Set(imageFiles).size).toBe(imageFiles.length);
  });

  it('represents both cancer and non-cancer diagnosis categories', () => {
    const categories = new Set(
      REAL_CASES.map((c) => diagnosisByCode.get(c.diagnosisCode)?.category),
    );
    expect(categories.has('MALIGNANT')).toBe(true);
    const hasNonMalignant = [...categories].some((category) => category !== 'MALIGNANT');
    expect(hasNonMalignant).toBe(true);
  });

  it('carries a sourceNote only for the 6 cases with a generated/inferred diagnosis, null for every other case', () => {
    const casesWithSourceNote = REAL_CASES.filter((c) => c.sourceNote !== null).map(
      (c) => c.patientName,
    );
    expect(new Set(casesWithSourceNote)).toEqual(
      new Set([
        'Józef Baran',
        'Kacper Sobczak',
        'Alicja Cisek',
        'Klementyna Wróbel',
        'Ryszard Wolski',
        'Paulina Górecka',
      ]),
    );
  });
});
