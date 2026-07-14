export type Sex = 'MALE' | 'FEMALE' | 'OTHER';

export type BodyRegion =
  | 'HEAD'
  | 'NECK'
  | 'CHEST'
  | 'BACK'
  | 'ABDOMEN'
  | 'LEFT_ARM'
  | 'RIGHT_ARM'
  | 'LEFT_LEG'
  | 'RIGHT_LEG'
  | 'LEFT_HAND'
  | 'RIGHT_HAND'
  | 'LEFT_FOOT'
  | 'RIGHT_FOOT'
  | 'OTHER';

export type SupportingDocumentType =
  | 'DISEASE_HISTORY'
  | 'UV_EXPOSURE_HISTORY'
  | 'CLINICAL_SYMPTOMS'
  | 'FAMILY_HISTORY'
  | 'WEATHER_HISTORY';

export type RealCaseDocument = {
  type: SupportingDocumentType;
  title: string;
  content: Record<string, unknown> | null;
};

export type RealCaseSeed = {
  patientName: string;
  age: number;
  sex: Sex;
  occupation: string | null;
  bodyRegion: BodyRegion;
  imageFile: string;
  examinationSku: string;
  examinationFindings: string;
  documents: RealCaseDocument[];
  diagnosisCode: string;
  treatmentCode: string | null;
  difficulty: 1 | 2 | 3;
  resultExplanationText: string;
  sourceNote: string | null;
};

