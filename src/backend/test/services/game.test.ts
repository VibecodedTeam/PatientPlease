import { jest } from '@jest/globals';
import {
  NoActiveGameError,
  NoOpenDayError,
  pauseGame,
  resetDay,
  resetGame,
  type GameDayLogRecord,
  type GamePrismaClient,
  type GameSessionRecord,
} from '../../src/services/game.js';

function createMockPrisma() {
  return {
    gameSession: {
      findFirst: jest.fn<GamePrismaClient['gameSession']['findFirst']>(),
      update: jest.fn<GamePrismaClient['gameSession']['update']>(),
    },
    gameDayLog: {
      findFirst: jest.fn<GamePrismaClient['gameDayLog']['findFirst']>(),
      update: jest.fn<GamePrismaClient['gameDayLog']['update']>(),
    },
    diagnosisAttempt: {
      deleteMany: jest.fn<GamePrismaClient['diagnosisAttempt']['deleteMany']>(),
    },
  };
}

function makeSession(overrides: Partial<GameSessionRecord> = {}): GameSessionRecord {
  return {
    id: 'session-uuid',
    money: 100,
    studentLoanThreshold: null,
    consecutiveBadDiagnosisCount: 0,
    status: 'ACTIVE',
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeGameDayLog(overrides: Partial<GameDayLogRecord> = {}): GameDayLogRecord {
  return {
    id: 'day-log-uuid',
    dayNumber: 1,
    startingMoney: 50,
    endedAt: null,
    ...overrides,
  };
}

describe('pauseGame', () => {
  it('throws NoActiveGameError when there is no GameSession', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(null);

    await expect(pauseGame(prisma, 'user-uuid')).rejects.toThrow(NoActiveGameError);
    expect(prisma.gameDayLog.findFirst).not.toHaveBeenCalled();
  });

  it.each(['PAUSED', 'GAME_OVER', 'COMPLETED'] as const)(
    'throws NoActiveGameError when the latest session is %s',
    async (status) => {
      const prisma = createMockPrisma();
      prisma.gameSession.findFirst.mockResolvedValue(makeSession({ status }));

      await expect(pauseGame(prisma, 'user-uuid')).rejects.toThrow(NoActiveGameError);
    },
  );

  it('throws NoOpenDayError when the ACTIVE session has no open GameDayLog', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue(null);

    await expect(pauseGame(prisma, 'user-uuid')).rejects.toThrow(NoOpenDayError);
    expect(prisma.gameSession.update).not.toHaveBeenCalled();
  });

  it('stamps pausedAt on the open day log and flips the session to PAUSED', async () => {
    const prisma = createMockPrisma();
    const session = makeSession();
    prisma.gameSession.findFirst.mockResolvedValue(session);
    prisma.gameDayLog.findFirst.mockResolvedValue(makeGameDayLog({ id: 'open-log-uuid' }));
    const paused = makeSession({ status: 'PAUSED' });
    prisma.gameSession.update.mockResolvedValue(paused);

    const result = await pauseGame(prisma, 'user-uuid');

    expect(prisma.gameDayLog.update).toHaveBeenCalledWith({
      where: { id: 'open-log-uuid' },
      data: { pausedAt: expect.any(Date) as Date },
    });
    expect(prisma.gameSession.update).toHaveBeenCalledWith({
      where: { id: 'session-uuid' },
      data: { status: 'PAUSED' },
    });
    expect(result).toEqual(paused);
  });

  it('never leaks the userId column present on the raw GameSession row', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue(makeGameDayLog({ id: 'open-log-uuid' }));
    prisma.gameSession.update.mockResolvedValue({
      ...makeSession({ status: 'PAUSED' }),
      userId: 'user-uuid',
    } as GameSessionRecord);

    const result = await pauseGame(prisma, 'user-uuid');

    expect(result).not.toHaveProperty('userId');
  });
});

