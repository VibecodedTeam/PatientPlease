import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

const DIAGNOSES: Prisma.DiagnosisCreateManyInput[] = [
  { code: 'melanoma', name: 'Melanoma', category: 'MALIGNANT', description: 'A malignant tumor of melanocytes, often arising in a changing mole with asymmetric borders.' },
  { code: 'basal-cell-carcinoma', name: 'Basal Cell Carcinoma', category: 'MALIGNANT', description: 'The most common skin cancer, typically a pearly nodule or non-healing sore on sun-exposed skin.' },
  { code: 'squamous-cell-carcinoma', name: 'Squamous Cell Carcinoma', category: 'MALIGNANT', description: 'A malignant tumor of keratinocytes presenting as a scaly, crusted, or ulcerated plaque.' },
  { code: 'bowens-disease', name: "Bowen's Disease", category: 'MALIGNANT', description: 'Squamous cell carcinoma in situ, appearing as a slow-growing scaly red patch.' },
  { code: 'keratoacanthoma', name: 'Keratoacanthoma', category: 'MALIGNANT', description: 'A rapidly growing, dome-shaped nodule with a central keratin plug, related to squamous cell carcinoma.' },
  { code: 'actinic-keratosis', name: 'Actinic Keratosis', category: 'OTHER', description: 'A rough, scaly precancerous patch caused by cumulative sun damage.' },
  { code: 'dysplastic-nevus', name: 'Dysplastic Nevus', category: 'OTHER', description: 'An atypical mole with irregular borders and color that carries an increased melanoma risk.' },
  { code: 'seborrheic-keratosis', name: 'Seborrheic Keratosis', category: 'BENIGN', description: "A common, benign, waxy or wart-like brown growth that appears 'stuck on' the skin." },
  { code: 'common-nevus', name: 'Nevus (Common Mole)', category: 'BENIGN', description: 'A benign, well-circumscribed collection of melanocytes with even color and borders.' },
  { code: 'dermatofibroma', name: 'Dermatofibroma', category: 'BENIGN', description: 'A firm, benign nodule of fibrous tissue, often on the lower legs, that dimples when pinched.' },
  { code: 'vitiligo', name: 'Vitiligo', category: 'OTHER', description: 'An autoimmune condition causing patchy loss of skin pigment.' },
  { code: 'melasma', name: 'Melasma', category: 'OTHER', description: 'Symmetric brown patches of facial hyperpigmentation linked to sun exposure and hormones.' },
  { code: 'psoriasis', name: 'Psoriasis', category: 'INFLAMMATORY', description: 'A chronic autoimmune condition causing thick, silvery, scaly plaques.' },
  { code: 'atopic-dermatitis', name: 'Eczema (Atopic Dermatitis)', category: 'INFLAMMATORY', description: 'A chronic itchy, inflamed rash common in patients with an atopic history.' },
  { code: 'contact-dermatitis', name: 'Contact Dermatitis', category: 'INFLAMMATORY', description: 'An itchy, inflamed rash caused by direct contact with an irritant or allergen.' },
  { code: 'rosacea', name: 'Rosacea', category: 'INFLAMMATORY', description: 'A chronic facial redness condition often with visible blood vessels and papules.' },
  { code: 'acne-vulgaris', name: 'Acne Vulgaris', category: 'INFLAMMATORY', description: 'A common inflammatory condition of hair follicles causing comedones, papules, and pustules.' },
  { code: 'lichen-planus', name: 'Lichen Planus', category: 'INFLAMMATORY', description: 'An inflammatory condition causing itchy, flat-topped purple papules.' },
  { code: 'urticaria', name: 'Urticaria (Hives)', category: 'INFLAMMATORY', description: 'Itchy, raised welts caused by an allergic or histamine-mediated reaction.' },
  { code: 'alopecia-areata', name: 'Alopecia Areata', category: 'OTHER', description: 'An autoimmune condition causing sudden patchy hair loss.' },
  { code: 'tinea-corporis', name: 'Tinea Corporis (Ringworm)', category: 'INFECTIOUS', description: 'A fungal infection causing an itchy, ring-shaped rash with a raised border.' },
  { code: 'impetigo', name: 'Impetigo', category: 'INFECTIOUS', description: 'A contagious bacterial skin infection causing honey-colored crusted sores.' },
  { code: 'cellulitis', name: 'Cellulitis', category: 'INFECTIOUS', description: 'A bacterial infection of the deeper skin layers causing redness, warmth, and swelling.' },
  { code: 'molluscum-contagiosum', name: 'Molluscum Contagiosum', category: 'INFECTIOUS', description: 'A viral infection causing small, firm, dome-shaped bumps with a central dimple.' },
  { code: 'verruca-vulgaris', name: 'Warts (Verruca Vulgaris)', category: 'INFECTIOUS', description: 'A common viral skin infection causing rough, raised growths.' },
];

