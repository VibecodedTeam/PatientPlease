import { EXAMINATION_FAILURE_PENALTY_MONEY } from '../constants.js';
import { NoActiveGameError, NoOpenDayError } from './game.js';
import type { GameSessionRecord, GameSessionStatusValue } from './round.js';

export interface CaseExaminationRecord {
  id: string;
  caseId: string;
  shopItemId: string;
  isSuccessful: boolean;
  orderedAt: Date;
}

/** Narrow, structurally-compatible subset of PrismaClient this service depends on — mirrors RoundPrismaClient in services/round.ts. */
export interface ExaminationPrismaClient {
  gameSession: {
    findFirst(args: {
      where: { userId: string };
      orderBy: { createdAt: 'desc' };
    }): Promise<GameSessionRecord | null>;
    update(args: { where: { id: string }; data: { money: number } }): Promise<GameSessionRecord>;
  };
  case: {
    findUnique(args: { where: { id: string } }): Promise<{ id: string } | null>;
  };
  shopItem: {
    findUnique(args: {
      where: { id: string };
    }): Promise<{ id: string; itemType: string; content: unknown } | null>;
  };
  ownedItem: {
    findFirst(args: {
      where: { gameSessionId: string; shopItemId: string };
    }): Promise<{ id: string } | null>;
  };
  caseExamination: {
    findFirst(args: {
      where: { gameSessionId: string; caseId: string; shopItemId: string };
    }): Promise<{ id: string } | null>;
    create(args: {
      data: { gameSessionId: string; caseId: string; shopItemId: string; isSuccessful: boolean };
    }): Promise<CaseExaminationRecord>;
  };
  gameDayLog: {
    findFirst(args: {
      where: { gameSessionId: string; endedAt: null };
    }): Promise<{ id: string; extraElapsedMs: number } | null>;
    update(args: { where: { id: string }; data: { extraElapsedMs: number } }): Promise<unknown>;
  };
  caseDocument: {
    findMany(args: {
      where: { caseId: string; type: 'EXAMINATION_RESULTS' };
    }): Promise<{ id: string; content: unknown }[]>;
  };
  $transaction<T>(fn: (tx: ExaminationPrismaClient) => Promise<T>): Promise<T>;
}

export class CaseNotFoundError extends Error {
  constructor(message = 'Case not found') {
    super(message);
    this.name = 'CaseNotFoundError';
  }
}

export class NotAnExaminationError extends Error {
  constructor(message = 'ShopItem is not an EXAMINATION item') {
    super(message);
    this.name = 'NotAnExaminationError';
  }
}

export class ExaminationNotOwnedError extends Error {
  constructor(message = 'Player does not own this examination') {
    super(message);
    this.name = 'ExaminationNotOwnedError';
  }
}

export class ExaminationAlreadyOrderedError extends Error {
  constructor(message = 'This examination has already been ordered for this case') {
    super(message);
    this.name = 'ExaminationAlreadyOrderedError';
  }
}

async function findLatestGameSession(
  prisma: ExaminationPrismaClient,
  userId: string,
): Promise<GameSessionRecord | null> {
  return prisma.gameSession.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
}

async function requireActiveGameSession(
  prisma: ExaminationPrismaClient,
  userId: string,
): Promise<GameSessionRecord> {
  const session = await findLatestGameSession(prisma, userId);

  if (!session || session.status !== ('ACTIVE' satisfies GameSessionStatusValue)) {
    throw new NoActiveGameError();
  }

  return session;
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

function toCaseExaminationResponse(record: CaseExaminationRecord): CaseExaminationRecord {
  return {
    id: record.id,
    caseId: record.caseId,
    shopItemId: record.shopItemId,
    isSuccessful: record.isSuccessful,
    orderedAt: record.orderedAt,
  };
}

export async function orderExamination(
  prisma: ExaminationPrismaClient,
  userId: string,
  caseId: string,
  shopItemId: string,
): Promise<{ gameSession: GameSessionRecord; caseExamination: CaseExaminationRecord }> {
  const session = await requireActiveGameSession(prisma, userId);

  const gameCase = await prisma.case.findUnique({ where: { id: caseId } });
  if (!gameCase) {
    throw new CaseNotFoundError();
  }

  const shopItem = await prisma.shopItem.findUnique({ where: { id: shopItemId } });
  if (!shopItem || shopItem.itemType !== 'EXAMINATION') {
    throw new NotAnExaminationError();
  }

  const owned = await prisma.ownedItem.findFirst({
    where: { gameSessionId: session.id, shopItemId },
  });
  if (!owned) {
    throw new ExaminationNotOwnedError();
  }

  const existing = await prisma.caseExamination.findFirst({
    where: { gameSessionId: session.id, caseId, shopItemId },
  });
  if (existing) {
    throw new ExaminationAlreadyOrderedError();
  }

  const openDayLog = await prisma.gameDayLog.findFirst({
    where: { gameSessionId: session.id, endedAt: null },
  });
  if (!openDayLog) {
    throw new NoOpenDayError();
  }

  const resultDocuments = await prisma.caseDocument.findMany({
    where: { caseId, type: 'EXAMINATION_RESULTS' },
  });
  const isSuccessful = resultDocuments.some(
    (document) => (document.content as { shopItemId?: string } | null)?.shopItemId === shopItemId,
  );

  const timeCostMs = (shopItem.content as { timeCostMs?: number } | null)?.timeCostMs ?? 0;

  // Time cost, failure penalty, and the examination record commit together so a
  // failed create can't leave the player charged/time-docked with no record —
  // which would let the same examination be re-ordered and penalized again.
  const { updatedSession, created } = await prisma.$transaction(async (tx) => {
    await tx.gameDayLog.update({
      where: { id: openDayLog.id },
      data: { extraElapsedMs: openDayLog.extraElapsedMs + timeCostMs },
    });

    let txSession = session;
    if (!isSuccessful) {
      txSession = await tx.gameSession.update({
        where: { id: session.id },
        // Floor at zero: the penalty must never push the balance negative.
        data: { money: Math.max(0, session.money - EXAMINATION_FAILURE_PENALTY_MONEY) },
      });
    }

    const txCreated = await tx.caseExamination.create({
      data: { gameSessionId: session.id, caseId, shopItemId, isSuccessful },
    });

    return { updatedSession: txSession, created: txCreated };
  });

  return {
    gameSession: toGameSessionResponse(updatedSession),
    caseExamination: toCaseExaminationResponse(created),
  };
}