describe('resetGame', () => {
  it('returns null when the user has no GameSession', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(null);

    const result = await resetGame(prisma, 'user-uuid');

    expect(result).toBeNull();
    expect(prisma.gameSession.update).not.toHaveBeenCalled();
  });

  it('marks the session GAME_OVER and closes an open day log', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue(makeGameDayLog({ id: 'open-log-uuid' }));
    const ended = makeSession({ status: 'GAME_OVER' });
    prisma.gameSession.update.mockResolvedValue(ended);

    const result = await resetGame(prisma, 'user-uuid');

    expect(prisma.gameDayLog.update).toHaveBeenCalledWith({
      where: { id: 'open-log-uuid' },
      data: { endedAt: expect.any(Date) as Date },
    });
    expect(prisma.gameSession.update).toHaveBeenCalledWith({
      where: { id: 'session-uuid' },
      data: { status: 'GAME_OVER' },
    });
    expect(result).toEqual(ended);
  });

  it('does not touch a day log when none is open', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue(null);
    prisma.gameSession.update.mockResolvedValue(makeSession({ status: 'GAME_OVER' }));

    await resetGame(prisma, 'user-uuid');

    expect(prisma.gameDayLog.update).not.toHaveBeenCalled();
  });

  it('never leaks the userId column present on the raw GameSession row', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue(null);
    prisma.gameSession.update.mockResolvedValue({
      ...makeSession({ status: 'GAME_OVER' }),
      userId: 'user-uuid',
    } as GameSessionRecord);

    const result = await resetGame(prisma, 'user-uuid');

    expect(result).not.toHaveProperty('userId');
  });
});

describe('resetDay', () => {
  it('throws NoActiveGameError when there is no GameSession', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(null);

    await expect(resetDay(prisma, 'user-uuid')).rejects.toThrow(NoActiveGameError);
  });

  it('throws NoOpenDayError when the session has no open GameDayLog', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue(null);

    await expect(resetDay(prisma, 'user-uuid')).rejects.toThrow(NoOpenDayError);
    expect(prisma.diagnosisAttempt.deleteMany).not.toHaveBeenCalled();
  });

  it.each(['GAME_OVER', 'COMPLETED'] as const)(
    'throws NoActiveGameError when the latest session is %s, even if it has a stray open GameDayLog',
    async (status) => {
      const prisma = createMockPrisma();
      prisma.gameSession.findFirst.mockResolvedValue(makeSession({ status }));
      prisma.gameDayLog.findFirst.mockResolvedValue(makeGameDayLog({ id: 'stray-log-uuid' }));

      await expect(resetDay(prisma, 'user-uuid')).rejects.toThrow(NoActiveGameError);
      expect(prisma.diagnosisAttempt.deleteMany).not.toHaveBeenCalled();
    },
  );

  it('deletes DiagnosisAttempts, refunds money, and resets day counters', async () => {
    const prisma = createMockPrisma();
    const session = makeSession({ money: 10, status: 'ACTIVE' });
    prisma.gameSession.findFirst.mockResolvedValue(session);
    const openLog = makeGameDayLog({ id: 'open-log-uuid', startingMoney: 50 });
    prisma.gameDayLog.findFirst.mockResolvedValue(openLog);
    const refunded = makeSession({ money: 50 });
    prisma.gameSession.update.mockResolvedValue(refunded);

    const result = await resetDay(prisma, 'user-uuid');

    expect(prisma.diagnosisAttempt.deleteMany).toHaveBeenCalledWith({
      where: { gameDayLogId: 'open-log-uuid' },
    });
    expect(prisma.gameSession.update).toHaveBeenCalledWith({
      where: { id: 'session-uuid' },
      data: { money: 50 },
    });
    expect(prisma.gameDayLog.update).toHaveBeenCalledWith({
      where: { id: 'open-log-uuid' },
      data: {
        casesAttempted: 0,
        casesCorrect: 0,
        penaltyApplied: false,
        pausedAt: null,
      },
    });
    expect(result).toEqual(refunded);
  });

  it('flips a PAUSED session back to ACTIVE', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession({ status: 'PAUSED' }));
    prisma.gameDayLog.findFirst.mockResolvedValue(makeGameDayLog());
    prisma.gameSession.update.mockResolvedValue(makeSession({ status: 'ACTIVE' }));

    await resetDay(prisma, 'user-uuid');

    expect(prisma.gameSession.update).toHaveBeenCalledWith({
      where: { id: 'session-uuid' },
      data: { money: 50, status: 'ACTIVE' },
    });
  });

  it('never leaks the userId column present on the raw GameSession row', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue(makeGameDayLog());
    prisma.gameSession.update.mockResolvedValue({
      ...makeSession(),
      userId: 'user-uuid',
    } as GameSessionRecord);

    const result = await resetDay(prisma, 'user-uuid');

    expect(result).not.toHaveProperty('userId');
  });
});