const TREATMENTS: Prisma.TreatmentCreateManyInput[] = [
  { code: 'topical-corticosteroid', name: 'Topical Corticosteroid', kind: 'TOPICAL', description: 'An anti-inflammatory cream or ointment applied directly to affected skin.' },
  { code: 'topical-retinoid', name: 'Topical Retinoid', kind: 'TOPICAL', description: 'A vitamin-A derivative cream used to normalize skin cell turnover.' },
  { code: 'topical-antifungal', name: 'Topical Antifungal Cream', kind: 'TOPICAL', description: 'An antifungal cream applied to clear a localized fungal skin infection.' },
  { code: 'topical-antibiotic', name: 'Topical Antibiotic Ointment', kind: 'TOPICAL', description: 'An antibiotic ointment applied to a localized bacterial skin infection.' },
  { code: 'topical-calcineurin-inhibitor', name: 'Topical Calcineurin Inhibitor', kind: 'TOPICAL', description: 'A steroid-sparing topical immunomodulator for chronic inflammatory skin conditions.' },
  { code: 'oral-antibiotic', name: 'Oral Antibiotic Course', kind: 'ORAL_MEDICATION', description: 'A systemic antibiotic course for a spreading or deep bacterial skin infection.' },
  { code: 'oral-antifungal', name: 'Oral Antifungal', kind: 'ORAL_MEDICATION', description: 'A systemic antifungal medication for widespread or resistant fungal infection.' },
  { code: 'oral-antihistamine', name: 'Oral Antihistamine', kind: 'ORAL_MEDICATION', description: 'An oral medication to relieve itching and allergic skin reactions.' },
  { code: 'oral-corticosteroid', name: 'Oral Corticosteroid', kind: 'ORAL_MEDICATION', description: 'A short systemic steroid course for severe inflammatory flare-ups.' },
  { code: 'oral-isotretinoin', name: 'Oral Isotretinoin', kind: 'ORAL_MEDICATION', description: 'A systemic retinoid used for severe, treatment-resistant acne.' },
  { code: 'surgical-excision', name: 'Surgical Excision', kind: 'PROCEDURE', description: 'Complete surgical removal of a lesion with a margin of healthy tissue.' },
  { code: 'mohs-surgery', name: 'Mohs Micrographic Surgery', kind: 'PROCEDURE', description: 'A staged surgical technique that removes skin cancer layer by layer under microscopic control.' },
  { code: 'cryotherapy', name: 'Cryotherapy', kind: 'PROCEDURE', description: 'Freezing a lesion with liquid nitrogen to destroy abnormal tissue.' },
  { code: 'curettage-electrodesiccation', name: 'Curettage and Electrodesiccation', kind: 'PROCEDURE', description: 'Scraping away a lesion and cauterizing the base to prevent regrowth.' },
  { code: 'laser-therapy', name: 'Laser Therapy', kind: 'PROCEDURE', description: 'Targeted laser treatment used to remove or lighten a skin lesion.' },
  { code: 'phototherapy-uvb', name: 'Phototherapy (UVB)', kind: 'PROCEDURE', description: 'Controlled ultraviolet light exposure used to treat widespread inflammatory skin disease.' },
  { code: 'photodynamic-therapy', name: 'Photodynamic Therapy', kind: 'PROCEDURE', description: 'A light-activated topical treatment that destroys precancerous or cancerous cells.' },
  { code: 'chemical-peel', name: 'Chemical Peel', kind: 'PROCEDURE', description: 'A controlled chemical exfoliation used to treat pigmentation and superficial lesions.' },
  { code: 'referral-oncology', name: 'Referral to Oncology', kind: 'REFERRAL', description: 'Referring the patient to an oncologist for suspected or confirmed skin cancer.' },
  { code: 'referral-dermatology', name: 'Referral to Dermatology', kind: 'REFERRAL', description: 'Referring the patient to a dermatologist for specialist evaluation.' },
  { code: 'referral-allergy', name: 'Referral to Allergy Specialist', kind: 'REFERRAL', description: 'Referring the patient to an allergist for suspected allergic skin disease.' },
  { code: 'referral-infectious-disease', name: 'Referral to Infectious Disease', kind: 'REFERRAL', description: 'Referring the patient to an infectious disease specialist for a severe or unusual infection.' },
  { code: 'watchful-waiting', name: 'Watchful Waiting', kind: 'MONITORING', description: 'Deferring active treatment while monitoring a low-risk lesion over time.' },
  { code: 'routine-follow-up', name: 'Routine Follow-Up Monitoring', kind: 'MONITORING', description: 'Scheduling periodic follow-up visits to track a stable condition.' },
  { code: 'no-treatment', name: 'No Treatment Needed', kind: 'NONE', description: 'No medical treatment is required for this benign presentation.' },
];

