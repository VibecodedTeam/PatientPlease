import { computeEffectiveElapsedMs } from './dayElapsed.js';

export type GameSessionStatusValue = 'ACTIVE' | 'PAUSED' | 'GAME_OVER' | 'COMPLETED';

export interface GameSessionRecord {
  id: string;
  money: number;
  studentLoanThreshold: number | null;
  consecutiveBadDiagnosisCount: number;
  status: GameSessionStatusValue;
  createdAt: Date;
  updatedAt: Date;
}

export interface PatientRecord {
  id: string;
  name: string;
  age: number;
  sex: 'MALE' | 'FEMALE' | 'OTHER';
  occupation: string | null;
  portraitImageUrl: string;
  bodyModelVariant: string;
}

export interface CaseDocumentRecord {
  id: string;
  attentionPointRegion: string | null;
  type: string;
  title: string;
  documentDate: Date | null;
  sortOrder: number;
  imageUrl: string | null;
  imageWidthPx: number | null;
  imageHeightPx: number | null;
  imageAltText: string | null;
  content: unknown;
}

export interface CaseRecord {
  id: string;
  difficulty: number;
  correctDiagnosisId: string;
  moneyReward: number;
  moneyPenalty: number;
  patient: PatientRecord;
  documents: CaseDocumentRecord[];
}

export interface GameDayLogRecord {
  id: string;
  dayNumber: number;
  startingMoney: number;
  endingMoney: number | null;
  casesAttempted: number;
  casesCorrect: number;
  thresholdMet: boolean | null;
  penaltyApplied: boolean | null;
  startedAt: Date;
  pausedAt: Date | null;
  totalPausedMs: number;
  extraElapsedMs: number;
  endedAt: Date | null;
}

/** Client-facing subset of GameDayLogRecord — pausedAt/totalPausedMs/extraElapsedMs are
 * pause/time-accounting internals, never exposed in API responses. */
export interface GameDayLogResponse {
  id: string;
  dayNumber: number;
  startingMoney: number;
  endingMoney: number | null;
  casesAttempted: number;
  casesCorrect: number;
  thresholdMet: boolean | null;
  penaltyApplied: boolean | null;
  startedAt: Date;
  endedAt: Date | null;
  /** Effective elapsed time (wall-clock minus paused time, plus examination time costs) that the
   * day reached — only endDay's response populates this (see services/game.ts). */
  elapsedMs: number;
}

export interface ShopItemRecord {
  id: string;
  sku: string;
  name: string;
  description: string;
  itemType: string;
  iconImageUrl: string | null;
}

export interface OwnedItemRecord {
  id: string;
  shopItem: ShopItemRecord;
  purchasePrice: number;
  purchasedOnDay: number;
  purchasedAt: Date;
  isEquipped: boolean;
}

export interface DiagnosisRecord {
  id: string;
  code: string;
  name: string;
  category: string;
}

export interface TreatmentRecord {
  id: string;
  code: string;
  name: string;
  kind: string;
}

/** Narrow, structurally-compatible subset of PrismaClient this service depends on — keeps unit tests free of the full generated client shape (mirrors AuthPrismaClient in services/auth.ts). */
export interface RoundPrismaClient {
  gameSession: {
    findFirst(args: {
      where: { userId: string };
      orderBy: { createdAt: 'desc' };
    }): Promise<GameSessionRecord | null>;
    create(args: {
      data: {
        userId: string;
        money: number;
        consecutiveBadDiagnosisCount: number;
        status: GameSessionStatusValue;
      };
    }): Promise<GameSessionRecord>;
    update(args: {
      where: { id: string };
      data: { status: GameSessionStatusValue };
    }): Promise<GameSessionRecord>;
  };
  case: {
    findFirst(args: {
      where: {
        isActive: boolean;
        diagnosisAttempts: { none: { gameDayLog: { gameSessionId: string } } };
      };
      orderBy: { difficulty: 'asc' };
      select: { difficulty: true };
    }): Promise<{ difficulty: number } | null>;
    findMany(args: {
      where: {
        isActive: boolean;
        difficulty: number;
        diagnosisAttempts: { none: { gameDayLog: { gameSessionId: string } } };
      };
      orderBy: { id: 'asc' };
      include: { patient: true; documents: { orderBy: { sortOrder: 'asc' } } };
    }): Promise<CaseRecord[]>;
  };
  gameDayLog: {
    findFirst(args: {
      where: { gameSessionId: string; endedAt?: null };
      orderBy?: { dayNumber: 'desc' };
    }): Promise<GameDayLogRecord | null>;
    create(args: {
      data: { gameSessionId: string; dayNumber: number; startingMoney: number; startedAt: Date };
    }): Promise<GameDayLogRecord>;
    update(args: {
      where: { id: string };
      data: { pausedAt: null; totalPausedMs: number };
    }): Promise<GameDayLogRecord>;
  };
  ownedItem: {
    findMany(args: {
      where: { gameSessionId: string };
      include: { shopItem: true };
      orderBy: { purchasedAt: 'asc' };
    }): Promise<OwnedItemRecord[]>;
  };
  diagnosis: {
    findMany(args: { orderBy: { name: 'asc' } }): Promise<DiagnosisRecord[]>;
  };
  treatment: {
    findMany(args: { orderBy: { name: 'asc' } }): Promise<TreatmentRecord[]>;
  };
  caseExamination: {
    findMany(args: {
      where: { gameSessionId: string; caseId: string; isSuccessful: true };
      select: { shopItemId: true };
    }): Promise<{ shopItemId: string }[]>;
  };
  caseDocumentReveal: {
    findMany(args: {
      where: { gameSessionId: string; caseId: string };
      select: { caseDocumentId: true };
    }): Promise<{ caseDocumentId: string }[]>;
  };
}

