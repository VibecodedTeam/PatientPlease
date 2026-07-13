import { MIN_DAY_DURATION_MS } from '../constants.js';
import { computeEffectiveElapsedMs } from './dayElapsed.js';
import type {
  GameDayLogRecord,
  GameDayLogResponse,
  GameSessionRecord,
  GameSessionStatusValue,
} from './round.js';

export type { GameDayLogRecord, GameDayLogResponse, GameSessionRecord };

/** Narrow, structurally-compatible subset of PrismaClient this service depends on — mirrors RoundPrismaClient in services/round.ts. */
export interface GamePrismaClient {
  gameSession: {
    findFirst(args: {
      where: { userId: string };
      orderBy: { createdAt: 'desc' };
    }): Promise<GameSessionRecord | null>;
    update(args: {
      where: { id: string };
      data: {
        status?: GameSessionStatusValue;
        money?: number;
        consecutiveBadDiagnosisCount?: number;
      };
    }): Promise<GameSessionRecord>;
  };
  gameDayLog: {
    findFirst(args: {
      where: { gameSessionId: string; endedAt: null };
    }): Promise<GameDayLogRecord | null>;
    update(args: {
      where: { id: string };
      data: {
        pausedAt?: Date | null;
        totalPausedMs?: number;
        endedAt?: Date;
        endingMoney?: number;
        casesAttempted?: number;
        casesCorrect?: number;
        thresholdMet?: boolean | null;
        penaltyApplied?: boolean;
      };
    }): Promise<GameDayLogRecord>;
  };
  diagnosisAttempt: {
    deleteMany(args: { where: { gameDayLogId: string } }): Promise<unknown>;
    findMany(args: {
      where: { gameDayLogId: string };
      select: { isDiagnosisCorrect: true };
    }): Promise<{ isDiagnosisCorrect: boolean }[]>;
  };
  $transaction<T>(fn: (tx: GamePrismaClient) => Promise<T>): Promise<T>;
}

export class NoActiveGameError extends Error {
  constructor(message = 'No active GameSession') {
    super(message);
    this.name = 'NoActiveGameError';
  }
}

export class NoOpenDayError extends Error {
  constructor(message = 'GameSession has no open GameDayLog') {
    super(message);
    this.name = 'NoOpenDayError';
  }
}

export class DayNotElapsedError extends Error {
  constructor(public readonly remainingMs: number) {
    super('Minimum day duration has not elapsed yet');
    this.name = 'DayNotElapsedError';
  }
}

async function findLatestGameSession(
  prisma: GamePrismaClient,
  userId: string,
): Promise<GameSessionRecord | null> {
  return prisma.gameSession.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
}

async function requireActiveGameSession(
  prisma: GamePrismaClient,
  userId: string,
): Promise<GameSessionRecord> {
  const session = await findLatestGameSession(prisma, userId);

  if (!session || session.status !== 'ACTIVE') {
    throw new NoActiveGameError();
  }

  return session;
}

