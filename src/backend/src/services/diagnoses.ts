import { NoActiveGameError, NoOpenDayError } from './game.js';
import type { GameSessionRecord } from './round.js';

/** Narrow, structurally-compatible subset of PrismaClient this service depends on — mirrors ShopPrismaClient in services/shop.ts. */
export interface DiagnosisPrismaClient {
  gameSession: {
    findFirst(args: {
      where: { userId: string };
      orderBy: { createdAt: 'desc' };
    }): Promise<GameSessionRecord | null>;
    update(args: { where: { id: string }; data: { money: number } }): Promise<GameSessionRecord>;
  };
  gameDayLog: {
    findFirst(args: {
      where: { gameSessionId: string; endedAt: null };
    }): Promise<{ id: string } | null>;
  };
  case: {
    findUnique(args: { where: { id: string } }): Promise<{
      id: string;
      correctDiagnosisId: string;
      moneyReward: number;
      moneyPenalty: number;
    } | null>;
  };
  diagnosisAttempt: {
    findFirst(args: {
      where: { gameDayLogId: string; caseId: string };
    }): Promise<{ id: string } | null>;
    create(args: {
      data: {
        gameDayLogId: string;
        caseId: string;
        selectedDiagnosisId: string;
        isDiagnosisCorrect: boolean;
        moneyDelta: number;
      };
    }): Promise<unknown>;
  };
  $transaction<T>(fn: (tx: DiagnosisPrismaClient) => Promise<T>): Promise<T>;
}

export class CaseNotFoundError extends Error {
  constructor(message = 'Case not found') {
    super(message);
    this.name = 'CaseNotFoundError';
  }
}

export class CaseAlreadyAttemptedError extends Error {
  constructor(message = 'This Case already has a DiagnosisAttempt for the open day') {
    super(message);
    this.name = 'CaseAlreadyAttemptedError';
  }
}

async function requireActiveGameSession(
  prisma: DiagnosisPrismaClient,
  userId: string,
): Promise<GameSessionRecord> {
  const session = await prisma.gameSession.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  if (!session || session.status !== 'ACTIVE') {
    throw new NoActiveGameError();
  }

  return session;
}

async function requireOpenGameDayLog(
  prisma: DiagnosisPrismaClient,
  gameSessionId: string,
): Promise<{ id: string }> {
  const open = await prisma.gameDayLog.findFirst({
    where: { gameSessionId, endedAt: null },
  });

  if (!open) {
    throw new NoOpenDayError();
  }

  return open;
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

/**
 * Records the player's diagnosis for a case: grades it server-side against the
 * case's real correctDiagnosisId (the frontend never sees that field — see
 * docs/api/round.md), persists a DiagnosisAttempt so selectNextCase (round.ts)
 * stops re-serving this case, and credits/debits the session's money by the
 * case's real moneyReward/moneyPenalty.
 */
export async function submitDiagnosis(
  prisma: DiagnosisPrismaClient,
  userId: string,
  input: { caseId: string; selectedDiagnosisId: string },
): Promise<{ gameSession: GameSessionRecord; isDiagnosisCorrect: boolean; moneyDelta: number }> {
  const session = await requireActiveGameSession(prisma, userId);
  const openDayLog = await requireOpenGameDayLog(prisma, session.id);

  const gameCase = await prisma.case.findUnique({ where: { id: input.caseId } });
  if (!gameCase) {
    throw new CaseNotFoundError();
  }

  const existingAttempt = await prisma.diagnosisAttempt.findFirst({
    where: { gameDayLogId: openDayLog.id, caseId: input.caseId },
  });
  if (existingAttempt) {
    throw new CaseAlreadyAttemptedError();
  }

  const isDiagnosisCorrect = input.selectedDiagnosisId === gameCase.correctDiagnosisId;
  const moneyDelta = isDiagnosisCorrect ? gameCase.moneyReward : -gameCase.moneyPenalty;

  // Record the attempt + adjust the balance atomically: a failed money update
  // must not leave an attempt recorded with no matching balance change.
  const updatedSession = await prisma.$transaction(async (tx) => {
    await tx.diagnosisAttempt.create({
      data: {
        gameDayLogId: openDayLog.id,
        caseId: input.caseId,
        selectedDiagnosisId: input.selectedDiagnosisId,
        isDiagnosisCorrect,
        moneyDelta,
      },
    });

    return tx.gameSession.update({
      where: { id: session.id },
      data: { money: session.money + moneyDelta },
    });
  });

  return { gameSession: toGameSessionResponse(updatedSession), isDiagnosisCorrect, moneyDelta };
}