export interface RoundResponse {
  gameSession: GameSessionRecord;
  ownedItems: OwnedItemRecord[];
  case: {
    id: string;
    difficulty: number;
    moneyReward: number;
    moneyPenalty: number;
    patient: PatientRecord;
    documents: CaseDocumentRecord[];
  };
  diagnosisOptions: DiagnosisRecord[];
  treatmentOptions: TreatmentRecord[];
  /** Lets the frontend's day timer resume from the true server-side elapsed
   * time (see services/dayElapsed.ts) instead of restarting from zero on
   * every page refresh / remount. `dayNumber` identifies which day this
   * elapsed belongs to, so the frontend re-seeds the timer when a new day
   * begins (returning from night) rather than only once per mount. */
  dayLog: { elapsedMs: number; dayNumber: number };
}

export class NoCasesRemainingError extends Error {
  constructor(message = 'No un-attempted active cases remain') {
    super(message);
    this.name = 'NoCasesRemainingError';
  }
}

export class GameCompletedError extends Error {
  constructor(message = 'GameSession is already completed') {
    super(message);
    this.name = 'GameCompletedError';
  }
}

export class GameOverError extends Error {
  constructor(message = 'GameSession is already over') {
    super(message);
    this.name = 'GameOverError';
  }
}

const NEW_SESSION_DEFAULTS = { money: 0, consecutiveBadDiagnosisCount: 0 } as const;

export async function resolveGameSession(
  prisma: RoundPrismaClient,
  userId: string,
): Promise<GameSessionRecord> {
  const latest = await prisma.gameSession.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  if (!latest) {
    return prisma.gameSession.create({
      data: { userId, ...NEW_SESSION_DEFAULTS, status: 'ACTIVE' },
    });
  }

  if (latest.status === 'PAUSED') {
    const updated = await prisma.gameSession.update({
      where: { id: latest.id },
      data: { status: 'ACTIVE' },
    });
    const openDayLog = await prisma.gameDayLog.findFirst({
      where: { gameSessionId: latest.id, endedAt: null },
    });
    if (openDayLog?.pausedAt) {
      await prisma.gameDayLog.update({
        where: { id: openDayLog.id },
        data: {
          pausedAt: null,
          totalPausedMs: openDayLog.totalPausedMs + (Date.now() - openDayLog.pausedAt.getTime()),
        },
      });
    }
    return updated;
  }

  // COMPLETED (every case legitimately diagnosed) is a genuine terminal
  // state — surface it as such rather than silently spawning a fresh
  // money:0 session that would wipe progress and replay every case.
  if (latest.status === 'COMPLETED') {
    throw new GameCompletedError();
  }

  // GAME_OVER is what POST /api/v1/game/reset sets specifically so the
  // player can start over (see docs/api/game.md) — treat it exactly like
  // "no session exists yet" rather than a dead end.
  if (latest.status === 'GAME_OVER') {
    return prisma.gameSession.create({
      data: { userId, ...NEW_SESSION_DEFAULTS, status: 'ACTIVE' },
    });
  }

  return latest;
}

/**
 * Deterministically maps a seed string to an index in [0, length). Used to break ties among
 * cases sharing the lowest difficulty: the same gameSessionId always yields the same index for
 * the same candidate count, so repeat `/round` calls stay on the same undiagnosed case, while
 * different sessions (and a shrinking candidate set, once a tied case is diagnosed) land on
 * different indices — "random-looking" across players without needing a stored pointer.
 */