const SHOP_ITEMS: Prisma.ShopItemCreateManyInput[] = [
  { sku: 'equip-dermatoscope', name: 'Dermatoscope', itemType: 'EQUIPMENT', price: 150, description: 'A handheld magnifier with polarized light for close inspection of lesions.' },
  { sku: 'equip-woods-lamp', name: "UV Wood's Lamp", itemType: 'EQUIPMENT', price: 120, description: 'An ultraviolet lamp that reveals fungal and pigment changes invisible in normal light.' },
  { sku: 'equip-macro-camera', name: 'Digital Macro Camera', itemType: 'EQUIPMENT', price: 200, description: 'A close-focus camera attachment for documenting lesions in fine detail.' },
  { sku: 'equip-loupe', name: 'Magnifying Loupe', itemType: 'EQUIPMENT', price: 60, description: 'A basic handheld magnifier for quick visual inspection.' },
  { sku: 'equip-biopsy-kit', name: 'Skin Biopsy Punch Kit', itemType: 'EQUIPMENT', price: 180, description: 'A sterile punch kit for taking small tissue samples.' },
  { sku: 'equip-dermo-light', name: 'Portable Dermoscope Light', itemType: 'EQUIPMENT', price: 90, description: 'A clip-on light source that improves dermoscope visibility.' },
  { sku: 'equip-skin-scanner', name: 'Digital Skin Scanner', itemType: 'EQUIPMENT', price: 300, description: "A scanning device that maps a lesion's borders and asymmetry automatically." },
  { sku: 'equip-uv-meter', name: 'Handheld UV Meter', itemType: 'EQUIPMENT', price: 75, description: "A meter for measuring a patient's recorded UV exposure." },
  { sku: 'equip-instrument-tray', name: 'Sterile Instrument Tray', itemType: 'EQUIPMENT', price: 50, description: 'A tray of sterile tools for minor in-office procedures.' },
  { sku: 'equip-ultrasound', name: 'Portable Ultrasound Probe', itemType: 'EQUIPMENT', price: 350, description: 'A compact ultrasound probe for imaging deeper skin structures.' },
  { sku: 'book-atlas-derm-1', name: 'Atlas of Dermatology Vol. 1', itemType: 'HANDBOOK', price: 100, description: 'A reference atlas of common skin conditions with side-by-side comparison photos.' },
  { sku: 'book-atlas-derm-2', name: 'Atlas of Dermatology Vol. 2', itemType: 'HANDBOOK', price: 100, description: 'The second volume of the dermatology atlas, covering rarer presentations.' },
  { sku: 'book-pigmented-lesions', name: 'Field Guide to Pigmented Lesions', itemType: 'HANDBOOK', price: 80, description: 'A pocket guide focused on distinguishing benign moles from melanoma.' },
  { sku: 'book-pediatric-derm', name: 'Handbook of Pediatric Dermatoses', itemType: 'HANDBOOK', price: 90, description: 'A reference on skin conditions specific to infants and children.' },
  { sku: 'book-infectious-manual', name: 'Infectious Skin Diseases Manual', itemType: 'HANDBOOK', price: 85, description: 'A manual covering bacterial, fungal, and viral skin infections.' },
  { sku: 'book-inflammatory-ref', name: 'Inflammatory Dermatoses Reference', itemType: 'HANDBOOK', price: 85, description: 'A reference on chronic inflammatory skin conditions and their treatment.' },
  { sku: 'book-onco-derm', name: 'Oncodermatology Essentials', itemType: 'HANDBOOK', price: 130, description: 'An essentials guide to diagnosing and staging skin cancers.' },
  { sku: 'book-diff-diagnosis', name: 'Differential Diagnosis Pocket Guide', itemType: 'HANDBOOK', price: 70, description: 'A quick-reference guide for narrowing down look-alike skin conditions.' },
  { sku: 'book-treatment-protocols', name: 'Treatment Protocols Compendium', itemType: 'HANDBOOK', price: 95, description: 'A compendium of standard treatment protocols by condition.' },
  { sku: 'book-clinical-photo', name: 'Clinical Photography for Dermatology', itemType: 'HANDBOOK', price: 60, description: 'A guide to capturing consistent, diagnostic-quality clinical photos.' },
  { sku: 'plot-loan-notice', name: 'Overdue Loan Notice', itemType: 'PLOT_ITEM', price: 0, description: "A stern notice reminding the doctor of the outstanding student loan balance." },
  { sku: 'plot-family-photo', name: 'Family Photograph', itemType: 'PLOT_ITEM', price: 0, description: 'A worn photograph the doctor keeps on the desk for motivation.' },
  { sku: 'plot-diploma', name: 'Old Medical Diploma', itemType: 'PLOT_ITEM', price: 0, description: "The doctor's framed diploma, a reminder of why they started." },
  { sku: 'plot-eviction-warning', name: "Landlord's Eviction Warning", itemType: 'PLOT_ITEM', price: 0, description: "A warning letter about the doctor's overdue rent." },
  { sku: 'plot-thank-you-note', name: 'Handwritten Patient Thank-You Note', itemType: 'PLOT_ITEM', price: 0, description: 'A grateful note from a patient the doctor once treated.' },
];

