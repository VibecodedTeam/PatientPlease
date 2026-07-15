import { jest } from '@jest/globals';
import {
  GameCompletedError,
  NoCasesRemainingError,
  pickIndexForSeed,
  resolveGameSession,
  resolveOpenGameDayLog,
  selectDiagnosisOptions,
  selectNextCase,
  startRound,
  type CaseRecord,
  type DiagnosisRecord,
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
      findMany: jest.fn<RoundPrismaClient['case']['findMany']>(),
    },
    gameDayLog: {
      findFirst: jest.fn<RoundPrismaClient['gameDayLog']['findFirst']>(),
      create: jest.fn<RoundPrismaClient['gameDayLog']['create']>(),
      update: jest.fn<RoundPrismaClient['gameDayLog']['update']>(),
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
    caseExamination: {
      findMany: jest.fn<RoundPrismaClient['caseExamination']['findMany']>(),
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
    featuredOrder: null,
    correctDiagnosisId: 'diagnosis-uuid',
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
    casesAttempted: 0,
    casesCorrect: 0,
    thresholdMet: null,
    penaltyApplied: false,
    startedAt: new Date('2026-07-01T00:00:00.000Z'),
    pausedAt: null,
    totalPausedMs: 0,
    extraElapsedMs: 0,
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
    prisma.gameDayLog.findFirst.mockResolvedValue(null);

    const result = await resolveGameSession(prisma, 'user-uuid');

    expect(prisma.gameSession.update).toHaveBeenCalledWith({
      where: { id: 'paused-session-uuid' },
      data: { status: 'ACTIVE' },
    });
    expect(result).toEqual(resumed);
  });

  it('accumulates totalPausedMs and clears pausedAt when resuming with a stamped pausedAt', async () => {
    const prisma = createMockPrisma();
    const paused = makeSession({ id: 'paused-session-uuid', status: 'PAUSED' });
    prisma.gameSession.findFirst.mockResolvedValue(paused);
    const resumed = makeSession({ id: 'paused-session-uuid', status: 'ACTIVE' });
    prisma.gameSession.update.mockResolvedValue(resumed);
    const pausedAt = new Date(Date.now() - 5000);
    prisma.gameDayLog.findFirst.mockResolvedValue(
      makeGameDayLog({ id: 'open-log-uuid', pausedAt, totalPausedMs: 1000 }),
    );
    prisma.gameDayLog.update.mockResolvedValue(makeGameDayLog({ id: 'open-log-uuid' }));

    await resolveGameSession(prisma, 'user-uuid');

    expect(prisma.gameDayLog.findFirst).toHaveBeenCalledWith({
      where: { gameSessionId: 'paused-session-uuid', endedAt: null },
    });
    expect(prisma.gameDayLog.update).toHaveBeenCalledTimes(1);
    const call = prisma.gameDayLog.update.mock.calls[0]?.[0] as {
      where: { id: string };
      data: { pausedAt: null; totalPausedMs: number };
    };
    expect(call.where).toEqual({ id: 'open-log-uuid' });
    expect(call.data.pausedAt).toBeNull();
    expect(call.data.totalPausedMs).toBeGreaterThanOrEqual(1000 + 5000);
    expect(call.data.totalPausedMs).toBeLessThan(1000 + 6000);
  });

  it('does not call gameDayLog.update when resuming a session whose open day log has no pausedAt', async () => {
    const prisma = createMockPrisma();
    const paused = makeSession({ id: 'paused-session-uuid', status: 'PAUSED' });
    prisma.gameSession.findFirst.mockResolvedValue(paused);
    prisma.gameSession.update.mockResolvedValue(makeSession({ status: 'ACTIVE' }));
    prisma.gameDayLog.findFirst.mockResolvedValue(
      makeGameDayLog({ id: 'open-log-uuid', pausedAt: null }),
    );

    await resolveGameSession(prisma, 'user-uuid');

    expect(prisma.gameDayLog.update).not.toHaveBeenCalled();
  });

  it('does not call gameDayLog.update when resuming a session with no open day log', async () => {
    const prisma = createMockPrisma();
    const paused = makeSession({ id: 'paused-session-uuid', status: 'PAUSED' });
    prisma.gameSession.findFirst.mockResolvedValue(paused);
    prisma.gameSession.update.mockResolvedValue(makeSession({ status: 'ACTIVE' }));
    prisma.gameDayLog.findFirst.mockResolvedValue(null);

    await expect(resolveGameSession(prisma, 'user-uuid')).resolves.toBeDefined();
    expect(prisma.gameDayLog.update).not.toHaveBeenCalled();
  });

  it('throws GameCompletedError and creates no new session when the latest is COMPLETED', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession({ status: 'COMPLETED' }));

    await expect(resolveGameSession(prisma, 'user-uuid')).rejects.toThrow(GameCompletedError);
    // A finished game must NOT silently spawn a fresh money:0 session and replay.
    expect(prisma.gameSession.create).not.toHaveBeenCalled();
    expect(prisma.gameSession.update).not.toHaveBeenCalled();
  });

  it('creates a brand-new session when the latest is GAME_OVER, per docs/api/game.md', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession({ status: 'GAME_OVER' }));
    prisma.gameSession.create.mockResolvedValue(makeSession({ status: 'ACTIVE', money: 0 }));

    const result = await resolveGameSession(prisma, 'user-uuid');

    expect(prisma.gameSession.create).toHaveBeenCalledWith({
      data: { userId: 'user-uuid', money: 0, consecutiveBadDiagnosisCount: 0, status: 'ACTIVE' },
    });
    expect(result.status).toBe('ACTIVE');
  });
});

