import { jest } from '@jest/globals';
import {
  NoCasesRemainingError,
  resolveGameSession,
  resolveOpenGameDayLog,
  selectNextCase,
  startRound,
  type CaseRecord,
  type GameDayLogRecord,
  type GameSessionRecord,
  type RoundPrismaClient,
} from '../../src/services/round.js';

function createMockPrisma() {
  return {
    gameSession: {
      findFirst: jest.fn<RoundPrismaClient['gameSession']['findFirst']>(),
      create: jest.fn<RoundPrismaClient['gameSession']['create']>(),
      update: jest.fn<RoundPrismaClient['gameSession']['update']>(),
    },
    case: {
      findFirst: jest.fn<RoundPrismaClient['case']['findFirst']>(),
    },
    gameDayLog: {
      findFirst: jest.fn<RoundPrismaClient['gameDayLog']['findFirst']>(),
      create: jest.fn<RoundPrismaClient['gameDayLog']['create']>(),
    },
    ownedItem: {
      findMany: jest.fn<RoundPrismaClient['ownedItem']['findMany']>(),
    },
    diagnosis: {
      findMany: jest.fn<RoundPrismaClient['diagnosis']['findMany']>(),
    },
    treatment: {
      findMany: jest.fn<RoundPrismaClient['treatment']['findMany']>(),
    },
  };
}