const PATIENT_NAMES = [
  'Jan Kowalski', 'Anna Nowak', 'Piotr Wiśniewski', 'Maria Lewandowska', 'Tomasz Wójcik',
  'Katarzyna Kamińska', 'Marek Zieliński', 'Agnieszka Szymańska', 'Krzysztof Woźniak', 'Magdalena Dąbrowska',
  'Andrzej Kozłowski', 'Ewa Jankowska', 'Grzegorz Mazur', 'Joanna Kwiatkowska', 'Michał Krawczyk',
  'Barbara Piotrowska', 'Paweł Grabowski', 'Monika Nowakowska', 'Rafał Pawłowski', 'Aleksandra Michalska',
  'Dariusz Adamczyk', 'Beata Dudek', 'Wojciech Zając', 'Elżbieta Wieczorek', 'Sławomir Jabłoński',
];

const OCCUPATIONS = [
  'Roofer', 'Teacher', 'Farmer', 'Office Clerk', 'Lifeguard',
  'Construction Worker', 'Fisherman', 'Nurse', 'Truck Driver', 'Gardener',
  'Retired', 'Student', 'Chef', 'Mechanic', 'Postal Worker',
  'Beekeeper', 'Ski Instructor', 'Painter', 'Barista', 'Electrician',
  'Sailor', 'Landscaper', 'Photographer', 'Warehouse Worker', 'Delivery Courier',
];

const BODY_MODEL_VARIANTS = ['male_average_01', 'female_average_01', 'male_slim_01', 'female_slim_01'] as const;
const SEXES = ['MALE', 'FEMALE', 'OTHER'] as const;
const BODY_REGIONS = [
  'HEAD', 'NECK', 'CHEST', 'BACK', 'ABDOMEN', 'LEFT_ARM', 'RIGHT_ARM',
  'LEFT_LEG', 'RIGHT_LEG', 'LEFT_HAND', 'RIGHT_HAND', 'LEFT_FOOT', 'RIGHT_FOOT',
] as const;
const SUPPORTING_DOCUMENT_TYPES = [
  'DISEASE_HISTORY', 'UV_EXPOSURE_HISTORY', 'CLINICAL_SYMPTOMS', 'FAMILY_HISTORY', 'WEATHER_HISTORY',
] as const;

