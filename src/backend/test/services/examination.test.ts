import { jest } from '@jest/globals';
import { NoActiveGameError, NoOpenDayError } from '../../src/services/game.js';
import { EXAMINATION_FAILURE_PENALTY_MONEY } from '../../src/constants.js';
import {
  CaseNotFoundError,
  ExaminationAlreadyOrderedError,
  ExaminationNotOwnedError,
  NotAnExaminationError,
  orderExamination,
  type CaseExaminationRecord,
  type ExaminationPrismaClient,
} from '../../src/services/examination.js';
import type { GameSessionRecord } from '../../src/services/round.js';

function createMockPrisma() {
  return {
    gameSession: {
      findFirst: jest.fn<ExaminationPrismaClient['gameSession']['findFirst']>(),
      update: jest.fn<ExaminationPrismaClient['gameSession']['update']>(),
    },
    case: {
      findUnique: jest.fn<ExaminationPrismaClient['case']['findUnique']>(),
    },
    shopItem: {
      findUnique: jest.fn<ExaminationPrismaClient['shopItem']['findUnique']>(),
    },
    ownedItem: {
      findFirst: jest.fn<ExaminationPrismaClient['ownedItem']['findFirst']>(),
    },
    caseExamination: {
      findFirst: jest.fn<ExaminationPrismaClient['caseExamination']['findFirst']>(),
      create: jest.fn<ExaminationPrismaClient['caseExamination']['create']>(),
    },
    gameDayLog: {
      findFirst: jest.fn<ExaminationPrismaClient['gameDayLog']['findFirst']>(),
      update: jest.fn<ExaminationPrismaClient['gameDayLog']['update']>(),
    },
    caseDocument: {
      findMany: jest.fn<ExaminationPrismaClient['caseDocument']['findMany']>(),
    },
    $transaction: jest.fn() as unknown as ExaminationPrismaClient['$transaction'],
  };
}