describe('pickIndexForSeed', () => {
  it('returns an index within [0, length)', () => {
    const index = pickIndexForSeed('session-uuid', 5);

    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBeLessThan(5);
  });

  it('is deterministic for the same seed and length', () => {
    const first = pickIndexForSeed('session-uuid', 5);
    const second = pickIndexForSeed('session-uuid', 5);

    expect(second).toBe(first);
  });

  it('always returns 0 when there is only one candidate', () => {
    expect(pickIndexForSeed('session-uuid', 1)).toBe(0);
  });

  it('can select different indices for different seeds', () => {
    const indices = new Set(
      ['session-a', 'session-b', 'session-c', 'session-d', 'session-e'].map((seed) =>
        pickIndexForSeed(seed, 5),
      ),
    );

    expect(indices.size).toBeGreaterThan(1);
  });
});

describe('selectNextCase', () => {
  it('returns the lowest-featuredOrder unattempted case before the difficulty fallback', async () => {
    const prisma = createMockPrisma();
    const featuredCase = makeCase({ id: 'featured-1', featuredOrder: 1 });
    prisma.case.findFirst.mockResolvedValueOnce(featuredCase);

    const result = await selectNextCase(prisma, 'session-uuid');

    expect(result).toBe(featuredCase);
    expect(prisma.case.findFirst).toHaveBeenCalledWith({
      where: {
        isActive: true,
        featuredOrder: { not: null },
        diagnosisAttempts: { none: { gameDayLog: { gameSessionId: 'session-uuid' } } },
      },
      orderBy: { featuredOrder: 'asc' },
      include: { patient: true, documents: { orderBy: { sortOrder: 'asc' } } },
    });
    expect(prisma.case.findMany).not.toHaveBeenCalled();
  });

  it('queries the minimum difficulty among active, un-attempted cases', async () => {
    const prisma = createMockPrisma();
    prisma.case.findFirst.mockResolvedValueOnce(null).mockResolvedValue({ difficulty: 2 });
    prisma.case.findMany.mockResolvedValue([makeCase({ difficulty: 2 })]);

    await selectNextCase(prisma, 'session-uuid');

    expect(prisma.case.findFirst).toHaveBeenCalledWith({
      where: {
        isActive: true,
        diagnosisAttempts: { none: { gameDayLog: { gameSessionId: 'session-uuid' } } },
      },
      orderBy: { difficulty: 'asc' },
      select: { difficulty: true },
    });
  });

  it('fetches every active, un-attempted case at that minimum difficulty', async () => {
    const prisma = createMockPrisma();
    prisma.case.findFirst.mockResolvedValueOnce(null).mockResolvedValue({ difficulty: 2 });
    prisma.case.findMany.mockResolvedValue([makeCase({ difficulty: 2 })]);

    await selectNextCase(prisma, 'session-uuid');

    expect(prisma.case.findMany).toHaveBeenCalledWith({
      where: {
        isActive: true,
        difficulty: 2,
        diagnosisAttempts: { none: { gameDayLog: { gameSessionId: 'session-uuid' } } },
      },
      orderBy: { id: 'asc' },
      include: { patient: true, documents: { orderBy: { sortOrder: 'asc' } } },
    });
  });

  it('deterministically picks among tied candidates based on the game session id', async () => {
    const prisma = createMockPrisma();
    prisma.case.findFirst.mockResolvedValueOnce(null).mockResolvedValue({ difficulty: 1 });
    const candidates = [
      makeCase({ id: 'case-a' }),
      makeCase({ id: 'case-b' }),
      makeCase({ id: 'case-c' }),
    ];
    prisma.case.findMany.mockResolvedValue(candidates);
    const expectedIndex = pickIndexForSeed('session-uuid', candidates.length);

    const result = await selectNextCase(prisma, 'session-uuid');

    expect(result).toEqual(candidates[expectedIndex]);
  });

  it('returns the same case across repeated calls for the same session and candidate set', async () => {
    const prisma = createMockPrisma();
    // Called twice below, so use an implementation: no featured case, difficulty 1 otherwise.
    prisma.case.findFirst.mockImplementation((args) =>
      Promise.resolve('featuredOrder' in args.where ? null : { difficulty: 1 }),
    );
    const candidates = [
      makeCase({ id: 'case-a' }),
      makeCase({ id: 'case-b' }),
      makeCase({ id: 'case-c' }),
    ];
    prisma.case.findMany.mockResolvedValue(candidates);

    const first = await selectNextCase(prisma, 'session-uuid');
    const second = await selectNextCase(prisma, 'session-uuid');

    expect(second).toEqual(first);
  });

  it('returns the sole candidate when only one case ties at the lowest difficulty', async () => {
    const prisma = createMockPrisma();
    prisma.case.findFirst.mockResolvedValueOnce(null).mockResolvedValue({ difficulty: 1 });
    const onlyCase = makeCase({ id: 'case-only' });
    prisma.case.findMany.mockResolvedValue([onlyCase]);

    await expect(selectNextCase(prisma, 'session-uuid')).resolves.toEqual(onlyCase);
  });

  it('returns null when no case matches, without querying for tied candidates', async () => {
    const prisma = createMockPrisma();
    prisma.case.findFirst.mockResolvedValue(null);

    const result = await selectNextCase(prisma, 'session-uuid');

    expect(result).toBeNull();
    expect(prisma.case.findMany).not.toHaveBeenCalled();
  });
});

