import { seedId } from './ids.js';
import { DIAGNOSES } from './diagnoses.js';
import { TREATMENTS } from './treatments.js';
import { SHOP_ITEMS } from './shopItems.js';
import type {
  BodyRegionValue,
  CaseDocumentSeedRow,
  CaseDocumentTypeValue,
  CaseHintSeedRow,
  CaseSeedRow,
  PatientSeedRow,
  SeedJsonValue,
  SeedPrismaClient,
  SexValue,
} from './types.js';

function diagnosisId(code: string): string {
  const row = DIAGNOSES.find((d) => d.code === code);
  if (!row) throw new Error(`Unknown seed diagnosis code: ${code}`);
  return row.id;
}

function treatmentId(code: string): string {
  const row = TREATMENTS.find((t) => t.code === code);
  if (!row) throw new Error(`Unknown seed treatment code: ${code}`);
  return row.id;
}

function shopItemId(sku: string): string {
  const row = SHOP_ITEMS.find((s) => s.sku === sku);
  if (!row) throw new Error(`Unknown seed shop item sku: ${sku}`);
  return row.id;
}

interface CaseInput {
  patient: {
    name: string;
    age: number;
    sex: SexValue;
    occupation: string | null;
    bodyModelVariant: string;
  };
  diagnosisCode: string;
  treatmentCode: string;
  difficulty: number;
  resultExplanationText: string;
  bodyRegion: BodyRegionValue;
  skinImageTitle: string;
  skinImageAlt: string;
  historyDocument: {
    type: CaseDocumentTypeValue;
    title: string;
    content: { [key: string]: SeedJsonValue };
  };
  symptoms?: { name: string; duration: string }[];
  hint: { content: string; requiredShopItemSku?: string; unlockAfterDay?: number };
}

