import type { GameDayLogRecord, GameSessionRecord, GameSessionStatusValue } from './round.js';

export type { GameDayLogRecord, GameSessionRecord };

/** Narrow, structurally-compatible subset of PrismaClient this service depends on — mirrors RoundPrismaClient in services/round.ts. */
export interface GamePrismaClient {
  gameSession: {
    findFirst(args: {
      where: { userId: string };
      orderBy: { createdAt: 'desc' };
    }): Promise<GameSessionRecord | null>;
    update(args: {
      where: { id: string };
      data: { status?: GameSessionStatusValue; money?: number };
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
    count(args: {
      where: { gameDayLogId: string; isDiagnosisCorrect?: boolean };
    }): Promise<number>;
  };
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

function toGameDayLogResponse(record: GameDayLogRecord): GameDayLogRecord {
  return {
    id: record.id,
    dayNumber: record.dayNumber,
    startingMoney: record.startingMoney,
    endingMoney: record.endingMoney,
    casesAttempted: record.casesAttempted,
    casesCorrect: record.casesCorrect,
    thresholdMet: record.thresholdMet,
    penaltyApplied: record.penaltyApplied,
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

  await prisma.gameDayLog.update({
    where: { id: openDayLog.id },
    data: { casesAttempted: 0, casesCorrect: 0, penaltyApplied: false, pausedAt: null },
  });

  return toGameSessionResponse(updatedSession);
}

export async function endDay(
  prisma: GamePrismaClient,
  userId: string,
): Promise<{ gameSession: GameSessionRecord; dayLog: GameDayLogRecord }> {
  const session = await requireActiveGameSession(prisma, userId);
  const openDayLog = await requireOpenGameDayLog(prisma, session.id);

  const [casesAttempted, casesCorrect] = await Promise.all([
    prisma.diagnosisAttempt.count({ where: { gameDayLogId: openDayLog.id } }),
    prisma.diagnosisAttempt.count({
      where: { gameDayLogId: openDayLog.id, isDiagnosisCorrect: true },
    }),
  ]);

  const endingMoney = session.money;
  const thresholdMet =
    session.studentLoanThreshold === null ? null : endingMoney >= session.studentLoanThreshold;
  const penaltyApplied = thresholdMet === false;

  const updatedDayLog = await prisma.gameDayLog.update({
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

  return {
    gameSession: toGameSessionResponse(session),
    dayLog: toGameDayLogResponse(updatedDayLog),
  };
}