async function requireResettableGameSession(
  prisma: GamePrismaClient,
  userId: string,
): Promise<GameSessionRecord> {
  const session = await findLatestGameSession(prisma, userId);

  if (!session || (session.status !== 'ACTIVE' && session.status !== 'PAUSED')) {
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

function toGameDayLogResponse(record: GameDayLogRecord): GameDayLogResponse {
  return {
    id: record.id,
    dayNumber: record.dayNumber,
    startingMoney: record.startingMoney,
    endingMoney: record.endingMoney,
    casesAttempted: record.casesAttempted,
    casesCorrect: record.casesCorrect,
    thresholdMet: record.thresholdMet,
    penaltyApplied: record.penaltyApplied,
    startedAt: record.startedAt,
    endedAt: record.endedAt,
  };
}

async function requireOpenGameDayLog(
  prisma: GamePrismaClient,
  gameSessionId: string,
): Promise<GameDayLogRecord> {
  const open = await prisma.gameDayLog.findFirst({
    where: { gameSessionId, endedAt: null },
  });

  if (!open) {
    throw new NoOpenDayError();
  }

  return open;
}

export async function pauseGame(
  prisma: GamePrismaClient,
  userId: string,
): Promise<GameSessionRecord> {
  const session = await requireActiveGameSession(prisma, userId);
  const openDayLog = await requireOpenGameDayLog(prisma, session.id);

  await prisma.gameDayLog.update({
    where: { id: openDayLog.id },
    data: { pausedAt: new Date() },
  });

  const updated = await prisma.gameSession.update({
    where: { id: session.id },
    data: { status: 'PAUSED' },
  });
  return toGameSessionResponse(updated);
}

export async function resetGame(
  prisma: GamePrismaClient,
  userId: string,
): Promise<GameSessionRecord | null> {
  const session = await findLatestGameSession(prisma, userId);

  if (!session) {
    return null;
  }

  const openDayLog = await prisma.gameDayLog.findFirst({
    where: { gameSessionId: session.id, endedAt: null },
  });

  if (openDayLog) {
    await prisma.gameDayLog.update({
      where: { id: openDayLog.id },
      data: { endedAt: new Date() },
    });
  }

  const updated = await prisma.gameSession.update({
    where: { id: session.id },
    data: { status: 'GAME_OVER' },
  });
  return toGameSessionResponse(updated);
}

export async function resetDay(
  prisma: GamePrismaClient,
  userId: string,
): Promise<GameSessionRecord> {
  const session = await requireResettableGameSession(prisma, userId);
  const openDayLog = await requireOpenGameDayLog(prisma, session.id);

  await prisma.diagnosisAttempt.deleteMany({ where: { gameDayLogId: openDayLog.id } });

  const updatedSession = await prisma.gameSession.update({
    where: { id: session.id },
    data: {
      money: openDayLog.startingMoney,
      ...(session.status === 'PAUSED' ? { status: 'ACTIVE' as const } : {}),
    },
  });

  const pausedMs = openDayLog.pausedAt ? Date.now() - openDayLog.pausedAt.getTime() : 0;
  await prisma.gameDayLog.update({
    where: { id: openDayLog.id },
    data: {
      casesAttempted: 0,
      casesCorrect: 0,
      thresholdMet: null,
      penaltyApplied: false,
      pausedAt: null,
      totalPausedMs: openDayLog.totalPausedMs + pausedMs,
    },
  });

  return toGameSessionResponse(updatedSession);
}

export async function endDay(
  prisma: GamePrismaClient,
  userId: string,
): Promise<{ gameSession: GameSessionRecord; dayLog: GameDayLogResponse }> {
  const session = await requireActiveGameSession(prisma, userId);
  const openDayLog = await requireOpenGameDayLog(prisma, session.id);

  const elapsedMs = computeEffectiveElapsedMs({
    startedAt: openDayLog.startedAt,
    totalPausedMs: openDayLog.totalPausedMs,
    extraElapsedMs: openDayLog.extraElapsedMs,
  });
  if (elapsedMs < MIN_DAY_DURATION_MS) {
    throw new DayNotElapsedError(MIN_DAY_DURATION_MS - elapsedMs);
  }

  const attempts = await prisma.diagnosisAttempt.findMany({
    where: { gameDayLogId: openDayLog.id },
    select: { isDiagnosisCorrect: true },
  });
  const casesAttempted = attempts.length;
  const casesCorrect = attempts.filter((attempt) => attempt.isDiagnosisCorrect).length;

  const endingMoney = session.money;
  const thresholdMet =
    session.studentLoanThreshold === null ? null : endingMoney >= session.studentLoanThreshold;
  const penaltyApplied =
    session.studentLoanThreshold !== null && endingMoney < session.studentLoanThreshold;

  const wrongCount = casesAttempted - casesCorrect;
  const consecutiveBadDiagnosisCount =
    casesCorrect === casesAttempted ? 0 : session.consecutiveBadDiagnosisCount + wrongCount;

  const [updatedSession, updatedDayLog] = await prisma.$transaction(async (tx) => {
    const txUpdatedSession = await tx.gameSession.update({
      where: { id: session.id },
      data: { consecutiveBadDiagnosisCount },
    });
    const txUpdatedDayLog = await tx.gameDayLog.update({
      where: { id: openDayLog.id },
      data: {
        endedAt: new Date(),
        endingMoney,
        casesAttempted,
        casesCorrect,
        thresholdMet,
        penaltyApplied,
      },
    });
    return [txUpdatedSession, txUpdatedDayLog] as const;
  });

  return {
    gameSession: toGameSessionResponse(updatedSession),
    dayLog: toGameDayLogResponse(updatedDayLog),
  };
}