// The mock transaction just runs the callback against the same mock client,
// so tests can keep asserting on the individual writes directly.
function primeTransaction(prisma: ReturnType<typeof createMockPrisma>) {
  prisma.$transaction = jest.fn((fn: (tx: ExaminationPrismaClient) => Promise<unknown>) =>
    fn(prisma as unknown as ExaminationPrismaClient),
  ) as unknown as ExaminationPrismaClient['$transaction'];
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

function makeCaseExamination(
  overrides: Partial<CaseExaminationRecord> = {},
): CaseExaminationRecord {
  return {
    id: 'case-examination-uuid',
    caseId: 'case-uuid',
    shopItemId: 'shop-item-uuid',
    isSuccessful: true,
    orderedAt: new Date('2026-07-02T00:00:00.000Z'),
    ...overrides,
  };
}

describe('orderExamination', () => {
  function primeHappyPath(prisma: ReturnType<typeof createMockPrisma>) {
    prisma.gameSession.findFirst.mockResolvedValue(makeSession({ money: 100 }));
    prisma.case.findUnique.mockResolvedValue({ id: 'case-uuid' });
    prisma.shopItem.findUnique.mockResolvedValue({
      id: 'shop-item-uuid',
      itemType: 'EXAMINATION',
      content: { timeCostMs: 60000 },
    });
    prisma.ownedItem.findFirst.mockResolvedValue({ id: 'owned-item-uuid' });
    prisma.caseExamination.findFirst.mockResolvedValue(null);
    prisma.gameDayLog.findFirst.mockResolvedValue({ id: 'open-log-uuid', extraElapsedMs: 0 });
    prisma.gameDayLog.update.mockResolvedValue({ id: 'open-log-uuid' });
    prisma.caseDocument.findMany.mockResolvedValue([]);
    prisma.caseExamination.create.mockResolvedValue(makeCaseExamination());
    primeTransaction(prisma);
  }

  it('throws NoActiveGameError when there is no active GameSession', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(null);

    await expect(
      orderExamination(prisma, 'user-uuid', 'case-uuid', 'shop-item-uuid'),
    ).rejects.toThrow(NoActiveGameError);
    expect(prisma.case.findUnique).not.toHaveBeenCalled();
  });

  it('throws CaseNotFoundError when the case does not exist', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.case.findUnique.mockResolvedValue(null);

    await expect(
      orderExamination(prisma, 'user-uuid', 'missing-uuid', 'shop-item-uuid'),
    ).rejects.toThrow(CaseNotFoundError);
    expect(prisma.shopItem.findUnique).not.toHaveBeenCalled();
  });

  it('throws NotAnExaminationError when the ShopItem does not exist', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.case.findUnique.mockResolvedValue({ id: 'case-uuid' });
    prisma.shopItem.findUnique.mockResolvedValue(null);

    await expect(
      orderExamination(prisma, 'user-uuid', 'case-uuid', 'missing-shop-item-uuid'),
    ).rejects.toThrow(NotAnExaminationError);
    expect(prisma.ownedItem.findFirst).not.toHaveBeenCalled();
  });

  it('throws NotAnExaminationError when the ShopItem is not of type EXAMINATION', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.case.findUnique.mockResolvedValue({ id: 'case-uuid' });
    prisma.shopItem.findUnique.mockResolvedValue({
      id: 'shop-item-uuid',
      itemType: 'HANDBOOK',
      content: null,
    });

    await expect(
      orderExamination(prisma, 'user-uuid', 'case-uuid', 'shop-item-uuid'),
    ).rejects.toThrow(NotAnExaminationError);
  });

  it('throws ExaminationNotOwnedError when the player does not own the ShopItem', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.case.findUnique.mockResolvedValue({ id: 'case-uuid' });
    prisma.shopItem.findUnique.mockResolvedValue({
      id: 'shop-item-uuid',
      itemType: 'EXAMINATION',
      content: { timeCostMs: 60000 },
    });
    prisma.ownedItem.findFirst.mockResolvedValue(null);

    await expect(
      orderExamination(prisma, 'user-uuid', 'case-uuid', 'shop-item-uuid'),
    ).rejects.toThrow(ExaminationNotOwnedError);
    expect(prisma.caseExamination.findFirst).not.toHaveBeenCalled();
  });

  it('throws ExaminationAlreadyOrderedError when a CaseExamination already exists for this triple', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.case.findUnique.mockResolvedValue({ id: 'case-uuid' });
    prisma.shopItem.findUnique.mockResolvedValue({
      id: 'shop-item-uuid',
      itemType: 'EXAMINATION',
      content: { timeCostMs: 60000 },
    });
    prisma.ownedItem.findFirst.mockResolvedValue({ id: 'owned-item-uuid' });
    prisma.caseExamination.findFirst.mockResolvedValue({ id: 'existing-uuid' });

    await expect(
      orderExamination(prisma, 'user-uuid', 'case-uuid', 'shop-item-uuid'),
    ).rejects.toThrow(ExaminationAlreadyOrderedError);
    expect(prisma.gameDayLog.findFirst).not.toHaveBeenCalled();
  });

  it('throws NoOpenDayError when the session is ACTIVE but has no open GameDayLog', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.case.findUnique.mockResolvedValue({ id: 'case-uuid' });
    prisma.shopItem.findUnique.mockResolvedValue({
      id: 'shop-item-uuid',
      itemType: 'EXAMINATION',
      content: { timeCostMs: 60000 },
    });
    prisma.ownedItem.findFirst.mockResolvedValue({ id: 'owned-item-uuid' });
    prisma.caseExamination.findFirst.mockResolvedValue(null);
    prisma.gameDayLog.findFirst.mockResolvedValue(null);

    await expect(
      orderExamination(prisma, 'user-uuid', 'case-uuid', 'shop-item-uuid'),
    ).rejects.toThrow(NoOpenDayError);
    expect(prisma.caseDocument.findMany).not.toHaveBeenCalled();
  });

  it('matched: creates a successful CaseExamination, adds timeCostMs, and leaves money untouched', async () => {
    const prisma = createMockPrisma();
    primeHappyPath(prisma);
    prisma.caseDocument.findMany.mockResolvedValue([
      { id: 'doc-uuid', content: { shopItemId: 'shop-item-uuid' } },
    ]);
    prisma.caseExamination.create.mockResolvedValue(makeCaseExamination({ isSuccessful: true }));

    const result = await orderExamination(prisma, 'user-uuid', 'case-uuid', 'shop-item-uuid');

    expect(prisma.gameSession.update).not.toHaveBeenCalled();
    expect(prisma.gameDayLog.update).toHaveBeenCalledWith({
      where: { id: 'open-log-uuid' },
      data: { extraElapsedMs: 60000 },
    });
    expect(prisma.caseExamination.create).toHaveBeenCalledWith({
      data: {
        gameSessionId: 'session-uuid',
        caseId: 'case-uuid',
        shopItemId: 'shop-item-uuid',
        isSuccessful: true,
      },
    });
    expect(result.caseExamination.isSuccessful).toBe(true);
    expect(result.gameSession.money).toBe(100);
  });

  it('unmatched: creates an unsuccessful CaseExamination, still adds timeCostMs, and floors the penalty at zero', async () => {
    const prisma = createMockPrisma();
    primeHappyPath(prisma);
    prisma.gameSession.findFirst.mockResolvedValue(makeSession({ money: 10 }));
    prisma.caseDocument.findMany.mockResolvedValue([
      { id: 'doc-uuid', content: { shopItemId: 'other-shop-item-uuid' } },
    ]);
    prisma.caseExamination.create.mockResolvedValue(makeCaseExamination({ isSuccessful: false }));
    prisma.gameSession.update.mockResolvedValue(makeSession({ money: 0 }));

    const result = await orderExamination(prisma, 'user-uuid', 'case-uuid', 'shop-item-uuid');

    // money 10, penalty 25 → floored to 0, never negative.
    expect(prisma.gameSession.update).toHaveBeenCalledWith({
      where: { id: 'session-uuid' },
      data: { money: 0 },
    });
    expect(prisma.gameDayLog.update).toHaveBeenCalledWith({
      where: { id: 'open-log-uuid' },
      data: { extraElapsedMs: 60000 },
    });
    expect(prisma.caseExamination.create).toHaveBeenCalledWith({
      data: {
        gameSessionId: 'session-uuid',
        caseId: 'case-uuid',
        shopItemId: 'shop-item-uuid',
        isSuccessful: false,
      },
    });
    expect(result.caseExamination.isSuccessful).toBe(false);
    expect(result.gameSession.money).toBe(0);
    expect(result.gameSession.money).toBeGreaterThanOrEqual(0);
  });

  it('deducts the full penalty when the player can afford it', async () => {
    const prisma = createMockPrisma();
    primeHappyPath(prisma);
    prisma.gameSession.findFirst.mockResolvedValue(makeSession({ money: 100 }));
    prisma.caseDocument.findMany.mockResolvedValue([
      { id: 'doc-uuid', content: { shopItemId: 'other-shop-item-uuid' } },
    ]);
    prisma.caseExamination.create.mockResolvedValue(makeCaseExamination({ isSuccessful: false }));
    prisma.gameSession.update.mockResolvedValue(
      makeSession({ money: 100 - EXAMINATION_FAILURE_PENALTY_MONEY }),
    );

    await orderExamination(prisma, 'user-uuid', 'case-uuid', 'shop-item-uuid');

    expect(prisma.gameSession.update).toHaveBeenCalledWith({
      where: { id: 'session-uuid' },
      data: { money: 100 - EXAMINATION_FAILURE_PENALTY_MONEY },
    });
  });

  it('performs its writes inside a single transaction', async () => {
    const prisma = createMockPrisma();
    primeHappyPath(prisma);
    prisma.caseDocument.findMany.mockResolvedValue([
      { id: 'doc-uuid', content: { shopItemId: 'other-shop-item-uuid' } },
    ]);
    prisma.caseExamination.create.mockResolvedValue(makeCaseExamination({ isSuccessful: false }));
    prisma.gameSession.update.mockResolvedValue(makeSession({ money: 75 }));

    await orderExamination(prisma, 'user-uuid', 'case-uuid', 'shop-item-uuid');

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('treats a ShopItem with no content.timeCostMs as a zero time cost', async () => {
    const prisma = createMockPrisma();
    primeHappyPath(prisma);
    prisma.shopItem.findUnique.mockResolvedValue({
      id: 'shop-item-uuid',
      itemType: 'EXAMINATION',
      content: null,
    });
    prisma.caseDocument.findMany.mockResolvedValue([
      { id: 'doc-uuid', content: { shopItemId: 'shop-item-uuid' } },
    ]);

    await orderExamination(prisma, 'user-uuid', 'case-uuid', 'shop-item-uuid');

    expect(prisma.gameDayLog.update).toHaveBeenCalledWith({
      where: { id: 'open-log-uuid' },
      data: { extraElapsedMs: 0 },
    });
  });

  it('never leaks the userId column present on the raw GameSession row (matched path)', async () => {
    const prisma = createMockPrisma();
    primeHappyPath(prisma);
    prisma.gameSession.findFirst.mockResolvedValue({
      ...makeSession(),
      userId: 'user-uuid',
    } as GameSessionRecord);
    prisma.caseDocument.findMany.mockResolvedValue([
      { id: 'doc-uuid', content: { shopItemId: 'shop-item-uuid' } },
    ]);

    const result = await orderExamination(prisma, 'user-uuid', 'case-uuid', 'shop-item-uuid');

    expect(result.gameSession).not.toHaveProperty('userId');
  });

  it('never leaks the userId column present on the raw GameSession row (unmatched path)', async () => {
    const prisma = createMockPrisma();
    primeHappyPath(prisma);
    prisma.gameSession.update.mockResolvedValue({
      ...makeSession({ money: 100 - EXAMINATION_FAILURE_PENALTY_MONEY }),
      userId: 'user-uuid',
    } as GameSessionRecord);

    const result = await orderExamination(prisma, 'user-uuid', 'case-uuid', 'shop-item-uuid');

    expect(result.gameSession).not.toHaveProperty('userId');
  });
});
