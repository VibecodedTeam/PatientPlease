import { jest } from '@jest/globals';
import { NoActiveGameError } from '../../src/services/game.js';
import { NotNightPhaseError } from '../../src/services/dayPhase.js';
import {
  ItemAlreadyOwnedError,
  ItemLockedError,
  ItemNotFoundError,
  InsufficientFundsError,
  getShopCatalog,
  purchaseItem,
  type ShopCatalogItemRecord,
  type ShopPrismaClient,
} from '../../src/services/shop.js';
import type { GameSessionRecord, OwnedItemRecord } from '../../src/services/round.js';

function createMockPrisma() {
  return {
    gameSession: {
      findFirst: jest.fn<ShopPrismaClient['gameSession']['findFirst']>(),
      update: jest.fn<ShopPrismaClient['gameSession']['update']>(),
    },
    gameDayLog: {
      findFirst: jest.fn<ShopPrismaClient['gameDayLog']['findFirst']>(),
    },
    shopItem: {
      findMany: jest.fn<ShopPrismaClient['shopItem']['findMany']>(),
      findUnique: jest.fn<ShopPrismaClient['shopItem']['findUnique']>(),
    },
    ownedItem: {
      findMany: jest.fn<ShopPrismaClient['ownedItem']['findMany']>(),
      findFirst: jest.fn<ShopPrismaClient['ownedItem']['findFirst']>(),
      create: jest.fn<ShopPrismaClient['ownedItem']['create']>(),
    },
    $transaction: jest.fn() as unknown as ShopPrismaClient['$transaction'],
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

function makeShopItem(overrides: Partial<ShopCatalogItemRecord> = {}): ShopCatalogItemRecord {
  return {
    id: 'shop-item-uuid',
    sku: 'sku-1',
    name: 'Handbook',
    description: 'test',
    itemType: 'HANDBOOK',
    price: 50,
    unlockDay: null,
    isActive: true,
    iconImageUrl: null,
    ...overrides,
  };
}

function makeOwnedItem(overrides: Partial<OwnedItemRecord> = {}): OwnedItemRecord {
  return {
    id: 'owned-item-uuid',
    shopItem: {
      id: 'shop-item-uuid',
      sku: 'sku-1',
      name: 'Handbook',
      description: 'test',
      itemType: 'HANDBOOK',
      iconImageUrl: null,
    },
    purchasePrice: 50,
    purchasedOnDay: 1,
    purchasedAt: new Date('2026-07-02T00:00:00.000Z'),
    isEquipped: false,
    ...overrides,
  };
}

describe('getShopCatalog', () => {
  it('returns day-1 defaults when the user has no GameSession', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(null);
    prisma.shopItem.findMany.mockResolvedValue([makeShopItem()]);

    const result = await getShopCatalog(prisma, 'user-uuid');

    expect(prisma.shopItem.findMany).toHaveBeenCalledWith({
      where: { isActive: true, OR: [{ unlockDay: null }, { unlockDay: { lte: 1 } }] },
      orderBy: { name: 'asc' },
    });
    expect(result.isNightPhase).toBe(false);
    expect(result.upcomingDayNumber).toBe(1);
    expect(result.inventoryCapacity).toBe(1);
    expect(result.money).toBe(0);
    expect(result.items).toEqual([
      {
        id: 'shop-item-uuid',
        sku: 'sku-1',
        name: 'Handbook',
        description: 'test',
        itemType: 'HANDBOOK',
        price: 50,
        unlockDay: null,
        iconImageUrl: null,
        owned: false,
      },
    ]);
  });

  it('marks owned items owned: true and reflects the session money/day phase', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession({ money: 30 }));
    prisma.gameDayLog.findFirst.mockResolvedValue({ dayNumber: 3, endedAt: new Date() });
    prisma.ownedItem.findMany.mockResolvedValue([{ shopItemId: 'shop-item-uuid' }]);
    prisma.shopItem.findMany.mockResolvedValue([makeShopItem()]);

    const result = await getShopCatalog(prisma, 'user-uuid');

    expect(result.isNightPhase).toBe(true);
    expect(result.upcomingDayNumber).toBe(4);
    expect(result.inventoryCapacity).toBe(2);
    expect(result.money).toBe(30);
    expect(result.items[0]?.owned).toBe(true);
  });

  it('queries with unlockDay <= upcomingDayNumber, excluding locked items at the query level', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue({ dayNumber: 5, endedAt: new Date() });
    prisma.ownedItem.findMany.mockResolvedValue([]);
    prisma.shopItem.findMany.mockResolvedValue([]);

    await getShopCatalog(prisma, 'user-uuid');

    expect(prisma.shopItem.findMany).toHaveBeenCalledWith({
      where: { isActive: true, OR: [{ unlockDay: null }, { unlockDay: { lte: 6 } }] },
      orderBy: { name: 'asc' },
    });
  });
});