function makeSession(overrides: Partial<GameSessionRecord> = {}): GameSessionRecord {
  return {
    id: 'session-uuid',
    money: 0,
    studentLoanThreshold: null,
    consecutiveBadDiagnosisCount: 0,
    status: 'ACTIVE',
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeCase(overrides: Partial<CaseRecord> = {}): CaseRecord {
  return {
    id: 'case-uuid',
    difficulty: 1,
    moneyReward: 50,
    moneyPenalty: 20,
    patient: {
      id: 'patient-uuid',
      name: 'Jan Kowalski',
      age: 52,
      sex: 'MALE',
      occupation: 'Roofer',
      portraitImageUrl: 'https://cdn.example.test/jan.png',
      bodyModelVariant: 'male_average_01',
    },
    documents: [
      {
        id: 'document-uuid',
        attentionPointRegion: 'LEFT_ARM',
        type: 'SKIN_IMAGE',
        title: 'Left shoulder — day 1',
        documentDate: null,
        sortOrder: 1,
        imageUrl: 'https://cdn.example.test/lesion.png',
        imageWidthPx: 1024,
        imageHeightPx: 768,
        imageAltText: 'Asymmetric brown lesion',
        content: null,
      },
    ],
    ...overrides,
  };
}

function makeGameDayLog(overrides: Partial<GameDayLogRecord> = {}): GameDayLogRecord {
  return {
    id: 'day-log-uuid',
    dayNumber: 1,
    startingMoney: 0,
    endingMoney: null,
    endedAt: null,
    ...overrides,
  };
}

describe('resolveGameSession', () => {
  it('creates a new GameSession when the user has none', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(null);
    const created = makeSession({ id: 'new-session-uuid' });
    prisma.gameSession.create.mockResolvedValue(created);

    const result = await resolveGameSession(prisma, 'user-uuid');

    expect(prisma.gameSession.create).toHaveBeenCalledWith({
      data: { userId: 'user-uuid', money: 0, consecutiveBadDiagnosisCount: 0, status: 'ACTIVE' },
    });
    expect(result).toEqual(created);
  });

  it('resumes an ACTIVE session unchanged', async () => {
    const prisma = createMockPrisma();
    const active = makeSession({ status: 'ACTIVE' });
    prisma.gameSession.findFirst.mockResolvedValue(active);

    const result = await resolveGameSession(prisma, 'user-uuid');

    expect(result).toEqual(active);
    expect(prisma.gameSession.create).not.toHaveBeenCalled();
    expect(prisma.gameSession.update).not.toHaveBeenCalled();
  });

  it('flips a PAUSED session to ACTIVE', async () => {
    const prisma = createMockPrisma();
    const paused = makeSession({ id: 'paused-session-uuid', status: 'PAUSED' });
    prisma.gameSession.findFirst.mockResolvedValue(paused);
    const resumed = makeSession({ id: 'paused-session-uuid', status: 'ACTIVE' });
    prisma.gameSession.update.mockResolvedValue(resumed);

    const result = await resolveGameSession(prisma, 'user-uuid');

    expect(prisma.gameSession.update).toHaveBeenCalledWith({
      where: { id: 'paused-session-uuid' },
      data: { status: 'ACTIVE' },
    });
    expect(result).toEqual(resumed);
  });

  it.each(['GAME_OVER', 'COMPLETED'] as const)(
    'creates a fresh session when the latest one is %s',
    async (status) => {
      const prisma = createMockPrisma();
      prisma.gameSession.findFirst.mockResolvedValue(makeSession({ status }));
      const created = makeSession({ id: 'fresh-session-uuid' });
      prisma.gameSession.create.mockResolvedValue(created);

      const result = await resolveGameSession(prisma, 'user-uuid');

      expect(prisma.gameSession.create).toHaveBeenCalledWith({
        data: { userId: 'user-uuid', money: 0, consecutiveBadDiagnosisCount: 0, status: 'ACTIVE' },
      });
      expect(prisma.gameSession.update).not.toHaveBeenCalled();
      expect(result).toEqual(created);
    },
  );
});

describe('selectNextCase', () => {
  it('queries active, un-attempted cases ordered by difficulty ascending', async () => {
    const prisma = createMockPrisma();
    const found = makeCase();
    prisma.case.findFirst.mockResolvedValue(found);

    const result = await selectNextCase(prisma, 'session-uuid');

    expect(prisma.case.findFirst).toHaveBeenCalledWith({
      where: {
        isActive: true,
        diagnosisAttempts: { none: { gameDayLog: { gameSessionId: 'session-uuid' } } },
      },
      orderBy: { difficulty: 'asc' },
      include: { patient: true, documents: { orderBy: { sortOrder: 'asc' } } },
    });
    expect(result).toEqual(found);
  });

  it('returns null when no case matches', async () => {
    const prisma = createMockPrisma();
    prisma.case.findFirst.mockResolvedValue(null);

    const result = await selectNextCase(prisma, 'session-uuid');

    expect(result).toBeNull();
  });
});

describe('resolveOpenGameDayLog', () => {
  it('reuses an open (endedAt: null) GameDayLog', async () => {
    const prisma = createMockPrisma();
    const open = makeGameDayLog({ id: 'open-log-uuid' });
    prisma.gameDayLog.findFirst.mockResolvedValue(open);

    const result = await resolveOpenGameDayLog(prisma, 'session-uuid', 100);

    expect(prisma.gameDayLog.findFirst).toHaveBeenCalledWith({
      where: { gameSessionId: 'session-uuid', endedAt: null },
    });
    expect(prisma.gameDayLog.create).not.toHaveBeenCalled();
    expect(result).toEqual(open);
  });

  it('creates a new GameDayLog with dayNumber 1 when none exist yet', async () => {
    const prisma = createMockPrisma();
    prisma.gameDayLog.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    const created = makeGameDayLog({ id: 'new-log-uuid', dayNumber: 1, startingMoney: 100 });
    prisma.gameDayLog.create.mockResolvedValue(created);

    const result = await resolveOpenGameDayLog(prisma, 'session-uuid', 100);

    expect(prisma.gameDayLog.findFirst).toHaveBeenNthCalledWith(2, {
      where: { gameSessionId: 'session-uuid' },
      orderBy: { dayNumber: 'desc' },
    });
    expect(prisma.gameDayLog.create).toHaveBeenCalledWith({
      data: {
        gameSessionId: 'session-uuid',
        dayNumber: 1,
        startingMoney: 100,
        startedAt: expect.any(Date) as Date,
      },
    });
    expect(result).toEqual(created);
  });

  it('creates a new GameDayLog with dayNumber = latest + 1 when a previous (closed) day exists', async () => {
    const prisma = createMockPrisma();
    prisma.gameDayLog.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(makeGameDayLog({ dayNumber: 3, endedAt: new Date() }));
    const created = makeGameDayLog({ dayNumber: 4, startingMoney: 250 });
    prisma.gameDayLog.create.mockResolvedValue(created);

    const result = await resolveOpenGameDayLog(prisma, 'session-uuid', 250);

    expect(prisma.gameDayLog.create).toHaveBeenCalledWith({
      data: {
        gameSessionId: 'session-uuid',
        dayNumber: 4,
        startingMoney: 250,
        startedAt: expect.any(Date) as Date,
      },
    });
    expect(result).toEqual(created);
  });
});

describe('startRound', () => {
  function primeHappyPath(prisma: ReturnType<typeof createMockPrisma>) {
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.case.findFirst.mockResolvedValue(makeCase());
    prisma.gameDayLog.findFirst.mockResolvedValue(makeGameDayLog());
    prisma.ownedItem.findMany.mockResolvedValue([
      {
        id: 'owned-item-uuid',
        shopItem: {
          id: 'shop-item-uuid',
          sku: '89898',
          name: 'Handbook',
          description: 'book about ai',
          itemType: 'HANDBOOK',
          iconImageUrl: 'https://cdn.example.test/handbook.png',
        },
        purchasePrice: 100,
        purchasedOnDay: 2,
        purchasedAt: new Date('2026-07-02T00:00:00.000Z'),
        isEquipped: true,
      },
    ]);
    prisma.diagnosis.findMany.mockResolvedValue([
      { id: 'diagnosis-uuid', code: 'MELANOMA', name: 'Melanoma', category: 'MALIGNANT' },
    ]);
    prisma.treatment.findMany.mockResolvedValue([
      { id: 'treatment-uuid', code: 'REFER_ONCO', name: 'Refer to oncology', kind: 'REFERRAL' },
    ]);
  }

  it('shapes the full happy-path response', async () => {
    const prisma = createMockPrisma();
    primeHappyPath(prisma);

    const result = await startRound(prisma, 'user-uuid');

    expect(result).toEqual({
      gameSession: {
        id: 'session-uuid',
        money: 0,
        studentLoanThreshold: null,
        consecutiveBadDiagnosisCount: 0,
        status: 'ACTIVE',
        createdAt: new Date('2026-07-01T00:00:00.000Z'),
        updatedAt: new Date('2026-07-01T00:00:00.000Z'),
      },
      ownedItems: [
        {
          id: 'owned-item-uuid',
          shopItem: {
            id: 'shop-item-uuid',
            sku: '89898',
            name: 'Handbook',
            description: 'book about ai',
            itemType: 'HANDBOOK',
            iconImageUrl: 'https://cdn.example.test/handbook.png',
          },
          purchasePrice: 100,
          purchasedOnDay: 2,
          purchasedAt: new Date('2026-07-02T00:00:00.000Z'),
          isEquipped: true,
        },
      ],
      case: {
        id: 'case-uuid',
        difficulty: 1,
        moneyReward: 50,
        moneyPenalty: 20,
        patient: {
          id: 'patient-uuid',
          name: 'Jan Kowalski',
          age: 52,
          sex: 'MALE',
          occupation: 'Roofer',
          portraitImageUrl: 'https://cdn.example.test/jan.png',
          bodyModelVariant: 'male_average_01',
        },
        documents: [
          {
            id: 'document-uuid',
            attentionPointRegion: 'LEFT_ARM',
            type: 'SKIN_IMAGE',
            title: 'Left shoulder — day 1',
            documentDate: null,
            sortOrder: 1,
            imageUrl: 'https://cdn.example.test/lesion.png',
            imageWidthPx: 1024,
            imageHeightPx: 768,
            imageAltText: 'Asymmetric brown lesion',
            content: null,
          },
        ],
      },
      diagnosisOptions: [
        { id: 'diagnosis-uuid', code: 'MELANOMA', name: 'Melanoma', category: 'MALIGNANT' },
      ],
      treatmentOptions: [
        { id: 'treatment-uuid', code: 'REFER_ONCO', name: 'Refer to oncology', kind: 'REFERRAL' },
      ],
    });
  });

  it('never leaks answer-key fields present on the raw Case record', async () => {
    const prisma = createMockPrisma();
    primeHappyPath(prisma);
    prisma.case.findFirst.mockResolvedValue({
      ...makeCase(),
      correctDiagnosisId: 'diagnosis-uuid',
      correctTreatmentId: 'treatment-uuid',
      resultExplanationText: 'It was melanoma.',
    } as CaseRecord);

    const result = await startRound(prisma, 'user-uuid');

    expect(result.case).not.toHaveProperty('correctDiagnosisId');
    expect(result.case).not.toHaveProperty('correctTreatmentId');
    expect(result.case).not.toHaveProperty('resultExplanationText');
  });

  it('passes ownedItems.isEquipped through unmodified', async () => {
    const prisma = createMockPrisma();
    primeHappyPath(prisma);
    prisma.ownedItem.findMany.mockResolvedValue([
      {
        id: 'owned-item-uuid',
        shopItem: {
          id: 'shop-item-uuid',
          sku: '89898',
          name: 'Handbook',
          description: 'book about ai',
          itemType: 'HANDBOOK',
          iconImageUrl: 'https://cdn.example.test/handbook.png',
        },
        purchasePrice: 100,
        purchasedOnDay: 2,
        purchasedAt: new Date('2026-07-02T00:00:00.000Z'),
        isEquipped: false,
      },
    ]);

    const result = await startRound(prisma, 'user-uuid');

    expect(result.ownedItems[0]?.isEquipped).toBe(false);
  });

  it('does not create a new GameDayLog when one is already open (resume path)', async () => {
    const prisma = createMockPrisma();
    primeHappyPath(prisma);

    await startRound(prisma, 'user-uuid');

    expect(prisma.gameDayLog.create).not.toHaveBeenCalled();
  });

  it('throws NoCasesRemainingError and marks the session COMPLETED when no case matches', async () => {
    const prisma = createMockPrisma();
    const session = makeSession({ id: 'session-uuid' });
    prisma.gameSession.findFirst.mockResolvedValue(session);
    prisma.case.findFirst.mockResolvedValue(null);
    prisma.gameSession.update.mockResolvedValue(makeSession({ status: 'COMPLETED' }));

    await expect(startRound(prisma, 'user-uuid')).rejects.toThrow(NoCasesRemainingError);

    expect(prisma.gameSession.update).toHaveBeenCalledWith({
      where: { id: 'session-uuid' },
      data: { status: 'COMPLETED' },
    });
    expect(prisma.gameDayLog.findFirst).not.toHaveBeenCalled();
    expect(prisma.ownedItem.findMany).not.toHaveBeenCalled();
  });
});
