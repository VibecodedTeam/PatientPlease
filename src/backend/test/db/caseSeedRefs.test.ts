import { resolveCaseSeedRefs } from '../../src/db/caseSeedRefs.js';
import type { RealCaseSeed } from '../../src/db/data/realCases.js';

const baseCase: RealCaseSeed = {
  patientName: 'Test Patient',
  age: 40,
  sex: 'FEMALE',
  occupation: null,
  bodyRegion: 'LEFT_ARM',
  imageFile: 'case-00.jpg',
  examinationSku: 'exam-punch-biopsy',
  examinationFindings: 'Biopsy findings.',
  documents: [],
  diagnosisCode: 'melanoma',
  treatmentCode: 'surgical-excision',
  difficulty: 2,
  resultExplanationText: 'Explanation.',
  sourceNote: null,
};

const catalogs = {
  diagnoses: [{ id: 'diag-1', code: 'melanoma' }],
  treatments: [{ id: 'treat-1', code: 'surgical-excision' }],
  shopItems: [{ id: 'shop-1', sku: 'exam-punch-biopsy' }],
};

describe('resolveCaseSeedRefs', () => {
  it('resolves diagnosis, treatment, and examination IDs by code/sku', () => {
    const result = resolveCaseSeedRefs(baseCase, catalogs);
    expect(result).toEqual({
      diagnosisId: 'diag-1',
      treatmentId: 'treat-1',
      examinationShopItemId: 'shop-1',
    });
  });

  it('resolves a null treatmentCode to a null treatmentId', () => {
    const result = resolveCaseSeedRefs({ ...baseCase, treatmentCode: null }, catalogs);
    expect(result.treatmentId).toBeNull();
  });

  it('throws a clear error when diagnosisCode has no match', () => {
    expect(() =>
      resolveCaseSeedRefs({ ...baseCase, diagnosisCode: 'not-a-real-code' }, catalogs),
    ).toThrow('Unknown diagnosisCode "not-a-real-code" for patient "Test Patient"');
  });

  it('throws a clear error when treatmentCode has no match', () => {
    expect(() =>
      resolveCaseSeedRefs({ ...baseCase, treatmentCode: 'not-a-real-code' }, catalogs),
    ).toThrow('Unknown treatmentCode "not-a-real-code" for patient "Test Patient"');
  });

  it('throws a clear error when examinationSku has no match', () => {
    expect(() =>
      resolveCaseSeedRefs({ ...baseCase, examinationSku: 'not-a-real-sku' }, catalogs),
    ).toThrow('Unknown examinationSku "not-a-real-sku" for patient "Test Patient"');
  });
});