describe('purchaseItem', () => {
  function primeHappyPath(prisma: ReturnType<typeof createMockPrisma>) {
    prisma.gameSession.findFirst.mockResolvedValue(makeSession({ money: 100 }));
    prisma.gameDayLog.findFirst.mockResolvedValue({ dayNumber: 3, endedAt: new Date() });
    prisma.shopItem.findUnique.mockResolvedValue(makeShopItem({ price: 50 }));
    prisma.ownedItem.findFirst.mockResolvedValue(null);
    prisma.gameSession.update.mockResolvedValue(makeSession({ money: 50 }));
    prisma.ownedItem.create.mockResolvedValue(makeOwnedItem());
    // The mock transaction just runs the callback against the same mock client,
    // so tests can keep asserting on gameSession.update/ownedItem.create directly.
    prisma.$transaction = jest.fn((fn: (tx: ShopPrismaClient) => Promise<unknown>) =>
      fn(prisma as unknown as ShopPrismaClient),
    ) as unknown as ShopPrismaClient['$transaction'];
  }

  it('throws NoActiveGameError when there is no active GameSession', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(null);

    await expect(purchaseItem(prisma, 'user-uuid', 'shop-item-uuid')).rejects.toThrow(
      NoActiveGameError,
    );
  });

  it('throws NotNightPhaseError during the day phase', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue({ dayNumber: 1, endedAt: null });

    await expect(purchaseItem(prisma, 'user-uuid', 'shop-item-uuid')).rejects.toThrow(
      NotNightPhaseError,
    );
    expect(prisma.shopItem.findUnique).not.toHaveBeenCalled();
  });

  it('throws ItemNotFoundError when the item does not exist', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue({ dayNumber: 3, endedAt: new Date() });
    prisma.shopItem.findUnique.mockResolvedValue(null);

    await expect(purchaseItem(prisma, 'user-uuid', 'missing-uuid')).rejects.toThrow(
      ItemNotFoundError,
    );
  });

  it('throws ItemNotFoundError when the item is inactive', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue({ dayNumber: 3, endedAt: new Date() });
    prisma.shopItem.findUnique.mockResolvedValue(makeShopItem({ isActive: false }));

    await expect(purchaseItem(prisma, 'user-uuid', 'shop-item-uuid')).rejects.toThrow(
      ItemNotFoundError,
    );
  });

  it('throws ItemLockedError when unlockDay is after upcomingDayNumber', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue({ dayNumber: 3, endedAt: new Date() });
    prisma.shopItem.findUnique.mockResolvedValue(makeShopItem({ unlockDay: 10 }));

    await expect(purchaseItem(prisma, 'user-uuid', 'shop-item-uuid')).rejects.toThrow(
      ItemLockedError,
    );
  });

  it('throws ItemAlreadyOwnedError when the session already owns the item', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue({ dayNumber: 3, endedAt: new Date() });
    prisma.shopItem.findUnique.mockResolvedValue(makeShopItem());
    prisma.ownedItem.findFirst.mockResolvedValue({ id: 'existing-owned-uuid' });

    await expect(purchaseItem(prisma, 'user-uuid', 'shop-item-uuid')).rejects.toThrow(
      ItemAlreadyOwnedError,
    );
  });

  it('throws InsufficientFundsError when session.money < price', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession({ money: 10 }));
    prisma.gameDayLog.findFirst.mockResolvedValue({ dayNumber: 3, endedAt: new Date() });
    prisma.shopItem.findUnique.mockResolvedValue(makeShopItem({ price: 50 }));
    prisma.ownedItem.findFirst.mockResolvedValue(null);

    await expect(purchaseItem(prisma, 'user-uuid', 'shop-item-uuid')).rejects.toThrow(
      InsufficientFundsError,
    );
    expect(prisma.gameSession.update).not.toHaveBeenCalled();
  });

  it('resolves ItemNotFoundError over ItemLockedError when both would apply (item missing wins)', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue({ dayNumber: 3, endedAt: new Date() });
    prisma.shopItem.findUnique.mockResolvedValue(null);

    await expect(purchaseItem(prisma, 'user-uuid', 'missing-uuid')).rejects.toThrow(
      ItemNotFoundError,
    );
  });

  it('debits money, creates the OwnedItem with isEquipped: false, and returns both records', async () => {
    const prisma = createMockPrisma();
    primeHappyPath(prisma);

    const result = await purchaseItem(prisma, 'user-uuid', 'shop-item-uuid');

    expect(prisma.gameSession.update).toHaveBeenCalledWith({
      where: { id: 'session-uuid' },
      data: { money: 50 },
    });
    expect(prisma.ownedItem.create).toHaveBeenCalledWith({
      data: {
        gameSessionId: 'session-uuid',
        shopItemId: 'shop-item-uuid',
        purchasePrice: 50,
        purchasedOnDay: 3,
        isEquipped: false,
      },
      include: { shopItem: true },
    });
    expect(result.gameSession.money).toBe(50);
    expect(result.ownedItem.isEquipped).toBe(false);
  });

  it('never leaks the userId column present on the raw GameSession row', async () => {
    const prisma = createMockPrisma();
    primeHappyPath(prisma);
    prisma.gameSession.update.mockResolvedValue({
      ...makeSession({ money: 50 }),
      userId: 'user-uuid',
    } as GameSessionRecord);

    const result = await purchaseItem(prisma, 'user-uuid', 'shop-item-uuid');

    expect(result.gameSession).not.toHaveProperty('userId');
  });

  it('debits money and creates the OwnedItem inside a single transaction', async () => {
    const prisma = createMockPrisma();
    primeHappyPath(prisma);

    await purchaseItem(prisma, 'user-uuid', 'shop-item-uuid');

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