/** Illustrative game content, not vetted clinical curriculum — see docs/architecture/0007. */
const CASE_INPUTS: CaseInput[] = [
  {
    patient: {
      name: 'Jan Kowalski',
      age: 52,
      sex: 'MALE',
      occupation: 'Roofer',
      bodyModelVariant: 'male_average_01',
    },
    diagnosisCode: 'MELANOMA',
    treatmentCode: 'REFER_ONCOLOGY',
    difficulty: 4,
    resultExplanationText:
      'Asymmetric, irregularly bordered, multi-colored, changing lesion on chronically sun-exposed skin — classic melanoma warning signs (ABCDE).',
    bodyRegion: 'LEFT_ARM',
    skinImageTitle: 'Left shoulder — day 1',
    skinImageAlt: 'Asymmetric brown-black lesion with irregular border, ~9mm',
    historyDocument: {
      type: 'UV_EXPOSURE_HISTORY',
      title: 'Sun exposure history',
      content: {
        sunbedUse: 'never',
        occupationalExposure: 'high',
        sunburnHistory: '3 severe sunburns before age 20',
      },
    },
    hint: {
      content: 'A mole that has changed shape or color over months is a key melanoma warning sign.',
      requiredShopItemSku: 'HB-MELANOMA-RECOGNITION-MANUAL',
    },
  },
  {
    patient: {
      name: 'Maria Santos',
      age: 61,
      sex: 'FEMALE',
      occupation: 'Fisherwoman',
      bodyModelVariant: 'female_average_01',
    },
    diagnosisCode: 'BASAL_CELL_CARCINOMA',
    treatmentCode: 'CURETTAGE_AND_ELECTRODESICCATION',
    difficulty: 3,
    resultExplanationText:
      'Pearly, slow-growing nodule with visible surface vessels on sun-exposed skin is typical of basal cell carcinoma.',
    bodyRegion: 'NECK',
    skinImageTitle: 'Neck lesion — day 1',
    skinImageAlt: 'Pearly pink nodule with rolled border and telangiectasia',
    historyDocument: {
      type: 'UV_EXPOSURE_HISTORY',
      title: 'Sun exposure history',
      content: {
        sunbedUse: 'never',
        occupationalExposure: 'high',
        sunburnHistory: 'frequent mild sunburns over decades at sea',
      },
    },
    hint: {
      content:
        'Pearly nodules with visible small blood vessels are a hallmark of basal cell carcinoma.',
    },
  },
  {
    patient: {
      name: 'David Chen',
      age: 58,
      sex: 'MALE',
      occupation: 'Farmer',
      bodyModelVariant: 'male_average_02',
    },
    diagnosisCode: 'SQUAMOUS_CELL_CARCINOMA',
    treatmentCode: 'EXCISIONAL_BIOPSY',
    difficulty: 4,
    resultExplanationText:
      'A firm, scaly, ulcerated papule on chronically sun-damaged skin, in a lifelong outdoor worker, points to squamous cell carcinoma.',
    bodyRegion: 'HEAD',
    skinImageTitle: 'Scalp lesion — day 1',
    skinImageAlt: 'Firm scaly papule with central ulceration',
    historyDocument: {
      type: 'UV_EXPOSURE_HISTORY',
      title: 'Sun exposure history',
      content: {
        sunbedUse: 'never',
        occupationalExposure: 'high',
        sunburnHistory: 'decades of unprotected outdoor work',
      },
    },
    hint: {
      content: 'A non-healing, scaly, ulcerated bump on sun-damaged skin warrants biopsy.',
      requiredShopItemSku: 'EQ-BIOPSY-PUNCH-KIT',
    },
  },
  {
    patient: {
      name: 'Grace Okafor',
      age: 70,
      sex: 'FEMALE',
      occupation: 'Retired Postal Worker',
      bodyModelVariant: 'female_average_02',
    },
    diagnosisCode: 'MERKEL_CELL_CARCINOMA',
    treatmentCode: 'REFER_ONCOLOGY',
    difficulty: 5,
    resultExplanationText:
      'A rapidly growing, painless, violaceous nodule in an elderly patient with heavy sun exposure is characteristic of the rare but aggressive Merkel cell carcinoma.',
    bodyRegion: 'CHEST',
    skinImageTitle: 'Chest lesion — day 1',
    skinImageAlt: 'Rapidly growing violaceous nodule, no tenderness',
    historyDocument: {
      type: 'UV_EXPOSURE_HISTORY',
      title: 'Sun exposure history',
      content: {
        sunbedUse: 'never',
        occupationalExposure: 'moderate',
        sunburnHistory: 'many years of daytime outdoor delivery routes',
      },
    },
    hint: {
      content:
        'Rapid growth of a painless nodule in an older patient should raise suspicion beyond common benign causes.',
    },
  },
  {
    patient: {
      name: 'Tom Reilly',
      age: 45,
      sex: 'MALE',
      occupation: 'Office Worker',
      bodyModelVariant: 'male_average_01',
    },
    diagnosisCode: 'SEBORRHEIC_KERATOSIS',
    treatmentCode: 'REASSURANCE_ONLY',
    difficulty: 1,
    resultExplanationText:
      'A "stuck-on," waxy, well-demarcated brown plaque that has been stable for years is a classic benign seborrheic keratosis.',
    bodyRegion: 'BACK',
    skinImageTitle: 'Back lesion — day 1',
    skinImageAlt: 'Waxy, stuck-on brown plaque, stable appearance',
    historyDocument: {
      type: 'DISEASE_HISTORY',
      title: 'Skin history',
      content: { onsetYearsAgo: 6, changeSinceOnset: 'none reported' },
    },
    hint: {
      content:
        'A "stuck-on" waxy look with no recent change is reassuring for seborrheic keratosis.',
    },
  },
  {
    patient: {
      name: 'Linda Park',
      age: 39,
      sex: 'FEMALE',
      occupation: 'Teacher',
      bodyModelVariant: 'female_average_01',
    },
    diagnosisCode: 'DERMATOFIBROMA',
    treatmentCode: 'NO_TREATMENT_NECESSARY',
    difficulty: 1,
    resultExplanationText:
      'A firm nodule that dimples inward when pinched (the "dimple sign") is characteristic of a benign dermatofibroma.',
    bodyRegion: 'LEFT_LEG',
    skinImageTitle: 'Left shin lesion — day 1',
    skinImageAlt: 'Firm, dimpling brown nodule on the shin',
    historyDocument: {
      type: 'DISEASE_HISTORY',
      title: 'Skin history',
      content: { onsetYearsAgo: 2, priorTrauma: 'possible insect bite at site' },
    },
    hint: {
      content:
        'Pinching the lesion and watching for a central dimple helps confirm dermatofibroma.',
    },
  },
  {
    patient: {
      name: 'Carlos Mendes',
      age: 33,
      sex: 'MALE',
      occupation: 'Chef',
      bodyModelVariant: 'male_average_02',
    },
    diagnosisCode: 'CHERRY_ANGIOMA',
    treatmentCode: 'COSMETIC_ONLY_OPTIONAL',
    difficulty: 1,
    resultExplanationText:
      'A small, bright-red, dome-shaped papule that blanches minimally is a typical benign cherry angioma.',
    bodyRegion: 'ABDOMEN',
    skinImageTitle: 'Abdomen lesion — day 1',
    skinImageAlt: 'Small bright-red dome-shaped papule',
    historyDocument: {
      type: 'DISEASE_HISTORY',
      title: 'Skin history',
      content: { onsetYearsAgo: 1, similarLesionsElsewhere: 'two smaller ones on the chest' },
    },
    hint: {
      content: 'Multiple small bright-red papules appearing with age are usually cherry angiomas.',
    },
  },
  {
    patient: {
      name: 'Aiko Tanaka',
      age: 29,
      sex: 'FEMALE',
      occupation: 'Graphic Designer',
      bodyModelVariant: 'female_average_02',
    },
    diagnosisCode: 'BENIGN_MELANOCYTIC_NEVUS',
    treatmentCode: 'ROUTINE_SKIN_SELF_EXAM',
    difficulty: 1,
    resultExplanationText:
      'A symmetric, evenly colored, stable brown mole with a regular border is a typical benign nevus.',
    bodyRegion: 'RIGHT_ARM',
    skinImageTitle: 'Right forearm lesion — day 1',
    skinImageAlt: 'Symmetric, evenly pigmented small brown mole',
    historyDocument: {
      type: 'DISEASE_HISTORY',
      title: 'Skin history',
      content: { onsetYearsAgo: 15, changeSinceOnset: 'none reported' },
    },
    hint: {
      content:
        'Symmetry, even color, and a regular border are reassuring signs for an ordinary mole.',
      requiredShopItemSku: 'EQ-LESION-RULER',
    },
  },
  {
    patient: {
      name: 'Emily Novak',
      age: 8,
      sex: 'FEMALE',
      occupation: 'Student',
      bodyModelVariant: 'female_child_01',
    },
    diagnosisCode: 'ATOPIC_DERMATITIS',
    treatmentCode: 'TOPICAL_CORTICOSTEROID',
    difficulty: 2,
    resultExplanationText:
      'Chronic, itchy, dry, flexural rash in a child with a family history of atopy is consistent with atopic dermatitis (eczema).',
    bodyRegion: 'LEFT_HAND',
    skinImageTitle: 'Wrist crease — day 1',
    skinImageAlt: 'Dry, scaly, erythematous patch across the wrist crease',
    historyDocument: {
      type: 'FAMILY_HISTORY',
      title: 'Family history',
      content: {
        asthmaInFamily: 'mother',
        allergiesInFamily: 'father has hay fever',
        eczemaInFamily: 'older sibling',
      },
    },
    symptoms: [
      { name: 'Itching', duration: '3 weeks' },
      { name: 'Dry, flaky skin', duration: '2 months' },
    ],
    hint: {
      content: 'Ask about a family history of asthma, allergies, or eczema — the "atopic triad."',
      requiredShopItemSku: 'HB-FIELD-GUIDE-COMMON-RASHES',
    },
  },
  {
    patient: {
      name: 'Robert Kim',
      age: 41,
      sex: 'MALE',
      occupation: 'Truck Driver',
      bodyModelVariant: 'male_average_01',
    },
    diagnosisCode: 'PSORIASIS',
    treatmentCode: 'TOPICAL_CORTICOSTEROID',
    difficulty: 2,
    resultExplanationText:
      'Well-demarcated, silvery-scaled, erythematous plaques on extensor surfaces, with a family history, are typical of psoriasis.',
    bodyRegion: 'RIGHT_LEG',
    skinImageTitle: 'Right shin — day 1',
    skinImageAlt: 'Well-demarcated plaque with silvery scale',
    historyDocument: {
      type: 'FAMILY_HISTORY',
      title: 'Family history',
      content: {
        psoriasisInFamily: 'father',
        autoimmuneConditionsInFamily: 'aunt has rheumatoid arthritis',
      },
    },
    symptoms: [
      { name: 'Scaling plaques', duration: '6 months' },
      { name: 'Itching', duration: '4 months' },
    ],
    hint: {
      content:
        'Silvery scale on a well-demarcated plaque, especially with a family history, suggests psoriasis over eczema.',
    },
  },
  {
    patient: {
      name: 'Sophie Turner',
      age: 27,
      sex: 'FEMALE',
      occupation: 'Hairdresser',
      bodyModelVariant: 'female_average_01',
    },
    diagnosisCode: 'CONTACT_DERMATITIS',
    treatmentCode: 'TOPICAL_CORTICOSTEROID',
    difficulty: 2,
    resultExplanationText:
      'A well-localized, itchy rash matching an occupational exposure pattern (gloves, hair chemicals) points to contact dermatitis.',
    bodyRegion: 'RIGHT_HAND',
    skinImageTitle: 'Right hand — day 1',
    skinImageAlt: 'Erythematous, itchy patch localized to the hand',
    historyDocument: {
      type: 'DISEASE_HISTORY',
      title: 'Skin history',
      content: {
        priorSimilarReactions: 'yes, after switching hair dye brands',
        knownAllergies: 'nickel sensitivity',
      },
    },
    hint: {
      content:
        'A rash confined to areas of glove or chemical contact strongly suggests an irritant or allergic trigger.',
    },
  },
  {
    patient: {
      name: 'Nina Petrov',
      age: 50,
      sex: 'FEMALE',
      occupation: 'Nurse',
      bodyModelVariant: 'female_average_02',
    },
    diagnosisCode: 'SEBORRHEIC_DERMATITIS',
    treatmentCode: 'TOPICAL_ANTIFUNGAL',
    difficulty: 2,
    resultExplanationText:
      'Greasy yellow scale in the scalp and eyebrows, recurring for months, is typical of seborrheic dermatitis.',
    bodyRegion: 'HEAD',
    skinImageTitle: 'Scalp margin — day 1',
    skinImageAlt: 'Greasy yellow scale along the scalp margin',
    historyDocument: {
      type: 'DISEASE_HISTORY',
      title: 'Skin history',
      content: {
        recurrencePattern: 'worse in winter, improves in summer',
        priorTreatmentTried: 'over-the-counter dandruff shampoo, partial relief',
      },
    },
    symptoms: [
      { name: 'Flaking', duration: '5 months' },
      { name: 'Itching', duration: '3 months' },
    ],
    hint: {
      content:
        'Greasy (not dry) scale that waxes and wanes seasonally points toward seborrheic dermatitis.',
    },
  },
  {
    patient: {
      name: 'Ahmed Hassan',
      age: 24,
      sex: 'MALE',
      occupation: 'Gym Instructor',
      bodyModelVariant: 'male_average_02',
    },
    diagnosisCode: 'TINEA_CORPORIS',
    treatmentCode: 'TOPICAL_ANTIFUNGAL',
    difficulty: 2,
    resultExplanationText:
      'An expanding, annular, scaly plaque with central clearing in someone frequently in shared gym/locker environments suggests tinea corporis.',
    bodyRegion: 'CHEST',
    skinImageTitle: 'Chest — day 1',
    skinImageAlt: 'Annular scaly plaque with central clearing',
    historyDocument: {
      type: 'WEATHER_HISTORY',
      title: 'Environmental history',
      content: {
        recentHumidExposure: 'daily gym and sauna use',
        sharedEquipmentContact: 'shared mats and towels',
      },
    },
    symptoms: [
      { name: 'Ring-shaped rash', duration: '2 weeks' },
      { name: 'Mild itching', duration: '2 weeks' },
    ],
    hint: {
      content:
        'A ring-shaped, expanding plaque with central clearing is the classic tinea presentation.',
    },
  },
  {
    patient: {
      name: 'Isabella Rossi',
      age: 6,
      sex: 'FEMALE',
      occupation: 'Student',
      bodyModelVariant: 'female_child_01',
    },
    diagnosisCode: 'IMPETIGO',
    treatmentCode: 'TOPICAL_ANTIBIOTIC',
    difficulty: 1,
    resultExplanationText:
      'Honey-colored crusted sores around the mouth in a young child, common in warm crowded settings like daycare, are classic for impetigo.',
    bodyRegion: 'LEFT_HAND',
    skinImageTitle: 'Hand lesion — day 1',
    skinImageAlt: 'Honey-colored crusted superficial sores',
    historyDocument: {
      type: 'WEATHER_HISTORY',
      title: 'Environmental history',
      content: { season: 'summer', settingExposure: 'attends daycare with a recent outbreak' },
    },
    symptoms: [{ name: 'Honey-crusted sores', duration: '5 days' }],
    hint: { content: 'Honey-colored crust is a very specific clue for impetigo.' },
  },
  {
    patient: {
      name: 'Marcus Webb',
      age: 55,
      sex: 'MALE',
      occupation: 'Construction Worker',
      bodyModelVariant: 'male_average_01',
    },
    diagnosisCode: 'CELLULITIS',
    treatmentCode: 'ORAL_ANTIBIOTICS',
    difficulty: 3,
    resultExplanationText:
      'Rapidly spreading warm, tender erythema with poorly defined borders after a skin break indicates cellulitis, needing systemic antibiotics.',
    bodyRegion: 'RIGHT_LEG',
    skinImageTitle: 'Right lower leg — day 1',
    skinImageAlt: 'Diffuse, poorly-defined warm erythema',
    historyDocument: {
      type: 'WEATHER_HISTORY',
      title: 'Environmental history',
      content: { season: 'summer', recentSkinBreak: 'scraped shin on a job site three days ago' },
    },
    symptoms: [
      { name: 'Spreading redness', duration: '3 days' },
      { name: 'Warmth and swelling', duration: '3 days' },
    ],
    hint: {
      content:
        'Poorly-defined, spreading, warm erythema after a skin break is a red flag for cellulitis, not a simple rash.',
    },
  },
  {
    patient: {
      name: 'Priya Sharma',
      age: 12,
      sex: 'FEMALE',
      occupation: 'Student',
      bodyModelVariant: 'female_child_01',
    },
    diagnosisCode: 'MOLLUSCUM_CONTAGIOSUM',
    treatmentCode: 'WATCHFUL_WAITING',
    difficulty: 1,
    resultExplanationText:
      'Small, firm, umbilicated (center-dimpled) papules in a child who swims frequently are typical of molluscum contagiosum, which usually resolves on its own.',
    bodyRegion: 'ABDOMEN',
    skinImageTitle: 'Abdomen — day 1',
    skinImageAlt: 'Small, firm, dome-shaped papules with central umbilication',
    historyDocument: {
      type: 'WEATHER_HISTORY',
      title: 'Environmental history',
      content: { season: 'summer', settingExposure: 'frequent public swimming pool use' },
    },
    symptoms: [{ name: 'Small bumps', duration: '6 weeks' }],
    hint: {
      content:
        'A central dimple ("umbilication") on a small firm bump is the distinguishing feature of molluscum.',
    },
  },
  {
    patient: {
      name: 'Oliver Bennett',
      age: 34,
      sex: 'MALE',
      occupation: 'Lifeguard',
      bodyModelVariant: 'male_average_02',
    },
    diagnosisCode: 'VITILIGO',
    treatmentCode: 'REFER_DERMATOLOGY',
    difficulty: 2,
    resultExplanationText:
      'A sharply demarcated, completely depigmented patch, with a family history of autoimmune disease, is characteristic of vitiligo.',
    bodyRegion: 'CHEST',
    skinImageTitle: 'Chest — day 1',
    skinImageAlt: 'Sharply demarcated, fully depigmented patch',
    historyDocument: {
      type: 'FAMILY_HISTORY',
      title: 'Family history',
      content: {
        autoimmuneConditionsInFamily: 'mother has thyroid disease',
        vitiligoInFamily: 'none known',
      },
    },
    symptoms: [{ name: 'Depigmented patch', duration: '4 months' }],
    hint: {
      content:
        'A Wood’s lamp exam makes depigmented vitiligo patches fluoresce distinctly, helping confirm the diagnosis.',
      requiredShopItemSku: 'EQ-UV-WOODS-LAMP',
    },
  },
  {
    patient: {
      name: 'Helen Brooks',
      age: 66,
      sex: 'FEMALE',
      occupation: 'Gardener',
      bodyModelVariant: 'female_average_02',
    },
    diagnosisCode: 'ACTINIC_KERATOSIS',
    treatmentCode: 'CRYOTHERAPY',
    difficulty: 2,
    resultExplanationText:
      'A rough, sandpaper-like scaly patch on chronically sun-exposed skin in an older patient is typical of a precancerous actinic keratosis.',
    bodyRegion: 'RIGHT_HAND',
    skinImageTitle: 'Back of right hand — day 1',
    skinImageAlt: 'Rough, scaly, erythematous patch',
    historyDocument: {
      type: 'UV_EXPOSURE_HISTORY',
      title: 'Sun exposure history',
      content: {
        sunbedUse: 'never',
        occupationalExposure: 'high',
        sunburnHistory: 'decades of unprotected gardening',
      },
    },
    symptoms: [{ name: 'Rough scaly patch', duration: '8 months' }],
    hint: {
      content:
        'A patch that feels rougher than it looks, on sun-damaged skin, is a classic actinic keratosis clue.',
      requiredShopItemSku: 'EQ-MAGNIFYING-LOUPE',
    },
  },
  {
    patient: {
      name: 'Diego Alvarez',
      age: 30,
      sex: 'MALE',
      occupation: 'Bartender',
      bodyModelVariant: 'male_average_01',
    },
    diagnosisCode: 'URTICARIA',
    treatmentCode: 'ORAL_ANTIHISTAMINE',
    difficulty: 1,
    resultExplanationText:
      'Sudden, itchy, raised wheals that come and go within hours, after a known food trigger, are classic for urticaria (hives).',
    bodyRegion: 'BACK',
    skinImageTitle: 'Back — day 1',
    skinImageAlt: 'Raised, well-circumscribed itchy wheals',
    historyDocument: {
      type: 'DISEASE_HISTORY',
      title: 'Skin history',
      content: {
        knownAllergies: 'shellfish',
        recentExposure: 'ate shrimp a few hours before symptoms began',
      },
    },
    symptoms: [{ name: 'Itchy welts', duration: '1 day' }],
    hint: {
      content:
        'Ask about anything eaten in the hours before the wheals appeared — food triggers are common.',
    },
  },
  {
    patient: {
      name: 'Fatima Al-Sayed',
      age: 44,
      sex: 'FEMALE',
      occupation: 'Pilot',
      bodyModelVariant: 'female_average_01',
    },
    diagnosisCode: 'ALOPECIA_AREATA',
    treatmentCode: 'REFER_DERMATOLOGY',
    difficulty: 2,
    resultExplanationText:
      'A well-circumscribed, smooth, coin-sized bald patch with no scarring or scaling is typical of alopecia areata, an autoimmune hair-loss condition.',
    bodyRegion: 'HEAD',
    skinImageTitle: 'Scalp — day 1',
    skinImageAlt: 'Smooth, coin-sized patch of complete hair loss',
    historyDocument: {
      type: 'FAMILY_HISTORY',
      title: 'Family history',
      content: {
        autoimmuneConditionsInFamily: 'sister has vitiligo',
        alopeciaInFamily: 'none known',
      },
    },
    symptoms: [{ name: 'Coin-sized bald patch', duration: '2 months' }],
    hint: {
      content:
        'Smooth, non-scarring, non-scaling hair loss points toward alopecia areata rather than a fungal cause.',
    },
  },
];

