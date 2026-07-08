import { jest } from '@jest/globals';
import {
  NoActiveGameError,
  NoOpenDayError,
  endDay,
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
      count: jest.fn<GamePrismaClient['diagnosisAttempt']['count']>(),
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
    endingMoney: null,
    casesAttempted: 0,
    casesCorrect: 0,
    thresholdMet: null,
    penaltyApplied: false,
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

describe('endDay', () => {
  it('throws NoActiveGameError when there is no GameSession', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(null);

    await expect(endDay(prisma, 'user-uuid')).rejects.toThrow(NoActiveGameError);
  });

  it.each(['PAUSED', 'GAME_OVER', 'COMPLETED'] as const)(
    'throws NoActiveGameError when the latest session is %s',
    async (status) => {
      const prisma = createMockPrisma();
      prisma.gameSession.findFirst.mockResolvedValue(makeSession({ status }));

      await expect(endDay(prisma, 'user-uuid')).rejects.toThrow(NoActiveGameError);
    },
  );

  it('throws NoOpenDayError when the ACTIVE session has no open GameDayLog', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue(null);

    await expect(endDay(prisma, 'user-uuid')).rejects.toThrow(NoOpenDayError);
    expect(prisma.gameDayLog.update).not.toHaveBeenCalled();
  });

  it('counts DiagnosisAttempts and stamps casesAttempted/casesCorrect/endingMoney/endedAt', async () => {
    const prisma = createMockPrisma();
    const session = makeSession({ money: 75, status: 'ACTIVE', studentLoanThreshold: null });
    prisma.gameSession.findFirst.mockResolvedValue(session);
    prisma.gameDayLog.findFirst.mockResolvedValue(makeGameDayLog({ id: 'open-log-uuid' }));
    prisma.diagnosisAttempt.count.mockResolvedValueOnce(3).mockResolvedValueOnce(2);
    prisma.gameSession.update.mockResolvedValue(session);
    const endedLog = makeGameDayLog({
      id: 'open-log-uuid',
      endingMoney: 75,
      casesAttempted: 3,
      casesCorrect: 2,
      thresholdMet: null,
      penaltyApplied: false,
      endedAt: new Date(),
    });
    prisma.gameDayLog.update.mockResolvedValue(endedLog);

    const result = await endDay(prisma, 'user-uuid');

    expect(prisma.diagnosisAttempt.count).toHaveBeenNthCalledWith(1, {
      where: { gameDayLogId: 'open-log-uuid' },
    });
    expect(prisma.diagnosisAttempt.count).toHaveBeenNthCalledWith(2, {
      where: { gameDayLogId: 'open-log-uuid', isDiagnosisCorrect: true },
    });
    expect(prisma.gameDayLog.update).toHaveBeenCalledWith({
      where: { id: 'open-log-uuid' },
      data: {
        endedAt: expect.any(Date) as Date,
        endingMoney: 75,
        casesAttempted: 3,
        casesCorrect: 2,
        thresholdMet: null,
        penaltyApplied: false,
      },
    });
    expect(result.dayLog).toEqual(endedLog);
  });

  it('sets thresholdMet true and penaltyApplied false when endingMoney meets studentLoanThreshold', async () => {
    const prisma = createMockPrisma();
    const session = makeSession({ money: 100, studentLoanThreshold: 100 });
    prisma.gameSession.findFirst.mockResolvedValue(session);
    prisma.gameDayLog.findFirst.mockResolvedValue(makeGameDayLog({ id: 'open-log-uuid' }));
    prisma.diagnosisAttempt.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);
    prisma.gameSession.update.mockResolvedValue(session);
    prisma.gameDayLog.update.mockResolvedValue(makeGameDayLog({ id: 'open-log-uuid' }));

    await endDay(prisma, 'user-uuid');

    expect(prisma.gameDayLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ thresholdMet: true, penaltyApplied: false }),
      }),
    );
  });

  it('sets thresholdMet false and penaltyApplied true when endingMoney misses studentLoanThreshold', async () => {
    const prisma = createMockPrisma();
    const session = makeSession({ money: 40, studentLoanThreshold: 100 });
    prisma.gameSession.findFirst.mockResolvedValue(session);
    prisma.gameDayLog.findFirst.mockResolvedValue(makeGameDayLog({ id: 'open-log-uuid' }));
    prisma.diagnosisAttempt.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    prisma.gameSession.update.mockResolvedValue(session);
    prisma.gameDayLog.update.mockResolvedValue(makeGameDayLog({ id: 'open-log-uuid' }));

    await endDay(prisma, 'user-uuid');

    expect(prisma.gameDayLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ thresholdMet: false, penaltyApplied: true }),
      }),
    );
  });

  it('resets consecutiveBadDiagnosisCount to 0 when casesCorrect equals casesAttempted', async () => {
    const prisma = createMockPrisma();
    const session = makeSession({ money: 60, consecutiveBadDiagnosisCount: 3 });
    prisma.gameSession.findFirst.mockResolvedValue(session);
    prisma.gameDayLog.findFirst.mockResolvedValue(makeGameDayLog({ id: 'open-log-uuid' }));
    prisma.diagnosisAttempt.count.mockResolvedValueOnce(2).mockResolvedValueOnce(2);
    prisma.gameSession.update.mockResolvedValue(makeSession({ consecutiveBadDiagnosisCount: 0 }));
    prisma.gameDayLog.update.mockResolvedValue(makeGameDayLog({ id: 'open-log-uuid' }));

    const result = await endDay(prisma, 'user-uuid');

    expect(prisma.gameSession.update).toHaveBeenCalledWith({
      where: { id: 'session-uuid' },
      data: { consecutiveBadDiagnosisCount: 0 },
    });
    expect(result.gameSession.consecutiveBadDiagnosisCount).toBe(0);
  });

  it('increments consecutiveBadDiagnosisCount by the number of wrong diagnoses today', async () => {
    const prisma = createMockPrisma();
    const session = makeSession({ money: 60, consecutiveBadDiagnosisCount: 1 });
    prisma.gameSession.findFirst.mockResolvedValue(session);
    prisma.gameDayLog.findFirst.mockResolvedValue(makeGameDayLog({ id: 'open-log-uuid' }));
    prisma.diagnosisAttempt.count.mockResolvedValueOnce(3).mockResolvedValueOnce(1);
    prisma.gameSession.update.mockResolvedValue(makeSession({ consecutiveBadDiagnosisCount: 3 }));
    prisma.gameDayLog.update.mockResolvedValue(makeGameDayLog({ id: 'open-log-uuid' }));

    await endDay(prisma, 'user-uuid');

    expect(prisma.gameSession.update).toHaveBeenCalledWith({
      where: { id: 'session-uuid' },
      data: { consecutiveBadDiagnosisCount: 3 },
    });
  });

  it('resets consecutiveBadDiagnosisCount to 0 when the day has zero attempts', async () => {
    const prisma = createMockPrisma();
    const session = makeSession({ money: 60, consecutiveBadDiagnosisCount: 4 });
    prisma.gameSession.findFirst.mockResolvedValue(session);
    prisma.gameDayLog.findFirst.mockResolvedValue(makeGameDayLog({ id: 'open-log-uuid' }));
    prisma.diagnosisAttempt.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    prisma.gameSession.update.mockResolvedValue(makeSession({ consecutiveBadDiagnosisCount: 0 }));
    prisma.gameDayLog.update.mockResolvedValue(makeGameDayLog({ id: 'open-log-uuid' }));

    await endDay(prisma, 'user-uuid');

    expect(prisma.gameSession.update).toHaveBeenCalledWith({
      where: { id: 'session-uuid' },
      data: { consecutiveBadDiagnosisCount: 0 },
    });
  });

  it('never leaks the gameSessionId column present on the raw GameDayLog row', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue(makeGameDayLog({ id: 'open-log-uuid' }));
    prisma.diagnosisAttempt.count.mockResolvedValue(0);
    prisma.gameSession.update.mockResolvedValue(makeSession());
    prisma.gameDayLog.update.mockResolvedValue({
      ...makeGameDayLog({ id: 'open-log-uuid' }),
      gameSessionId: 'session-uuid',
    } as GameDayLogRecord);

    const result = await endDay(prisma, 'user-uuid');

    expect(result.dayLog).not.toHaveProperty('gameSessionId');
  });

  it('never leaks the userId column present on the raw GameSession row', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue(makeGameDayLog({ id: 'open-log-uuid' }));
    prisma.diagnosisAttempt.count.mockResolvedValue(0);
    prisma.gameSession.update.mockResolvedValue({
      ...makeSession(),
      userId: 'user-uuid',
    } as GameSessionRecord);
    prisma.gameDayLog.update.mockResolvedValue(makeGameDayLog({ id: 'open-log-uuid' }));

    const result = await endDay(prisma, 'user-uuid');

    expect(result.gameSession).not.toHaveProperty('userId');
  });
});
