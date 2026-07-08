export type DiagnosisCategoryValue =
  'BENIGN' | 'MALIGNANT' | 'INFLAMMATORY' | 'INFECTIOUS' | 'OTHER';
export type TreatmentKindValue =
  'TOPICAL' | 'ORAL_MEDICATION' | 'PROCEDURE' | 'REFERRAL' | 'MONITORING' | 'NONE';
export type ShopItemTypeValue = 'EQUIPMENT' | 'HANDBOOK' | 'PLOT_ITEM';
export type SexValue = 'MALE' | 'FEMALE' | 'OTHER';
export type CaseDocumentTypeValue =
  | 'SKIN_IMAGE'
  | 'DISEASE_HISTORY'
  | 'UV_EXPOSURE_HISTORY'
  | 'CLINICAL_SYMPTOMS'
  | 'FAMILY_HISTORY'
  | 'WEATHER_HISTORY';
export type BodyRegionValue =
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

export interface DiagnosisSeedRow {
  id: string;
  code: string;
  name: string;
  description: string;
  category: DiagnosisCategoryValue;
}

export interface TreatmentSeedRow {
  id: string;
  code: string;
  name: string;
  description: string;
  kind: TreatmentKindValue;
}

export interface ShopItemSeedRow {
  id: string;
  sku: string;
  name: string;
  description: string;
  itemType: ShopItemTypeValue;
  price: number;
  unlockDay: number | null;
  isActive: boolean;
  iconImageUrl: string | null;
}

export interface PatientSeedRow {
  id: string;
  name: string;
  age: number;
  sex: SexValue;
  occupation: string | null;
  portraitImageUrl: string;
  bodyModelVariant: string;
}

export interface CaseSeedRow {
  id: string;
  patientId: string;
  difficulty: number;
  correctDiagnosisId: string;
  correctTreatmentId: string | null;
  moneyReward: number;
  moneyPenalty: number;
  resultExplanationText: string;
  isActive: boolean;
}

/** Structurally matches Prisma's own recursive InputJsonValue shape, defined locally instead of
 * imported so this file stays decoupled from generated Prisma types (see SeedPrismaClient doc
 * comment below) — `unknown`-valued Records aren't assignable into Prisma's Json input, but this
 * recursive alias is. */
export type SeedJsonValue =
  string | number | boolean | null | SeedJsonValue[] | { [key: string]: SeedJsonValue };

export interface CaseDocumentSeedRow {
  id: string;
  caseId: string;
  attentionPointRegion: BodyRegionValue | null;
  type: CaseDocumentTypeValue;
  title: string;
  documentDate: Date | null;
  sortOrder: number;
  imageUrl: string | null;
  imageWidthPx: number | null;
  imageHeightPx: number | null;
  imageAltText: string | null;
  /** Prisma's nullable Json create/update input doesn't accept plain `null` (it has its own
   * NullableJsonNullValueInput sentinel for an explicit JSON null) — omit the field via
   * `undefined` instead when a document has no structured content. */
  content?: { [key: string]: SeedJsonValue };
}

export interface CaseHintSeedRow {
  id: string;
  caseId: string;
  content: string;
  sortOrder: number;
  unlockAfterDay: number | null;
  requiredShopItemId: string | null;
}

/** Narrow, structurally-compatible subset of PrismaClient the seed layer depends on — mirrors
 * RoundPrismaClient (services/round.ts) and AuthPrismaClient (services/auth.ts): only the
 * .upsert(...) methods each seed function actually calls, so seed functions stay unit-testable
 * against plain fakes, not just real Prisma. */
export interface SeedPrismaClient {
  diagnosis: {
    upsert(args: {
      where: { id: string };
      update: Omit<DiagnosisSeedRow, 'id'>;
      create: DiagnosisSeedRow;
    }): Promise<unknown>;
  };
  treatment: {
    upsert(args: {
      where: { id: string };
      update: Omit<TreatmentSeedRow, 'id'>;
      create: TreatmentSeedRow;
    }): Promise<unknown>;
  };
  shopItem: {
    upsert(args: {
      where: { id: string };
      update: Omit<ShopItemSeedRow, 'id'>;
      create: ShopItemSeedRow;
    }): Promise<unknown>;
  };
  patient: {
    upsert(args: {
      where: { id: string };
      update: Omit<PatientSeedRow, 'id'>;
      create: PatientSeedRow;
    }): Promise<unknown>;
  };
  case: {
    upsert(args: {
      where: { id: string };
      update: Omit<CaseSeedRow, 'id'>;
      create: CaseSeedRow;
    }): Promise<unknown>;
  };
  caseDocument: {
    upsert(args: {
      where: { id: string };
      update: Omit<CaseDocumentSeedRow, 'id'>;
      create: CaseDocumentSeedRow;
    }): Promise<unknown>;
  };
  caseHint: {
    upsert(args: {
      where: { id: string };
      update: Omit<CaseHintSeedRow, 'id'>;
      create: CaseHintSeedRow;
    }): Promise<unknown>;
  };
}