const CASE_COUNT = PATIENT_NAMES.length;

export async function seed(options: { force?: boolean } = {}): Promise<void> {
  const alreadySeeded = (await prisma.diagnosis.count()) > 0;
  if (alreadySeeded && !options.force) {
    console.log('Database already seeded — skipping. Pass { force: true } / --force to reseed.');
    return;
  }

  await prisma.diagnosisAttempt.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.gameplayLog.deleteMany();
  await prisma.caseHint.deleteMany();
  await prisma.caseDocument.deleteMany();
  await prisma.case.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.ownedItem.deleteMany();
  await prisma.shopItem.deleteMany();
  await prisma.diagnosis.deleteMany();
  await prisma.treatment.deleteMany();

  await prisma.diagnosis.createMany({ data: DIAGNOSES });
  await prisma.treatment.createMany({ data: TREATMENTS });
  await prisma.shopItem.createMany({ data: SHOP_ITEMS });

  const diagnoses = await prisma.diagnosis.findMany({ orderBy: { code: 'asc' } });
  const treatments = await prisma.treatment.findMany({ orderBy: { code: 'asc' } });
  const shopItems = await prisma.shopItem.findMany({ orderBy: { sku: 'asc' } });

  for (let i = 0; i < CASE_COUNT; i++) {
    const diagnosis = diagnoses[i % diagnoses.length]!;
    const treatment = treatments[i % treatments.length]!;
    const difficulty = (i % 3) + 1;

    const patient = await prisma.patient.create({
      data: {
        name: PATIENT_NAMES[i]!,
        age: 8 + ((i * 7) % 70),
        sex: SEXES[i % SEXES.length]!,
        occupation: OCCUPATIONS[i]!,
        portraitImageUrl: `https://cdn.example.test/patients/patient-${String(i + 1).padStart(2, '0')}.png`,
        bodyModelVariant: BODY_MODEL_VARIANTS[i % BODY_MODEL_VARIANTS.length]!,
      },
    });

    const caseRecord = await prisma.case.create({
      data: {
        patientId: patient.id,
        difficulty,
        correctDiagnosisId: diagnosis.id,
        correctTreatmentId: treatment.id,
        moneyReward: 50 + difficulty * 25,
        moneyPenalty: 20 + difficulty * 10,
        resultExplanationText: `${diagnosis.name} confirmed on review; correct treatment was ${treatment.name}.`,
      },
    });

    await prisma.caseDocument.create({
      data: {
        caseId: caseRecord.id,
        type: 'SKIN_IMAGE',
        attentionPointRegion: BODY_REGIONS[i % BODY_REGIONS.length]!,
        title: 'Lesion close-up',
        sortOrder: 0,
        imageUrl: `https://cdn.example.test/cases/case-${String(i + 1).padStart(2, '0')}-lesion.png`,
        imageWidthPx: 1024,
        imageHeightPx: 768,
        imageAltText: `Close-up photo of lesion on ${patient.name}`,
      },
    });

    await prisma.caseDocument.create({
      data: {
        caseId: caseRecord.id,
        type: SUPPORTING_DOCUMENT_TYPES[i % SUPPORTING_DOCUMENT_TYPES.length]!,
        title: 'Patient history',
        sortOrder: 1,
        content: { note: `Relevant history for ${patient.name}'s case.` },
      },
    });

    await prisma.caseHint.create({
      data: {
        caseId: caseRecord.id,
        content: `Consider ${diagnosis.name} given the presentation.`,
        sortOrder: 0,
        unlockAfterDay: i % 5 === 0 ? null : (i % 3) + 1,
        requiredShopItemId: i % 3 === 0 ? shopItems[i % shopItems.length]!.id : null,
      },
    });
  }
}

const isMainModule = process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  const force = process.argv.includes('--force');
  seed({ force })
    .then(() => prisma.$disconnect())
    .catch(async (error: unknown) => {
      console.error(error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
