import type { RealCaseSeed } from './data/realCases.js';

export type CaseSeedCatalogs = {
  diagnoses: Array<{ id: string; code: string }>;
  treatments: Array<{ id: string; code: string }>;
  shopItems: Array<{ id: string; sku: string }>;
};

export type ResolvedCaseSeedRefs = {
  diagnosisId: string;
  treatmentId: string | null;
  examinationShopItemId: string;
};

export function resolveCaseSeedRefs(
  realCase: RealCaseSeed,
  catalogs: CaseSeedCatalogs,
): ResolvedCaseSeedRefs {
  const diagnosis = catalogs.diagnoses.find((d) => d.code === realCase.diagnosisCode);
  if (!diagnosis) {
    throw new Error(
      `Unknown diagnosisCode "${realCase.diagnosisCode}" for patient "${realCase.patientName}"`,
    );
  }

  let treatmentId: string | null = null;
  if (realCase.treatmentCode !== null) {
    const treatment = catalogs.treatments.find((t) => t.code === realCase.treatmentCode);
    if (!treatment) {
      throw new Error(
        `Unknown treatmentCode "${realCase.treatmentCode}" for patient "${realCase.patientName}"`,
      );
    }
    treatmentId = treatment.id;
  }

  const examinationItem = catalogs.shopItems.find((item) => item.sku === realCase.examinationSku);
  if (!examinationItem) {
    throw new Error(
      `Unknown examinationSku "${realCase.examinationSku}" for patient "${realCase.patientName}"`,
    );
  }

  return {
    diagnosisId: diagnosis.id,
    treatmentId,
    examinationShopItemId: examinationItem.id,
  };
}