export function pickIndexForSeed(seed: string, length: number): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return Math.abs(hash) % length;
}

const DIAGNOSIS_OPTION_DECOY_COUNT = 3;

/**
 * Narrows the full diagnosis catalog down to the correct diagnosis plus up to
 * DIAGNOSIS_OPTION_DECOY_COUNT random decoys, so the diagnosis panel shows a handful of choices
 * instead of the entire catalog. `random` is injectable (defaults to Math.random) so callers can
 * get a deterministic sequence in tests; startRound calls this fresh on every /round request, so
 * decoys reshuffle even when the same case is being resumed.
 */
export function selectDiagnosisOptions(
  diagnoses: DiagnosisRecord[],
  correctDiagnosisId: string,
  random: () => number = Math.random,
): DiagnosisRecord[] {
  const correct = diagnoses.find((diagnosis) => diagnosis.id === correctDiagnosisId);
  if (!correct) {
    throw new Error(
      `selectDiagnosisOptions: correctDiagnosisId ${correctDiagnosisId} not found in the diagnoses catalog`,
    );
  }
  const remainingPool = diagnoses.filter((diagnosis) => diagnosis.id !== correctDiagnosisId);
  const decoyCount = Math.min(DIAGNOSIS_OPTION_DECOY_COUNT, remainingPool.length);

  const decoys: DiagnosisRecord[] = [];
  for (let i = 0; i < decoyCount; i += 1) {
    // random() is documented/injectable and only contractually promised to behave like
    // Math.random ([0, 1)); clamp so a boundary value of exactly 1 can't push the index
    // past the last valid entry and splice() out an undefined.
    const index = Math.min(Math.floor(random() * remainingPool.length), remainingPool.length - 1);
    decoys.push(remainingPool.splice(index, 1)[0]!);
  }

  return [correct, ...decoys].sort((a, b) => a.name.localeCompare(b.name));
}

export async function selectNextCase(
  prisma: RoundPrismaClient,
  gameSessionId: string,
): Promise<CaseRecord | null> {
  const lowest = await prisma.case.findFirst({
    where: {
      isActive: true,
      diagnosisAttempts: { none: { gameDayLog: { gameSessionId } } },
    },
    orderBy: { difficulty: 'asc' },
    select: { difficulty: true },
  });
  if (!lowest) {
    return null;
  }

  const candidates = await prisma.case.findMany({
    where: {
      isActive: true,
      difficulty: lowest.difficulty,
      diagnosisAttempts: { none: { gameDayLog: { gameSessionId } } },
    },
    orderBy: { id: 'asc' },
    include: { patient: true, documents: { orderBy: { sortOrder: 'asc' } } },
  });

  return candidates[pickIndexForSeed(gameSessionId, candidates.length)] ?? null;
}

export async function resolveOpenGameDayLog(
  prisma: RoundPrismaClient,
  gameSessionId: string,
  sessionMoney: number,
): Promise<GameDayLogRecord> {
  const open = await prisma.gameDayLog.findFirst({ where: { gameSessionId, endedAt: null } });
  if (open) {
    return open;
  }

  const latest = await prisma.gameDayLog.findFirst({
    where: { gameSessionId },
    orderBy: { dayNumber: 'desc' },
  });

  return prisma.gameDayLog.create({
    data: {
      gameSessionId,
      dayNumber: (latest?.dayNumber ?? 0) + 1,
      startingMoney: sessionMoney,
      startedAt: new Date(),
    },
  });
}

const REVEAL_GATED_DOCUMENT_TYPES = new Set([
  'DISEASE_HISTORY',
  'UV_EXPOSURE_HISTORY',
  'CLINICAL_SYMPTOMS',
  'FAMILY_HISTORY',
  'WEATHER_HISTORY',
]);

function isVisibleDocument(
  document: CaseDocumentRecord,
  visibleExaminationShopItemIds: Set<string>,
  revealedDocumentIds: Set<string>,
): boolean {
  if (document.type === 'EXAMINATION_RESULTS') {
    const shopItemId = (document.content as { shopItemId?: string } | null)?.shopItemId;
    return shopItemId !== undefined && visibleExaminationShopItemIds.has(shopItemId);
  }
  if (REVEAL_GATED_DOCUMENT_TYPES.has(document.type)) {
    return revealedDocumentIds.has(document.id);
  }
  return true;
}