function toMoneyReward(difficulty: number): number {
  return 20 + difficulty * 20;
}

function toMoneyPenalty(difficulty: number): number {
  return 10 + difficulty * 10;
}

export interface CaseBundle {
  patient: PatientSeedRow;
  case: CaseSeedRow;
  documents: CaseDocumentSeedRow[];
  hints: CaseHintSeedRow[];
}

export const CASE_BUNDLES: CaseBundle[] = CASE_INPUTS.map((input, index) => {
  const position = index + 1;
  const patientId = seedId('04', position);
  const caseId = seedId('05', position);

  const patient: PatientSeedRow = {
    id: patientId,
    name: input.patient.name,
    age: input.patient.age,
    sex: input.patient.sex,
    occupation: input.patient.occupation,
    portraitImageUrl: `https://cdn.example.com/patients/patient-${position}.png`,
    bodyModelVariant: input.patient.bodyModelVariant,
  };

  const gameCase: CaseSeedRow = {
    id: caseId,
    patientId,
    difficulty: input.difficulty,
    correctDiagnosisId: diagnosisId(input.diagnosisCode),
    correctTreatmentId: treatmentId(input.treatmentCode),
    moneyReward: toMoneyReward(input.difficulty),
    moneyPenalty: toMoneyPenalty(input.difficulty),
    resultExplanationText: input.resultExplanationText,
    isActive: true,
  };

  const documents: CaseDocumentSeedRow[] = [
    {
      id: seedId('06', position * 3 - 2),
      caseId,
      attentionPointRegion: input.bodyRegion,
      type: 'SKIN_IMAGE',
      title: input.skinImageTitle,
      documentDate: null,
      sortOrder: 1,
      imageUrl: `https://cdn.example.com/skin/lesion_${position}.png`,
      imageWidthPx: 1024,
      imageHeightPx: 768,
      imageAltText: input.skinImageAlt,
    },
    {
      id: seedId('06', position * 3 - 1),
      caseId,
      attentionPointRegion: null,
      type: input.historyDocument.type,
      title: input.historyDocument.title,
      documentDate: null,
      sortOrder: 2,
      imageUrl: null,
      imageWidthPx: null,
      imageHeightPx: null,
      imageAltText: null,
      content: input.historyDocument.content,
    },
  ];

  if (input.symptoms) {
    documents.push({
      id: seedId('06', position * 3),
      caseId,
      attentionPointRegion: null,
      type: 'CLINICAL_SYMPTOMS',
      title: 'Clinical symptoms',
      documentDate: null,
      sortOrder: 3,
      imageUrl: null,
      imageWidthPx: null,
      imageHeightPx: null,
      imageAltText: null,
      content: { symptoms: input.symptoms },
    });
  }

  const hints: CaseHintSeedRow[] = [
    {
      id: seedId('07', position),
      caseId,
      content: input.hint.content,
      sortOrder: 1,
      unlockAfterDay: input.hint.unlockAfterDay ?? null,
      requiredShopItemId: input.hint.requiredShopItemSku
        ? shopItemId(input.hint.requiredShopItemSku)
        : null,
    },
  ];

  return { patient, case: gameCase, documents, hints };
});

export async function seedCases(prisma: SeedPrismaClient): Promise<void> {
  for (const bundle of CASE_BUNDLES) {
    const { id: patientId, ...patientUpdate } = bundle.patient;
    await prisma.patient.upsert({
      where: { id: patientId },
      update: patientUpdate,
      create: bundle.patient,
    });

    const { id: caseId, ...caseUpdate } = bundle.case;
    await prisma.case.upsert({ where: { id: caseId }, update: caseUpdate, create: bundle.case });

    for (const document of bundle.documents) {
      const { id: documentId, ...documentUpdate } = document;
      await prisma.caseDocument.upsert({
        where: { id: documentId },
        update: documentUpdate,
        create: document,
      });
    }

    for (const hint of bundle.hints) {
      const { id: hintId, ...hintUpdate } = hint;
      await prisma.caseHint.upsert({ where: { id: hintId }, update: hintUpdate, create: hint });
    }
  }
}
