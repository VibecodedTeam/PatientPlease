import { NoActiveGameError, NoOpenDayError } from './game.js';
import type { GameSessionRecord, GameSessionStatusValue } from './round.js';

export interface DiagnosisAttemptRecord {
  id: string;
  caseId: string;
  selectedDiagnosisId: string;
  selectedTreatmentId: string | null;
  isDiagnosisCorrect: boolean;
  isTreatmentCorrect: boolean | null;
  moneyDelta: number;
  attemptedAt: Date;
}

/** Narrow, structurally-compatible subset of PrismaClient this service depends on — mirrors ExaminationPrismaClient in services/examination.ts. */
export interface DiagnosisPrismaClient {
  gameSession: {
    findFirst(args: {
      where: { userId: string };
      orderBy: { createdAt: 'desc' };
    }): Promise<GameSessionRecord | null>;
    update(args: { where: { id: string }; data: { money: number } }): Promise<GameSessionRecord>;
  };
  case: {
    findUnique(args: { where: { id: string } }): Promise<{
      id: string;
      correctDiagnosisId: string;
      correctTreatmentId: string | null;
      moneyReward: number;
      moneyPenalty: number;
    } | null>;
  };
  diagnosis: {
    findUnique(args: { where: { id: string } }): Promise<{ id: string } | null>;
  };
  treatment: {
    findUnique(args: { where: { id: string } }): Promise<{ id: string } | null>;
  };
  gameDayLog: {
    findFirst(args: { where: { gameSessionId: string; endedAt: null } }): Promise<{
      id: string;
    } | null>;
  };
  diagnosisAttempt: {
    findFirst(args: {
      where: { caseId: string; gameDayLog: { gameSessionId: string } };
    }): Promise<{ id: string } | null>;
    create(args: {
      data: {
        gameDayLogId: string;
        caseId: string;
        selectedDiagnosisId: string;
        selectedTreatmentId: string | null;
        isDiagnosisCorrect: boolean;
        isTreatmentCorrect: boolean | null;
        moneyDelta: number;
      };
    }): Promise<DiagnosisAttemptRecord>;
  };
  $transaction<T>(fn: (tx: DiagnosisPrismaClient) => Promise<T>): Promise<T>;
}

export class CaseNotFoundError extends Error {
  constructor(message = 'Case not found') {
    super(message);
    this.name = 'CaseNotFoundError';
  }
}

export class DiagnosisNotFoundError extends Error {
  constructor(message = 'Diagnosis not found') {
    super(message);
    this.name = 'DiagnosisNotFoundError';
  }
}

export class TreatmentNotFoundError extends Error {
  constructor(message = 'Treatment not found') {
    super(message);
    this.name = 'TreatmentNotFoundError';
  }
}

export class DiagnosisAlreadyAttemptedError extends Error {
  constructor(message = 'This case already has a DiagnosisAttempt in this session') {
    super(message);
    this.name = 'DiagnosisAlreadyAttemptedError';
  }
}

async function findLatestGameSession(
  prisma: DiagnosisPrismaClient,
  userId: string,
): Promise<GameSessionRecord | null> {
  return prisma.gameSession.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
}

async function requireActiveGameSession(
  prisma: DiagnosisPrismaClient,
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

export async function submitDiagnosis(
  prisma: DiagnosisPrismaClient,
  userId: string,
  caseId: string,
  selectedDiagnosisId: string,
  selectedTreatmentId: string | null,
): Promise<{
  gameSession: GameSessionRecord;
  result: { isDiagnosisCorrect: boolean; isTreatmentCorrect: boolean | null; moneyDelta: number };
}> {
  const session = await requireActiveGameSession(prisma, userId);

  const openDayLog = await prisma.gameDayLog.findFirst({
    where: { gameSessionId: session.id, endedAt: null },
  });
  if (!openDayLog) {
    throw new NoOpenDayError();
  }

  const gameCase = await prisma.case.findUnique({ where: { id: caseId } });
  if (!gameCase) {
    throw new CaseNotFoundError();
  }

  const diagnosis = await prisma.diagnosis.findUnique({ where: { id: selectedDiagnosisId } });
  if (!diagnosis) {
    throw new DiagnosisNotFoundError();
  }

  if (selectedTreatmentId !== null) {
    const treatment = await prisma.treatment.findUnique({ where: { id: selectedTreatmentId } });
    if (!treatment) {
      throw new TreatmentNotFoundError();
    }
  }

  const existing = await prisma.diagnosisAttempt.findFirst({
    where: { caseId, gameDayLog: { gameSessionId: session.id } },
  });
  if (existing) {
    throw new DiagnosisAlreadyAttemptedError();
  }

  const isDiagnosisCorrect = selectedDiagnosisId === gameCase.correctDiagnosisId;
  const isTreatmentCorrect =
    selectedTreatmentId !== null ? selectedTreatmentId === gameCase.correctTreatmentId : null;
  const moneyDelta = isDiagnosisCorrect ? gameCase.moneyReward : -gameCase.moneyPenalty;

  // The money update and the attempt record commit together so a failed create
  // can't leave the player charged/rewarded with no record of the attempt.
  const updatedSession = await prisma.$transaction(async (tx) => {
    const txSession = await tx.gameSession.update({
      where: { id: session.id },
      data: { money: Math.max(0, session.money + moneyDelta) },
    });

    await tx.diagnosisAttempt.create({
      data: {
        gameDayLogId: openDayLog.id,
        caseId,
        selectedDiagnosisId,
        selectedTreatmentId,
        isDiagnosisCorrect,
        isTreatmentCorrect,
        moneyDelta,
      },
    });

    return txSession;
  });

  return {
    gameSession: toGameSessionResponse(updatedSession),
    result: { isDiagnosisCorrect, isTreatmentCorrect, moneyDelta },
  };
}