describe('selectDiagnosisOptions', () => {
  const catalog: DiagnosisRecord[] = [
    { id: 'd1', code: 'melanoma', name: 'Melanoma', category: 'MALIGNANT' },
    { id: 'd2', code: 'bcc', name: 'Basal Cell Carcinoma', category: 'MALIGNANT' },
    { id: 'd3', code: 'nevus', name: 'Nevus', category: 'BENIGN' },
    { id: 'd4', code: 'psoriasis', name: 'Psoriasis', category: 'INFLAMMATORY' },
    { id: 'd5', code: 'eczema', name: 'Eczema', category: 'INFLAMMATORY' },
    { id: 'd6', code: 'wart', name: 'Wart', category: 'INFECTIOUS' },
  ];

  it('returns exactly 4 diagnoses when the catalog has at least 4', () => {
    const result = selectDiagnosisOptions(catalog, 'd1');

    expect(result).toHaveLength(4);
  });

  it('always includes the correct diagnosis', () => {
    const result = selectDiagnosisOptions(catalog, 'd3');

    expect(result.some((diagnosis) => diagnosis.id === 'd3')).toBe(true);
  });

  it('never returns duplicate diagnoses', () => {
    const result = selectDiagnosisOptions(catalog, 'd1');
    const ids = result.map((diagnosis) => diagnosis.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('falls back to the full catalog when fewer than 4 diagnoses exist', () => {
    const smallCatalog = catalog.slice(0, 2);

    const result = selectDiagnosisOptions(smallCatalog, 'd1');

    expect(result).toHaveLength(2);
    expect(result.map((diagnosis) => diagnosis.id).sort()).toEqual(['d1', 'd2']);
  });

  it('sorts the returned options by name', () => {
    const result = selectDiagnosisOptions(catalog, 'd1', () => 0);
    const names = result.map((diagnosis) => diagnosis.name);

    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('picks different decoys when given a different random sequence, so repeat calls can reshuffle', () => {
    const alwaysFirst = () => 0;
    const alwaysLast = () => 0.999;

    const resultA = selectDiagnosisOptions(catalog, 'd1', alwaysFirst);
    const resultB = selectDiagnosisOptions(catalog, 'd1', alwaysLast);

    expect(resultA.map((diagnosis) => diagnosis.id).sort()).not.toEqual(
      resultB.map((diagnosis) => diagnosis.id).sort(),
    );
  });

  it('throws a clear error when correctDiagnosisId is not present in the diagnoses catalog', () => {
    expect(() => selectDiagnosisOptions(catalog, 'not-a-real-id')).toThrow(/not-a-real-id/);
  });

  it('never produces an undefined decoy when the injected random returns the upper boundary value 1', () => {
    const alwaysOne = () => 1;

    const result = selectDiagnosisOptions(catalog, 'd1', alwaysOne);

    expect(result).toHaveLength(4);
    expect(result.every((diagnosis) => diagnosis !== undefined)).toBe(true);
    const ids = result.map((diagnosis) => diagnosis.id);
    expect(new Set(ids).size).toBe(ids.length);
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
    prisma.case.findFirst.mockResolvedValueOnce(null).mockResolvedValue({ difficulty: 1 });
    prisma.case.findMany.mockResolvedValue([makeCase()]);
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
    prisma.caseExamination.findMany.mockResolvedValue([]);
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
      dayLog: { dayNumber: 1, elapsedMs: expect.any(Number) as number },
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

  it('never leaks correctDiagnosisId/correctTreatmentId/resultExplanationText', async () => {
    const prisma = createMockPrisma();
    primeHappyPath(prisma);
    prisma.case.findMany.mockResolvedValue([
      {
        ...makeCase(),
        correctDiagnosisId: 'diagnosis-uuid',
        correctTreatmentId: 'treatment-uuid',
        resultExplanationText: 'It was melanoma.',
      } as CaseRecord,
    ]);

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

  it('omits an EXAMINATION_RESULTS document when no successful CaseExamination matches its shopItemId', async () => {
    const prisma = createMockPrisma();
    primeHappyPath(prisma);
    prisma.case.findMany.mockResolvedValue([
      makeCase({
        documents: [
          ...makeCase().documents,
          {
            id: 'exam-doc-uuid',
            attentionPointRegion: null,
            type: 'EXAMINATION_RESULTS',
            title: 'Biopsy results',
            documentDate: null,
            sortOrder: 2,
            imageUrl: null,
            imageWidthPx: null,
            imageHeightPx: null,
            imageAltText: null,
            content: { shopItemId: 'exam-shop-item-uuid' },
          },
        ],
      }),
    ]);
    prisma.caseExamination.findMany.mockResolvedValue([]);

    const result = await startRound(prisma, 'user-uuid');

    expect(prisma.caseExamination.findMany).toHaveBeenCalledWith({
      where: { gameSessionId: 'session-uuid', caseId: 'case-uuid', isSuccessful: true },
      select: { shopItemId: true },
    });
    expect(result.case.documents.map((document) => document.id)).toEqual(['document-uuid']);
  });

  it('includes an EXAMINATION_RESULTS document once a successful CaseExamination references its shopItemId', async () => {
    const prisma = createMockPrisma();
    primeHappyPath(prisma);
    prisma.case.findMany.mockResolvedValue([
      makeCase({
        documents: [
          ...makeCase().documents,
          {
            id: 'exam-doc-uuid',
            attentionPointRegion: null,
            type: 'EXAMINATION_RESULTS',
            title: 'Biopsy results',
            documentDate: null,
            sortOrder: 2,
            imageUrl: null,
            imageWidthPx: null,
            imageHeightPx: null,
            imageAltText: null,
            content: { shopItemId: 'exam-shop-item-uuid' },
          },
        ],
      }),
    ]);
    prisma.caseExamination.findMany.mockResolvedValue([{ shopItemId: 'exam-shop-item-uuid' }]);

    const result = await startRound(prisma, 'user-uuid');

    expect(result.case.documents.map((document) => document.id)).toEqual([
      'document-uuid',
      'exam-doc-uuid',
    ]);
  });

  it('narrows diagnosisOptions to 4 entries (correct + 3 decoys) when the catalog has more', async () => {
    const prisma = createMockPrisma();
    primeHappyPath(prisma);
    prisma.diagnosis.findMany.mockResolvedValue([
      { id: 'diagnosis-uuid', code: 'MELANOMA', name: 'Melanoma', category: 'MALIGNANT' },
      { id: 'd2', code: 'bcc', name: 'Basal Cell Carcinoma', category: 'MALIGNANT' },
      { id: 'd3', code: 'nevus', name: 'Nevus', category: 'BENIGN' },
      { id: 'd4', code: 'psoriasis', name: 'Psoriasis', category: 'INFLAMMATORY' },
      { id: 'd5', code: 'eczema', name: 'Eczema', category: 'INFLAMMATORY' },
      { id: 'd6', code: 'wart', name: 'Wart', category: 'INFECTIOUS' },
    ]);

    const result = await startRound(prisma, 'user-uuid');

    expect(result.diagnosisOptions).toHaveLength(4);
    expect(result.diagnosisOptions.some((diagnosis) => diagnosis.id === 'diagnosis-uuid')).toBe(
      true,
    );
    const ids = result.diagnosisOptions.map((diagnosis) => diagnosis.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('never filters non-EXAMINATION_RESULTS document types', async () => {
    const prisma = createMockPrisma();
    primeHappyPath(prisma);
    prisma.caseExamination.findMany.mockResolvedValue([]);

    const result = await startRound(prisma, 'user-uuid');

    expect(result.case.documents.map((document) => document.id)).toEqual(['document-uuid']);
  });

  it('includes dayLog.elapsedMs computed from the open GameDayLog, so a page refresh does not lose progress', async () => {
    const prisma = createMockPrisma();
    primeHappyPath(prisma);
    const now = Date.now();
    prisma.gameDayLog.findFirst.mockResolvedValue(
      makeGameDayLog({
        startedAt: new Date(now - 10_000),
        totalPausedMs: 2_000,
        extraElapsedMs: 500,
      }),
    );

    const result = await startRound(prisma, 'user-uuid');

    // ~10s wall clock - 2s paused + 0.5s extra = ~8.5s; allow scheduling slack.
    expect(result.dayLog.elapsedMs).toBeGreaterThanOrEqual(8_400);
    expect(result.dayLog.elapsedMs).toBeLessThan(8_800);
  });

  it('does not create a new GameDayLog to compute dayLog.elapsedMs (resume path)', async () => {
    const prisma = createMockPrisma();
    primeHappyPath(prisma);

    await startRound(prisma, 'user-uuid');

    expect(prisma.gameDayLog.create).not.toHaveBeenCalled();
  });
});
