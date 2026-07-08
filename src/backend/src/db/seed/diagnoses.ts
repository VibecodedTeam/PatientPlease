import { seedId } from './ids.js';
import type { DiagnosisSeedRow, SeedPrismaClient } from './types.js';

/** Illustrative game content, not vetted clinical curriculum — see docs/architecture/0007. */
export const DIAGNOSES: DiagnosisSeedRow[] = [
  {
    id: seedId('01', 1),
    code: 'MELANOMA',
    name: 'Melanoma',
    category: 'MALIGNANT',
    description:
      'A malignant tumor of melanocytes; the deadliest common skin cancer if not caught early.',
  },
  {
    id: seedId('01', 2),
    code: 'BASAL_CELL_CARCINOMA',
    name: 'Basal Cell Carcinoma',
    category: 'MALIGNANT',
    description:
      'The most common skin cancer; slow-growing, rarely metastasizes, often on sun-exposed skin.',
  },
  {
    id: seedId('01', 3),
    code: 'SQUAMOUS_CELL_CARCINOMA',
    name: 'Squamous Cell Carcinoma',
    category: 'MALIGNANT',
    description: 'A keratinocyte cancer that can invade locally and, less commonly, metastasize.',
  },
  {
    id: seedId('01', 4),
    code: 'MERKEL_CELL_CARCINOMA',
    name: 'Merkel Cell Carcinoma',
    category: 'MALIGNANT',
    description:
      'A rare, aggressive neuroendocrine skin cancer most common in older, fair-skinned patients.',
  },
  {
    id: seedId('01', 5),
    code: 'SEBORRHEIC_KERATOSIS',
    name: 'Seborrheic Keratosis',
    category: 'BENIGN',
    description: 'A common benign, stuck-on-looking warty growth that increases with age.',
  },
  {
    id: seedId('01', 6),
    code: 'DERMATOFIBROMA',
    name: 'Dermatofibroma',
    category: 'BENIGN',
    description: 'A firm, benign fibrous nodule, often on the legs, that dimples when pinched.',
  },
  {
    id: seedId('01', 7),
    code: 'CHERRY_ANGIOMA',
    name: 'Cherry Angioma',
    category: 'BENIGN',
    description:
      'A common benign proliferation of small blood vessels, appearing as a bright red papule.',
  },
  {
    id: seedId('01', 8),
    code: 'BENIGN_MELANOCYTIC_NEVUS',
    name: 'Benign Melanocytic Nevus',
    category: 'BENIGN',
    description: 'An ordinary mole; stable in size/shape/color over years, unlike a melanoma.',
  },
  {
    id: seedId('01', 9),
    code: 'ATOPIC_DERMATITIS',
    name: 'Atopic Dermatitis (Eczema)',
    category: 'INFLAMMATORY',
    description: 'A chronic, relapsing itchy inflammatory condition, often starting in childhood.',
  },
  {
    id: seedId('01', 10),
    code: 'PSORIASIS',
    name: 'Psoriasis',
    category: 'INFLAMMATORY',
    description: 'An autoimmune condition causing well-demarcated, scaly, erythematous plaques.',
  },
  {
    id: seedId('01', 11),
    code: 'CONTACT_DERMATITIS',
    name: 'Contact Dermatitis',
    category: 'INFLAMMATORY',
    description: 'Inflammation from direct skin contact with an irritant or allergen.',
  },
  {
    id: seedId('01', 12),
    code: 'SEBORRHEIC_DERMATITIS',
    name: 'Seborrheic Dermatitis',
    category: 'INFLAMMATORY',
    description:
      'A chronic inflammatory condition causing greasy scale in sebaceous-gland-rich areas.',
  },
  {
    id: seedId('01', 13),
    code: 'TINEA_CORPORIS',
    name: 'Tinea Corporis (Ringworm)',
    category: 'INFECTIOUS',
    description:
      'A superficial fungal infection presenting as an annular, scaly, expanding plaque.',
  },
  {
    id: seedId('01', 14),
    code: 'IMPETIGO',
    name: 'Impetigo',
    category: 'INFECTIOUS',
    description: 'A contagious bacterial skin infection causing honey-colored crusted lesions.',
  },
  {
    id: seedId('01', 15),
    code: 'CELLULITIS',
    name: 'Cellulitis',
    category: 'INFECTIOUS',
    description:
      'A bacterial infection of the deeper dermis/subcutaneous tissue causing spreading erythema.',
  },
  {
    id: seedId('01', 16),
    code: 'MOLLUSCUM_CONTAGIOSUM',
    name: 'Molluscum Contagiosum',
    category: 'INFECTIOUS',
    description: 'A viral skin infection causing small, firm, umbilicated papules.',
  },
  {
    id: seedId('01', 17),
    code: 'VITILIGO',
    name: 'Vitiligo',
    category: 'OTHER',
    description: 'An autoimmune loss of melanocytes causing well-demarcated depigmented patches.',
  },
  {
    id: seedId('01', 18),
    code: 'ACTINIC_KERATOSIS',
    name: 'Actinic Keratosis',
    category: 'OTHER',
    description:
      'A rough, sun-damage-related precancerous patch with a small risk of progressing to SCC.',
  },
  {
    id: seedId('01', 19),
    code: 'URTICARIA',
    name: 'Urticaria (Hives)',
    category: 'OTHER',
    description: 'Transient, itchy raised wheals from histamine release, often allergic in origin.',
  },
  {
    id: seedId('01', 20),
    code: 'ALOPECIA_AREATA',
    name: 'Alopecia Areata',
    category: 'OTHER',
    description: 'An autoimmune condition causing sudden, well-circumscribed patches of hair loss.',
  },
];

export async function seedDiagnoses(prisma: SeedPrismaClient): Promise<void> {
  for (const diagnosis of DIAGNOSES) {
    const { id, ...update } = diagnosis;
    await prisma.diagnosis.upsert({ where: { id }, update, create: diagnosis });
  }
}
