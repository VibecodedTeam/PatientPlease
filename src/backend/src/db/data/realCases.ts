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

export const REAL_CASES: RealCaseSeed[] = [];