function toCaseResponse(
  record: CaseRecord,
  visibleExaminationShopItemIds: Set<string>,
  revealedDocumentIds: Set<string>,
): RoundResponse['case'] {
  return {
    id: record.id,
    difficulty: record.difficulty,
    moneyReward: record.moneyReward,
    moneyPenalty: record.moneyPenalty,
    patient: {
      id: record.patient.id,
      name: record.patient.name,
      age: record.patient.age,
      sex: record.patient.sex,
      occupation: record.patient.occupation,
      portraitImageUrl: record.patient.portraitImageUrl,
      bodyModelVariant: record.patient.bodyModelVariant,
    },
    documents: record.documents
      .filter((document) =>
        isVisibleDocument(document, visibleExaminationShopItemIds, revealedDocumentIds),
      )
      .map((document) => ({
        id: document.id,
        attentionPointRegion: document.attentionPointRegion,
        type: document.type,
        title: document.title,
        documentDate: document.documentDate,
        sortOrder: document.sortOrder,
        imageUrl: document.imageUrl,
        imageWidthPx: document.imageWidthPx,
        imageHeightPx: document.imageHeightPx,
        imageAltText: document.imageAltText,
        content: document.content,
      })),
  };
}

function toOwnedItemResponse(record: OwnedItemRecord): OwnedItemRecord {
  return {
    id: record.id,
    shopItem: {
      id: record.shopItem.id,
      sku: record.shopItem.sku,
      name: record.shopItem.name,
      description: record.shopItem.description,
      itemType: record.shopItem.itemType,
      iconImageUrl: record.shopItem.iconImageUrl,
    },
    purchasePrice: record.purchasePrice,
    purchasedOnDay: record.purchasedOnDay,
    purchasedAt: record.purchasedAt,
    isEquipped: record.isEquipped,
  };
}

function toGameSessionResponse(record: GameSessionRecord): GameSessionRecord {
  return {
    id: record.id,
    money: record.money,
    studentLoanThreshold: record.studentLoanThreshold,
    consecutiveBadDiagnosisCount: record.consecutiveBadDiagnosisCount,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function toDiagnosisResponse(record: DiagnosisRecord): DiagnosisRecord {
  return { id: record.id, code: record.code, name: record.name, category: record.category };
}

function toTreatmentResponse(record: TreatmentRecord): TreatmentRecord {
  return { id: record.id, code: record.code, name: record.name, kind: record.kind };
}

export async function startRound(
  prisma: RoundPrismaClient,
  userId: string,
): Promise<RoundResponse> {
  const session = await resolveGameSession(prisma, userId);

  const nextCase = await selectNextCase(prisma, session.id);
  if (!nextCase) {
    await prisma.gameSession.update({ where: { id: session.id }, data: { status: 'COMPLETED' } });
    throw new NoCasesRemainingError();
  }

  const openDayLog = await resolveOpenGameDayLog(prisma, session.id, session.money);
  const elapsedMs = computeEffectiveElapsedMs({
    startedAt: openDayLog.startedAt,
    totalPausedMs: openDayLog.totalPausedMs,
    extraElapsedMs: openDayLog.extraElapsedMs,
  });

  const [ownedItems, diagnoses, treatments, successfulExaminations, documentReveals] = await Promise.all([
    prisma.ownedItem.findMany({
      where: { gameSessionId: session.id },
      include: { shopItem: true },
      orderBy: { purchasedAt: 'asc' },
    }),
    prisma.diagnosis.findMany({ orderBy: { name: 'asc' } }),
    prisma.treatment.findMany({ orderBy: { name: 'asc' } }),
    prisma.caseExamination.findMany({
      where: { gameSessionId: session.id, caseId: nextCase.id, isSuccessful: true },
      select: { shopItemId: true },
    }),
    prisma.caseDocumentReveal.findMany({
      where: { gameSessionId: session.id, caseId: nextCase.id },
      select: { caseDocumentId: true },
    }),
  ]);
  const visibleExaminationShopItemIds = new Set(
    successfulExaminations.map((examination) => examination.shopItemId),
  );
  const revealedDocumentIds = new Set(documentReveals.map((reveal) => reveal.caseDocumentId));

  return {
    gameSession: toGameSessionResponse(session),
    ownedItems: ownedItems.map(toOwnedItemResponse),
    case: toCaseResponse(nextCase, visibleExaminationShopItemIds, revealedDocumentIds),
    diagnosisOptions: selectDiagnosisOptions(diagnoses, nextCase.correctDiagnosisId).map(
      toDiagnosisResponse,
    ),
    treatmentOptions: treatments.map(toTreatmentResponse),
    dayLog: { elapsedMs, dayNumber: openDayLog.dayNumber },
  };
}
