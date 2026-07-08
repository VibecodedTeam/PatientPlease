import { seedId } from './ids.js';
import type { SeedPrismaClient, TreatmentSeedRow } from './types.js';

/** Illustrative game content, not vetted clinical curriculum — see docs/architecture/0007. */
export const TREATMENTS: TreatmentSeedRow[] = [
  {
    id: seedId('02', 1),
    code: 'TOPICAL_CORTICOSTEROID',
    name: 'Topical Corticosteroid',
    kind: 'TOPICAL',
    description:
      'An anti-inflammatory cream/ointment for eczema, psoriasis, and contact dermatitis flares.',
  },
  {
    id: seedId('02', 2),
    code: 'TOPICAL_ANTIFUNGAL',
    name: 'Topical Antifungal',
    kind: 'TOPICAL',
    description: 'An antifungal cream for superficial infections such as tinea corporis.',
  },
  {
    id: seedId('02', 3),
    code: 'TOPICAL_RETINOID',
    name: 'Topical Retinoid',
    kind: 'TOPICAL',
    description:
      'A vitamin-A-derived cream used for actinic keratosis and some acneiform conditions.',
  },
  {
    id: seedId('02', 4),
    code: 'TOPICAL_ANTIBIOTIC',
    name: 'Topical Antibiotic',
    kind: 'TOPICAL',
    description: 'A topical antibiotic ointment for localized superficial bacterial infections.',
  },
  {
    id: seedId('02', 5),
    code: 'ORAL_ANTIBIOTICS',
    name: 'Oral Antibiotics',
    kind: 'ORAL_MEDICATION',
    description:
      'Systemic antibiotics for infections that have spread beyond the skin surface, e.g. cellulitis.',
  },
  {
    id: seedId('02', 6),
    code: 'ORAL_ANTIHISTAMINE',
    name: 'Oral Antihistamine',
    kind: 'ORAL_MEDICATION',
    description: 'Reduces itching and wheals in urticaria and other histamine-driven reactions.',
  },
  {
    id: seedId('02', 7),
    code: 'ORAL_ANTIFUNGAL',
    name: 'Oral Antifungal',
    kind: 'ORAL_MEDICATION',
    description: 'Systemic antifungal medication for widespread or resistant fungal infections.',
  },
  {
    id: seedId('02', 8),
    code: 'EXCISIONAL_BIOPSY',
    name: 'Excisional Biopsy',
    kind: 'PROCEDURE',
    description:
      'Surgical removal of a lesion with a margin of healthy tissue, both diagnostic and curative.',
  },
  {
    id: seedId('02', 9),
    code: 'CRYOTHERAPY',
    name: 'Cryotherapy',
    kind: 'PROCEDURE',
    description: 'Freezing a lesion with liquid nitrogen, commonly used for actinic keratosis.',
  },
  {
    id: seedId('02', 10),
    code: 'CURETTAGE_AND_ELECTRODESICCATION',
    name: 'Curettage and Electrodesiccation',
    kind: 'PROCEDURE',
    description:
      'Scraping away a lesion and cauterizing the base, common for low-risk basal cell carcinoma.',
  },
  {
    id: seedId('02', 11),
    code: 'MOHS_MICROGRAPHIC_SURGERY',
    name: 'Mohs Micrographic Surgery',
    kind: 'PROCEDURE',
    description: 'Staged excision with immediate margin mapping, used for high-risk skin cancers.',
  },
  {
    id: seedId('02', 12),
    code: 'REFER_ONCOLOGY',
    name: 'Refer to Oncology',
    kind: 'REFERRAL',
    description:
      'Refers the patient to oncology for staging and management of a malignant diagnosis.',
  },
  {
    id: seedId('02', 13),
    code: 'REFER_DERMATOLOGY',
    name: 'Refer to Dermatology',
    kind: 'REFERRAL',
    description: 'Refers the patient to a dermatologist for specialist assessment.',
  },
  {
    id: seedId('02', 14),
    code: 'REFER_ALLERGY_IMMUNOLOGY',
    name: 'Refer to Allergy/Immunology',
    kind: 'REFERRAL',
    description:
      'Refers the patient for allergy/immunology work-up of a suspected allergic trigger.',
  },
  {
    id: seedId('02', 15),
    code: 'WATCHFUL_WAITING',
    name: 'Watchful Waiting',
    kind: 'MONITORING',
    description: 'No active intervention now; re-assess at a scheduled follow-up for any change.',
  },
  {
    id: seedId('02', 16),
    code: 'ROUTINE_SKIN_SELF_EXAM',
    name: 'Routine Skin Self-Exam',
    kind: 'MONITORING',
    description: 'Patient education on monthly self-examination to catch future changes early.',
  },
  {
    id: seedId('02', 17),
    code: 'SCHEDULED_FOLLOWUP_PHOTOGRAPHY',
    name: 'Scheduled Follow-Up Photography',
    kind: 'MONITORING',
    description: 'Serial photography of a lesion to objectively track change over time.',
  },
  {
    id: seedId('02', 18),
    code: 'NO_TREATMENT_NECESSARY',
    name: 'No Treatment Necessary',
    kind: 'NONE',
    description: 'The finding is benign and stable; no treatment is indicated.',
  },
  {
    id: seedId('02', 19),
    code: 'REASSURANCE_ONLY',
    name: 'Reassurance Only',
    kind: 'NONE',
    description: 'Patient counseling and reassurance, with no medical intervention needed.',
  },
  {
    id: seedId('02', 20),
    code: 'COSMETIC_ONLY_OPTIONAL',
    name: 'Cosmetic Only (Optional)',
    kind: 'NONE',
    description: 'Purely optional cosmetic removal; medically unnecessary.',
  },
];

export async function seedTreatments(prisma: SeedPrismaClient): Promise<void> {
  for (const treatment of TREATMENTS) {
    const { id, ...update } = treatment;
    await prisma.treatment.upsert({ where: { id }, update, create: treatment });
  }
}