export const REAL_CASES: RealCaseSeed[] = [
  {
    patientName: 'Irena Kwiat',
    age: 41,
    sex: 'FEMALE',
    occupation: null,
    bodyRegion: 'RIGHT_ARM',
    imageFile: 'case-01.jpg',
    examinationSku: 'exam-dermoscopy',
    examinationFindings:
      'Dermoscopy shows two small pigmented lesions with symmetric structure and a regular pigment network — features reassuring against malignancy.',
    documents: [
      {
        type: 'UV_EXPOSURE_HISTORY',
        title: 'UV exposure history',
        content: {
          history:
            'Used tanning beds for years and rarely applied sunscreen, believing tanned skin looked healthier, more attractive, and gave more confidence.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Clinical symptoms',
        content: {
          description:
            'Two tiny dark moles on the arm, one no larger than a pinprick. Not dramatic-looking and not painful, but both are symmetric and multicolored.',
        },
      },
    ],
    diagnosisCode: 'dysplastic-nevus',
    treatmentCode: 'watchful-waiting',
    difficulty: 1,
    resultExplanationText:
      'Symmetric, evenly pigmented moles with a benign dermoscopic pattern — a dysplastic nevus managed with observation and a 3-month follow-up rather than immediate excision.',
    sourceNote: null,
  },
  {
    patientName: 'Dariusz Wilk',
    age: 36,
    sex: 'MALE',
    occupation: null,
    bodyRegion: 'NECK',
    imageFile: 'case-02.jpg',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Biopsy of the submandibular mass confirms primary melanoma, a very rare presentation arising from the submandibular gland region.',
    documents: [
      {
        type: 'DISEASE_HISTORY',
        title: 'Disease history',
        content: { history: 'No significant health problems in the past.' },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Clinical symptoms',
        content: {
          description:
            'Progressive, painless, hard thickening on the lower left side of the face near the jaw, growing steadily over several weeks. No discomfort with eating or speaking, no prior trauma or infection in the area. The face has become visibly asymmetric because of the swelling.',
        },
      },
    ],
    diagnosisCode: 'melanoma',
    treatmentCode: 'surgical-excision',
    difficulty: 3,
    resultExplanationText:
      'A rare primary melanoma of the submandibular gland region, requiring complete surgical resection and jaw reconstruction.',
    sourceNote: null,
  },
  {
    patientName: 'Robert Sadowski',
    age: 39,
    sex: 'MALE',
    occupation: null,
    bodyRegion: 'BACK',
    imageFile: 'case-03.jpg',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Biopsy confirms melanoma; excision performed with a safety margin and further staging tests ordered.',
    documents: [
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Clinical symptoms',
        content: {
          description:
            "A mole on the back began bleeding after showering and toweling off. His partner examined it and found it covered with multiple small blisters, noticeably larger than his other moles, with dark patches. The mole has also been enlarging over time and has recently started to itch.",
        },
      },
    ],
    diagnosisCode: 'melanoma',
    treatmentCode: 'surgical-excision',
    difficulty: 2,
    resultExplanationText:
      'Bleeding, itching, multicolored mole with recent growth — melanoma confirmed on biopsy, treated with margin excision and staging workup.',
    sourceNote: null,
  },
  {
    patientName: 'Kamil Zych',
    age: 34,
    sex: 'MALE',
    occupation: null,
    bodyRegion: 'LEFT_ARM',
    imageFile: 'case-04.jpg',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Biopsy of the altered tattoo pigment confirms melanoma arising within the tattooed skin, a recognized rare phenomenon.',
    documents: [
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Clinical symptoms',
        content: {
          description:
            'A section of a long-standing tattoo on the left arm — previously uniform, dark, and well-defined — has developed an irregular, darker patch where the pigment appears to have spread. The area has gradually grown and become slightly raised, as if something were accumulating beneath the skin. No pain or itching, but the area is visually distinct from the rest of the tattoo and clearly enlarging.',
        },
      },
    ],
    diagnosisCode: 'melanoma',
    treatmentCode: null,
    difficulty: 3,
    resultExplanationText:
      'Melanoma arising within tattooed skin — a rare but documented presentation where the tumor can be mistaken for tattoo pigment changes.',
    sourceNote: null,
  },
  {
    patientName: 'Bogumiła Nowicka',
    age: 45,
    sex: 'FEMALE',
    occupation: null,
    bodyRegion: 'ABDOMEN',
    imageFile: 'case-05.jpg',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Biopsy confirms melanoma; enlarged inguinal lymph nodes raise concern for regional spread.',
    documents: [
      {
        type: 'DISEASE_HISTORY',
        title: 'Disease history',
        content: {
          history:
            'Has had numerous moles for as long as she can remember, but they never caused problems and she has otherwise been healthy.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Clinical symptoms',
        content: {
          description:
            'A rough-surfaced mole on the right side of the abdomen, present since childhood, changed after a vacation into a translucent, blood- and fluid-filled nodule. Nothing had ever changed with her moles before this. Inguinal lymph nodes are enlarged.',
        },
      },
    ],
    diagnosisCode: 'melanoma',
    treatmentCode: 'surgical-excision',
    difficulty: 3,
    resultExplanationText:
      'A childhood mole transformed into a blood-filled nodule with enlarged inguinal lymph nodes — melanoma confirmed, treated with resection.',
    sourceNote: null,
  },
  {
    patientName: 'Wanda Kaczmarek',
    age: 79,
    sex: 'FEMALE',
    occupation: null,
    bodyRegion: 'HEAD',
    imageFile: 'case-06.jpg',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Biopsy shows SOX-10 positive pigmented cells; findings confirm nasal mucosal desmoplastic melanoma, a very rare site for melanoma.',
    documents: [
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Clinical symptoms',
        content: {
          description:
            'Presented to an ENT specialist with chronic nasal discomfort and watery discharge, initially assumed to be simple irritation. The doctor noticed a small change in the nasal vestibule. A biopsy revealed pigment-positive cells marking positive for SOX-10. After referral to a specialist center, a bluish spot appeared at the earlier biopsy site. Despite no other symptoms, it was removed because of its gradual enlargement and the resulting nasal asymmetry.',
        },
      },
    ],
    diagnosisCode: 'melanoma',
    treatmentCode: null,
    difficulty: 3,
    resultExplanationText:
      'A rare desmoplastic melanoma of the nasal mucosa, discovered incidentally during evaluation for chronic nasal symptoms.',
    sourceNote: null,
  },
  {
    patientName: 'Zenon Lis',
    age: 70,
    sex: 'MALE',
    occupation: null,
    bodyRegion: 'LEFT_ARM',
    imageFile: 'case-07.jpg',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Biopsy of the darkening moles confirms melanoma; melanuria and axillary lymphadenopathy suggest disseminated disease.',
    documents: [
      {
        type: 'DISEASE_HISTORY',
        title: 'Disease history',
        content: {
          history:
            'Extensive history of type II diabetes, hypertension, and atherosclerosis. Enlarged lymph nodes were noted in the left axillary region during an unrelated surgical procedure.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Clinical symptoms',
        content: {
          description:
            'After a cardiac procedure, noticed strong darkening of several moles, which over time changed shape and developed irregular borders. Also noticed his urine had become darker (melanuria), and blood work showed leukocytosis, elevated ESR, and elevated cholesterol.',
        },
      },
    ],
    diagnosisCode: 'melanoma',
    treatmentCode: null,
    difficulty: 3,
    resultExplanationText:
      'Multiple darkening, changing moles with melanuria and axillary lymphadenopathy point to disseminated melanoma.',
    sourceNote: null,
  },
  {
    patientName: 'Barbara Sikora',
    age: 45,
    sex: 'FEMALE',
    occupation: null,
    bodyRegion: 'CHEST',
    imageFile: 'case-08.jpg',
    examinationSku: 'exam-dermoscopy',
    examinationFindings:
      'Dermoscopy raises suspicion for stage I melanoma with an estimated thickness of 1.2 mm; referred for biopsy to confirm.',
    documents: [
      {
        type: 'UV_EXPOSURE_HISTORY',
        title: 'UV exposure history',
        content: { history: 'Recent sun-intensive vacation in Madeira preceded the appearance of the lesion.' },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Clinical symptoms',
        content: {
          description:
            'A few months after returning from a vacation in Madeira, noticed an unusual skin change above the left collarbone. Its borders were jagged, its color darker than her other moles, and its shape slightly raised. After a month of observation, the lesion was clearly evolving — enlarging and becoming more diffuse.',
        },
      },
    ],
    diagnosisCode: 'melanoma',
    treatmentCode: null,
    difficulty: 2,
    resultExplanationText:
      'A new, jagged, dark, evolving lesion above the collarbone following intense sun exposure — dermoscopy-suspected stage I melanoma.',
    sourceNote: null,
  },
  {
    patientName: 'Józef Baran',
    age: 55,
    sex: 'MALE',
    occupation: 'Construction Engineer',
    bodyRegion: 'NECK',
    imageFile: 'case-09.jpg',
    examinationSku: 'exam-dermoscopy',
    examinationFindings:
      'Dermoscopy and full ABCDE assessment strongly suggest melanoma given the asymmetry, border irregularity, color variation, size, and evolution.',
    documents: [
      {
        type: 'UV_EXPOSURE_HISTORY',
        title: 'UV exposure history',
        content: {
          history:
            'Rarely uses sunscreen, citing habit and the practical demands of outdoor construction work. History of extensive sunburns in childhood. Has many pigmented moles.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Clinical symptoms',
        content: {
          description:
            'A mole on the back of the neck changed shape, enlarged, and changed color over about 6 months. Skin examination found a 9mm x 7mm lesion meeting ABCDE criteria: asymmetric, jagged borders, heterogeneous color (brown mixed with red-pink), diameter over 9mm, and evolution over 6 months.',
        },
      },
    ],
    diagnosisCode: 'melanoma',
    treatmentCode: null,
    difficulty: 2,
    resultExplanationText:
      'A changing neck mole meeting all five ABCDE melanoma warning criteria in a long-term outdoor worker with a childhood sunburn history.',
    sourceNote: 'Diagnosis reflects the ABCDE assessment described in the source; no explicit final diagnosis was stated.',
  },
  {
    patientName: 'Marcin Krupa',
    age: 50,
    sex: 'MALE',
    occupation: 'Construction Worker',
    bodyRegion: 'HEAD',
    imageFile: 'case-10.jpg',
    examinationSku: 'exam-dermoscopy',
    examinationFindings:
      'Dermoscopy and clinical exam confirm a pearly, telangiectatic nodule typical of basal cell carcinoma, stage I.',
    documents: [
      {
        type: 'UV_EXPOSURE_HISTORY',
        title: 'UV exposure history',
        content: { history: 'Well-built, physically active construction worker with skin phototype II.' },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Clinical symptoms',
        content: {
          description:
            'A translucent, pearly lesion over 6mm in diameter and oval in shape has been present on the right cheek for years. Shiny in appearance, occasionally bleeds, but never worried him. Recently began enlarging and itching, prompting a visit at his daughter’s urging.',
        },
      },
    ],
    diagnosisCode: 'basal-cell-carcinoma',
    treatmentCode: 'mohs-surgery',
    difficulty: 1,
    resultExplanationText:
      'A classic pearly, shiny nodule on the cheek — basal cell carcinoma, stage I, treated with Mohs micrographic surgery given the facial location.',
    sourceNote: null,
  },
  {
    patientName: 'Zofia Wrona',
    age: 68,
    sex: 'FEMALE',
    occupation: null,
    bodyRegion: 'NECK',
    imageFile: 'case-11.jpg',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Biopsy confirms squamous cell carcinoma, stage III, with spread to regional lymph nodes and deep invasion into adjacent muscle and nerve tissue; imaging also reveals a small pulmonary metastasis.',
    documents: [
      {
        type: 'DISEASE_HISTORY',
        title: 'Disease history',
        content: { history: 'Widowed, living alone on an allotment plot, and a smoker.' },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Clinical symptoms',
        content: {
          description:
            'Rough, scaling patches and hard nodules with central ulceration on the neck, present for years. Over time the lesions began hurting under pressure, the nodules enlarged, and nearby neck lymph nodes became enlarged. In recent months she experienced uncontrolled weight loss and developed a limp on her right leg.',
        },
      },
    ],
    diagnosisCode: 'squamous-cell-carcinoma',
    treatmentCode: 'referral-oncology',
    difficulty: 3,
    resultExplanationText:
      'Long-standing ulcerated, scaling neck lesions progressed to stage III squamous cell carcinoma with nodal and pulmonary metastasis, requiring oncologic referral for resection, node clearance, and chemotherapy.',
    sourceNote: null,
  },
  {
    patientName: 'Horacjusz Duda',
    age: 40,
    sex: 'MALE',
    occupation: null,
    bodyRegion: 'HEAD',
    imageFile: 'case-12.jpg',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Histopathology confirms primary melanoma of the maxillary gingival mucosa, a rare site for melanoma.',
    documents: [
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Clinical symptoms',
        content: {
          description:
            'Noticed a dark pigmented change on the upper gum. Initially painless and asymptomatic, so it was ignored for a long time. The lesion was well-demarcated, darker than the surrounding mucosa, and gradually enlarging.',
        },
      },
    ],
    diagnosisCode: 'melanoma',
    treatmentCode: 'surgical-excision',
    difficulty: 3,
    resultExplanationText:
      'A pigmented gum lesion, ignored for a long time due to lack of symptoms, proved to be a rare primary melanoma of the oral mucosa.',
    sourceNote: null,
  },
  {
    patientName: 'Hiacynta Górska',
    age: 69,
    sex: 'FEMALE',
    occupation: null,
    bodyRegion: 'CHEST',
    imageFile: 'case-13.jpg',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Histopathology confirms melanoma, most likely a late metastasis from the melanoma resected over 30 years earlier.',
    documents: [
      {
        type: 'DISEASE_HISTORY',
        title: 'Disease history',
        content: {
          history: 'Melanoma was surgically removed from the area of the left pectoral muscle more than 30 years earlier.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Clinical symptoms',
        content: {
          description:
            'For several months, increasing epigastric pain, developing anemia, and unintentional weight loss. Imaging revealed a large gastric infiltration; during surgery, a dark, infiltrating tumor was found involving the gastric fundus.',
        },
      },
    ],
    diagnosisCode: 'melanoma',
    treatmentCode: 'referral-oncology',
    difficulty: 3,
    resultExplanationText:
      'A gastric tumor decades after an earlier melanoma excision proved to be a late metastatic recurrence of that original melanoma.',
    sourceNote: null,
  },
  {
    patientName: 'Krystyna Sroka',
    age: 57,
    sex: 'FEMALE',
    occupation: null,
    bodyRegion: 'RIGHT_ARM',
    imageFile: 'case-14.jpg',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings: 'Dermoscopy and biopsy, prompted by significant risk factors, confirm melanoma.',
    documents: [
      {
        type: 'UV_EXPOSURE_HISTORY',
        title: 'UV exposure history',
        content: {
          history:
            'Lived for many years in Bermuda with strong UV exposure, unaware at the time of the importance of sun protection. Since age 20 has been more careful, using SPF sunscreen and avoiding sun on hot, bright days.',
        },
      },
      {
        type: 'FAMILY_HISTORY',
        title: 'Family history',
        content: { history: 'Father had skin cancer, which is why she has been checking her moles periodically for several years.' },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Clinical symptoms',
        content: {
          description:
            'Noticed a tiny but dark mole on the right arm. Has not observed strong changes in its shape, but knows her own moles well and this one looks atypical to her.',
        },
      },
    ],
    diagnosisCode: 'melanoma',
    treatmentCode: null,
    difficulty: 2,
    resultExplanationText:
      'A tiny but atypical-looking mole, in a patient with major UV and family-history risk factors, proved to be melanoma.',
    sourceNote: null,
  },
  {
    patientName: 'Tomasz Ryba',
    age: 38,
    sex: 'MALE',
    occupation: 'Programmer',
    bodyRegion: 'BACK',
    imageFile: 'case-15.jpg',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Histopathology confirms nodular melanoma, clinical stage II, with Breslow thickness over 2mm; sentinel lymph node biopsy was performed alongside wide excision.',
    documents: [
      {
        type: 'UV_EXPOSURE_HISTORY',
        title: 'UV exposure history',
        content: { history: 'An avid mountaineer who spends vacations at high altitude without adequate UV protection.' },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Clinical symptoms',
        content: {
          description:
            'Noticed a new, rapidly growing lesion on the back. Unlike his typical moles, it presented as a dark blue, hard, clearly raised nodule. Within just two months it doubled in size, began itching, and occasionally bled when toweled off.',
        },
      },
    ],
    diagnosisCode: 'melanoma',
    treatmentCode: 'surgical-excision',
    difficulty: 3,
    resultExplanationText:
      'A rapidly growing dark blue nodule on the back — nodular melanoma, stage II, treated with wide excision and sentinel node biopsy.',
    sourceNote: null,
  },
  {
    patientName: 'Kacper Sobczak',
    age: 17,
    sex: 'MALE',
    occupation: 'Student',
    bodyRegion: 'HEAD',
    imageFile: 'case-16.jpg',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings: 'Surgical excision and histopathological analysis confirm melanoma of the scalp.',
    documents: [
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Clinical symptoms',
        content: {
          description:
            'While at a sports camp, a friend noticed an atypical lesion on his head. The next morning he noticed an irregular mole that was dark and resembled a blood blister. He does not recall any recent head injury, which is what drew his attention to it.',
        },
      },
    ],
    diagnosisCode: 'melanoma',
    treatmentCode: 'surgical-excision',
    difficulty: 2,
    resultExplanationText:
      'An irregular, dark, blood-blister-like scalp lesion with no history of trauma proved to be melanoma on histopathology.',
    sourceNote:
      'Final diagnosis was not stated in the source text and was generated to complete this case, per user instruction — the presentation (irregular, dark, blood-blister-like lesion, no trauma history) is consistent with melanoma.',
  },
  {
    patientName: 'Halina Wilczek',
    age: 65,
    sex: 'FEMALE',
    occupation: null,
    bodyRegion: 'LEFT_LEG',
    imageFile: 'case-17.jpg',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Surgical excision with adequate margins and histopathology confirm a moderately differentiated squamous cell carcinoma, stage T2. Clinical exam and CT/PET imaging show no lymph node involvement or metastasis.',
    documents: [
      {
        type: 'UV_EXPOSURE_HISTORY',
        title: 'UV exposure history',
        content: {
          history:
            'Fair-skinned, sunburns easily, tans poorly. Used a tanning bed at least once a week for 40 years, but stopped 7 years ago and has avoided sun exposure since.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Clinical symptoms',
        content: {
          description:
            'Presented to an oncologic surgery clinic with a painful, rapidly enlarging, ulcerated lesion on the left ankle, now 3cm in diameter with irregular, raised edges that bleed with minor trauma.',
        },
      },
    ],
    diagnosisCode: 'squamous-cell-carcinoma',
    treatmentCode: 'surgical-excision',
    difficulty: 2,
    resultExplanationText:
      'A painful, rapidly growing, ulcerated ankle lesion in a longtime tanning-bed user — squamous cell carcinoma, stage T2, with no nodal spread.',
    sourceNote: null,
  },
  {
    patientName: 'Grażyna Sowa',
    age: 65,
    sex: 'FEMALE',
    occupation: null,
    bodyRegion: 'LEFT_ARM',
    imageFile: 'case-18.jpg',
    examinationSku: 'exam-dermoscopy',
    examinationFindings: 'Dermoscopy, biopsy, and histopathology confirm actinic keratosis — a precancerous change, not cancer.',
    documents: [
      {
        type: 'DISEASE_HISTORY',
        title: 'Disease history',
        content: { history: 'Previously treated for melanoma of the facial skin. No family history of skin cancer.' },
      },
      {
        type: 'UV_EXPOSURE_HISTORY',
        title: 'UV exposure history',
        content: { history: 'Fair complexion; used a tanning bed at least once a week for 40 years.' },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Clinical symptoms',
        content: {
          description:
            'Presented for a full-body skin check because of countless small pink papules and scaling plaques on the arms, legs, and back. The lesions are flat-topped and slightly raised, with a dry, rough, sandpaper-like surface and a light pink to reddish color. They have not ulcerated, but some have a tendency to merge together.',
        },
      },
    ],
    diagnosisCode: 'actinic-keratosis',
    treatmentCode: 'cryotherapy',
    difficulty: 1,
    resultExplanationText:
      'Numerous rough, scaly pink papules from decades of tanning-bed use — actinic keratosis, a precancerous (not cancerous) condition.',
    sourceNote: null,
  },
  {
    patientName: 'Honorata Wysocka',
    age: 53,
    sex: 'FEMALE',
    occupation: null,
    bodyRegion: 'OTHER',
    imageFile: 'case-19.jpg',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Biopsy confirms malignant melanoma of the vagina. Excision was performed, followed by radiotherapy and chemotherapy given the biologically poor prognosis regardless of surgical extent; the patient later transitioned to palliative care due to metastatic spread.',
    documents: [
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Clinical symptoms',
        content: {
          description:
            'Presented with vaginal bleeding and a sensation of discomfort. Gynecological examination revealed a dark, irregular lesion on the vaginal wall.',
        },
      },
    ],
    diagnosisCode: 'melanoma',
    treatmentCode: 'referral-oncology',
    difficulty: 3,
    resultExplanationText: 'A rare and aggressive primary melanoma of the vagina, carrying a poor prognosis despite treatment.',
    sourceNote: null,
  },
  {
    patientName: 'Danuta Frąckowiak',
    age: 71,
    sex: 'FEMALE',
    occupation: null,
    bodyRegion: 'RIGHT_FOOT',
    imageFile: 'case-20.jpg',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Surgical biopsy, prompted by a persistent enlarging pigmented lesion unrelated to trauma, confirms subungual melanoma.',
    documents: [
      {
        type: 'DISEASE_HISTORY',
        title: 'Disease history',
        content: { history: 'Chronic hypertension and ischemic heart disease. No family history of skin cancer.' },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Clinical symptoms',
        content: {
          description:
            'About 3 months earlier, noticed a small black spot under the nail of the right big toe with no history of trauma to the area. The spot gradually enlarged but did not move with nail growth, and is completely painless. The nail plate itself is deformed by longstanding chronic toenail fungus, but directly beneath the diseased nail plate is a distinct, dark black spot about 5mm across. Inguinal lymph nodes are not enlarged on palpation or ultrasound.',
        },
      },
    ],
    diagnosisCode: 'melanoma',
    treatmentCode: 'surgical-excision',
    difficulty: 2,
    resultExplanationText:
      'A persistent, enlarging dark spot beneath a fungus-affected toenail, unrelated to trauma, proved to be subungual melanoma.',
    sourceNote: null,
  },
  {
    patientName: 'Julia Grzyb',
    age: 5,
    sex: 'FEMALE',
    occupation: null,
    bodyRegion: 'HEAD',
    imageFile: 'case-21.jpg',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'After excision, histopathology showed cellular atypia with positive HMB-45 staining, confirming conjunctival melanoma.',
    documents: [
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Clinical symptoms',
        content: {
          description:
            'Referred to an ophthalmologist for a gradually enlarging dark lesion on the conjunctiva of the right eye, located temporally, with characteristic feeder vessels that concerned the physicians. Imaging confirmed the lesion was limited to the superficial conjunctival layers.',
        },
      },
    ],
    diagnosisCode: 'melanoma',
    treatmentCode: 'surgical-excision',
    difficulty: 3,
    resultExplanationText:
      'A rare pediatric conjunctival melanoma, identified by its feeder vessels and confirmed with HMB-45-positive histopathology.',
    sourceNote: null,
  },
  {
    patientName: 'Adrian Michalak',
    age: 17,
    sex: 'MALE',
    occupation: 'Student',
    bodyRegion: 'RIGHT_HAND',
    imageFile: 'case-22.jpg',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      "The clinical picture, including pigment spread beyond the nail plate (Hutchinson's sign), prompted a nail matrix biopsy, which confirmed subungual melanoma.",
    documents: [
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Clinical symptoms',
        content: {
          description:
            "Presented for evaluation of a dark stripe on the nail of the right hand's fifth finger, present since age 7 and entirely asymptomatic. The physician noted an unusually wide dark band, taking up about half the width of the entire nail plate, with two smaller, narrower brownish stripes beside it. The dark pigment clearly spreads beyond the nail itself onto the adjacent and proximal nail folds.",
        },
      },
    ],
    diagnosisCode: 'melanoma',
    treatmentCode: 'surgical-excision',
    difficulty: 2,
    resultExplanationText:
      'A wide, long-standing dark nail stripe with pigment spreading onto the nail fold — subungual melanoma.',
    sourceNote: null,
  },
  {
    patientName: 'Alicja Cisek',
    age: 73,
    sex: 'FEMALE',
    occupation: null,
    bodyRegion: 'RIGHT_HAND',
    imageFile: 'case-23.jpg',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Dermoscopy followed by excisional biopsy with histopathology confirms keratoacanthoma, a rapidly growing squamous-lineage lesion.',
    documents: [
      {
        type: 'DISEASE_HISTORY',
        title: 'Disease history',
        content: {
          history:
            'Long-standing Lyme disease for over 10 years, treated with numerous naturopathic remedies prescribed by a naturopath. No prior burns, trauma, or skin cancer.',
        },
      },
      {
        type: 'UV_EXPOSURE_HISTORY',
        title: 'UV exposure history',
        content: { history: 'Occasional tanning bed use over the past six months.' },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Clinical symptoms',
        content: {
          description:
            'Sudden appearance of a large, hard, red nodule on the inner surface of the right palm. The lesion caused both aesthetic discomfort and significant itching.',
        },
      },
    ],
    diagnosisCode: 'keratoacanthoma',
    treatmentCode: 'surgical-excision',
    difficulty: 2,
    resultExplanationText: 'A sudden, rapidly growing, hard nodule on the palm proved to be a keratoacanthoma.',
    sourceNote:
      'Final diagnosis was not stated in the source text and was generated to complete this case, per user instruction — the sudden, rapid, dome-shaped hard nodule is consistent with keratoacanthoma.',
  },
  {
    patientName: 'Żaklina Adamska',
    age: 7,
    sex: 'FEMALE',
    occupation: null,
    bodyRegion: 'LEFT_LEG',
    imageFile: 'case-24.jpg',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Histopathology confirmed Spitzoid-type melanoma, classified as pT2a. After specialist review, a wide re-excision and sentinel lymph node biopsy were performed, showing no residual tumor and no nodal involvement. Further workup excluded systemic disease. Genetic testing revealed a pathogenic CHEK2 mutation (c.444+1G>A), leading to a genetic counseling referral for the family and close ongoing oncologic and dermatologic surveillance.',
    documents: [
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Clinical symptoms',
        content: { description: 'Presented with a rapidly growing, nodular lesion on the thigh, which was excised.' },
      },
    ],
    diagnosisCode: 'melanoma',
    treatmentCode: 'surgical-excision',
    difficulty: 3,
    resultExplanationText:
      'A pediatric Spitzoid melanoma with a pathogenic CHEK2 mutation, requiring family genetic counseling and lifelong surveillance.',
    sourceNote: null,
  },
  {
    patientName: 'Stanisława Krzemień',
    age: 67,
    sex: 'FEMALE',
    occupation: null,
    bodyRegion: 'RIGHT_FOOT',
    imageFile: 'case-25.jpg',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'X-ray of the toe showed no bone damage or infiltration. A shave biopsy confirmed basal cell carcinoma of the nail unit.',
    documents: [
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Clinical symptoms',
        content: {
          description:
            'Otherwise healthy, presenting with a lesion at the base of the right big toenail present for 18 months, with no history of mechanical trauma. Completely painless and very slow-growing, periodically ulcerating and bleeding lightly (for example when rubbed by a sock). The lesion measures 1.5cm x 2cm around the nail apparatus, with pearly-white raised borders and an indurated, ulcerated center. Inguinal lymph nodes are not palpable and pedal pulses are well felt (4/4).',
        },
      },
    ],
    diagnosisCode: 'basal-cell-carcinoma',
    treatmentCode: 'surgical-excision',
    difficulty: 2,
    resultExplanationText:
      'A slow-growing, pearly-bordered, periodically bleeding lesion around the toenail — basal cell carcinoma of the nail unit, with no bony invasion.',
    sourceNote: null,
  },
  {
    patientName: 'Klementyna Wróbel',
    age: 58,
    sex: 'FEMALE',
    occupation: 'Sailing Instructor',
    bodyRegion: 'HEAD',
    imageFile: 'case-26.jpg',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Biopsy confirms basal cell carcinoma of the ear; Mohs micrographic surgery was chosen given the cosmetically sensitive location.',
    documents: [
      {
        type: 'UV_EXPOSURE_HISTORY',
        title: 'UV exposure history',
        content: { history: 'A longtime sailing instructor who spends nearly every season in full sun.' },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Clinical symptoms',
        content: {
          description:
            "For several months, a small change on the upper edge of the ear that initially looked like a minor scrape but gradually turned into a hard, pink nodule covered with thick, keratotic skin. The nodule is painless, doesn't itch, and doesn't bother her even while sleeping, though it is visible to others.",
        },
      },
    ],
    diagnosisCode: 'basal-cell-carcinoma',
    treatmentCode: 'mohs-surgery',
    difficulty: 2,
    resultExplanationText:
      "A pink, keratotic ear nodule in a lifelong sun-exposed sailing instructor — basal cell carcinoma, treated with Mohs surgery to preserve the ear's structure.",
    sourceNote:
      'The source text was cut off before stating a final diagnosis. This conclusion was generated to complete the case, per user instruction — a pearly/keratotic nodule on a chronically sun-exposed ear is a textbook basal cell carcinoma presentation.',
  },
  {
    patientName: 'Elwira Nowak',
    age: 42,
    sex: 'FEMALE',
    occupation: 'Construction Worker',
    bodyRegion: 'LEFT_FOOT',
    imageFile: 'case-27.jpg',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Biopsy confirmed a neoplastic origin: basal cell carcinoma of the sole (acral BCC), previously mistaken for treatment-resistant athlete’s foot.',
    documents: [
      {
        type: 'DISEASE_HISTORY',
        title: 'Disease history',
        content: { history: 'No family history of skin cancer, and no history of radiation or arsenic exposure.' },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Clinical symptoms',
        content: {
          description:
            "Works physically on construction sites for 20 years, requiring heavy, tight work boots all day, causing chronic friction and moisture retention on the feet. First noticed the lesion on the sole of the left foot around age 20; over the years it slowly grew and became increasingly itchy. Repeatedly diagnosed by general practitioners as athlete's foot and treated with repeated antifungal ointments with no improvement. Examination found a well-demarcated, asymmetric, heavily keratotic plaque measuring 3.3cm x 2cm. Lymph nodes were unremarkable.",
        },
      },
    ],
    diagnosisCode: 'basal-cell-carcinoma',
    treatmentCode: 'surgical-excision',
    difficulty: 2,
    resultExplanationText: 'A plaque on the sole misdiagnosed as fungal infection for years was actually acral basal cell carcinoma.',
    sourceNote: null,
  },
  {
    patientName: 'Ryszard Wolski',
    age: 62,
    sex: 'MALE',
    occupation: 'Office Worker',
    bodyRegion: 'RIGHT_FOOT',
    imageFile: 'case-28.jpg',
    examinationSku: 'exam-dermoscopy',
    examinationFindings:
      'Dermoscopy reveals a parallel ridge pattern — a finding strongly specific for acral lentiginous melanoma. Referred for biopsy to confirm.',
    documents: [
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Clinical symptoms',
        content: {
          description:
            'A non-healing lesion on the sole of the foot, first appearing about 1.5 years ago. Initially believed to be a corn, and treated with corn plasters and pumice stone, which caused bleeding and pain. The lesion began darkening, growing, and bleeding intermittently without clear cause. It has irregular borders.',
        },
      },
    ],
    diagnosisCode: 'melanoma',
    treatmentCode: null,
    difficulty: 3,
    resultExplanationText:
      'A darkening, bleeding sole lesion, mistaken for years as a corn, shows the parallel ridge pattern on dermoscopy that is a hallmark sign of acral lentiginous melanoma.',
    sourceNote:
      'The source text ends at the biopsy referral without stating a confirmed result. The parallel ridge pattern described is a well-established, highly specific dermoscopic sign of acral lentiginous melanoma, so this diagnosis is a high-confidence inference rather than a freely invented one.',
  },
  {
    patientName: 'Paulina Górecka',
    age: 28,
    sex: 'FEMALE',
    occupation: null,
    bodyRegion: 'LEFT_ARM',
    imageFile: 'case-29.jpg',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Lymph node biopsy and brain imaging confirm metastatic melanoma with axillary nodal and brain involvement, explaining the new seizures; urgent multidisciplinary oncology referral was made given the pregnancy.',
    documents: [
      {
        type: 'DISEASE_HISTORY',
        title: 'Disease history',
        content: { history: '26 weeks pregnant.' },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Clinical symptoms',
        content: {
          description:
            'Recently developed new left-sided seizures. Around the same time, noticed significantly enlarged lymph nodes under the arm — hard but not painful. Has also had recent weight loss and episodes of fever, and is acutely worried given the risk to her unborn child.',
        },
      },
    ],
    diagnosisCode: 'melanoma',
    treatmentCode: 'referral-oncology',
    difficulty: 3,
    resultExplanationText:
      'New seizures plus hard axillary lymphadenopathy, weight loss, and fever in a pregnant patient revealed metastatic melanoma with brain involvement — a rare and urgent presentation requiring careful management around the pregnancy.',
    sourceNote:
      'No diagnosis or treatment was stated in the source text, which reads as an incomplete fragment. This conclusion was generated to complete the case, per user instruction — new seizures with hard lymphadenopathy, weight loss, and fever together point to metastatic disease with CNS involvement.',
  },
  {
    patientName: 'Roman Głowacki',
    age: 63,
    sex: 'MALE',
    occupation: 'Farmer',
    bodyRegion: 'HEAD',
    imageFile: 'case-30.jpg',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings:
      'Imaging shows a sharply demarcated, contrast-enhancing soft tissue mass; biopsy confirms basal cell carcinoma of the external auditory canal.',
    documents: [
      {
        type: 'UV_EXPOSURE_HISTORY',
        title: 'UV exposure history',
        content: {
          history:
            'Lifelong outdoor farm work with chronic sun exposure. No prior trauma or radiotherapy. Non-smoker, occasional alcohol use.',
        },
      },
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Clinical symptoms',
        content: {
          description:
            'Presented to an ENT clinic with 6 months of right ear problems: persistent discomfort, increasing itch, and intermittent bloody discharge, along with a sense of a small mass inside the ear canal and intermittent ear pain. Denies hearing loss, dizziness, or facial weakness. The external auditory canal shows an irregular, non-ulcerated lesion measuring 2.1cm x 1.3cm with raised, pearly borders, central crusting, and minimal bleeding on touch. The eardrum is intact and neck lymph nodes are not enlarged.',
        },
      },
    ],
    diagnosisCode: 'basal-cell-carcinoma',
    treatmentCode: 'surgical-excision',
    difficulty: 3,
    resultExplanationText:
      'A raised, pearly-bordered lesion inside the ear canal in a lifelong outdoor farm worker — basal cell carcinoma of the external auditory canal, a rare site.',
    sourceNote: null,
  },
  {
    patientName: 'Sabrina Kowal',
    age: 45,
    sex: 'FEMALE',
    occupation: 'Nurse',
    bodyRegion: 'HEAD',
    imageFile: 'case-31.jpg',
    examinationSku: 'exam-punch-biopsy',
    examinationFindings: 'Biopsy rules out malignancy and shows actinic keratosis — a precancerous, sun-related change, not cancer.',
    documents: [
      {
        type: 'CLINICAL_SYMPTOMS',
        title: 'Clinical symptoms',
        content: {
          description:
            'Lived for three and a half years with a scaling, dry sore above the lip. Her primary care doctor repeatedly treated it with creams for eczema and rash, without improvement. As a trained nurse, she grew suspicious and asked for a skin biopsy herself to rule out cancer.',
        },
      },
    ],
    diagnosisCode: 'actinic-keratosis',
    treatmentCode: null,
    difficulty: 1,
    resultExplanationText:
      'A persistent scaly sore above the lip, unresponsive to eczema treatment, turned out to be actinic keratosis rather than cancer.',
    sourceNote: null,
  },
];
