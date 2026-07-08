import { jest } from '@jest/globals';
import { NoActiveGameError } from '../../src/services/game.js';
import { NotNightPhaseError } from '../../src/services/dayPhase.js';
import {
  InventoryCapacityExceededError,
  ItemNotOwnedError,
  getInventory,
  updateEquippedItems,
  type InventoryPrismaClient,
} from '../../src/services/inventory.js';
import type { GameSessionRecord, OwnedItemRecord } from '../../src/services/round.js';

function createMockPrisma() {
  return {
    gameSession: {
      findFirst: jest.fn<InventoryPrismaClient['gameSession']['findFirst']>(),
    },
    gameDayLog: {
      findFirst: jest.fn<InventoryPrismaClient['gameDayLog']['findFirst']>(),
    },
    ownedItem: {
      findMany: jest.fn<InventoryPrismaClient['ownedItem']['findMany']>(),
      update: jest.fn<InventoryPrismaClient['ownedItem']['update']>(),
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

function makeOwnedItem(overrides: Partial<OwnedItemRecord> = {}): OwnedItemRecord {
  return {
    id: 'owned-item-a',
    shopItem: {
      id: 'shop-item-a',
      sku: 'sku-a',
      name: 'Item A',
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

describe('getInventory', () => {
  it('returns day-1 empty defaults when the user has no GameSession', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(null);

    const result = await getInventory(prisma, 'user-uuid');

    expect(result).toEqual({
      isNightPhase: false,
      upcomingDayNumber: 1,
      inventoryCapacity: 1,
      equippedItemIds: [],
      ownedItems: [],
    });
  });

  it('derives equippedItemIds from ownedItems where isEquipped is true', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue({ dayNumber: 3, endedAt: new Date() });
    prisma.ownedItem.findMany.mockResolvedValue([
      makeOwnedItem({ id: 'owned-a', isEquipped: true }),
      makeOwnedItem({ id: 'owned-b', isEquipped: false }),
    ]);

    const result = await getInventory(prisma, 'user-uuid');

    expect(result.isNightPhase).toBe(true);
    expect(result.upcomingDayNumber).toBe(4);
    expect(result.inventoryCapacity).toBe(2);
    expect(result.equippedItemIds).toEqual(['owned-a']);
    expect(result.ownedItems).toHaveLength(2);
  });
});

describe('updateEquippedItems', () => {
  it('throws NoActiveGameError when there is no active GameSession', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(null);

    await expect(updateEquippedItems(prisma, 'user-uuid', [])).rejects.toThrow(NoActiveGameError);
  });

  it('throws NotNightPhaseError during the day phase', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue({ dayNumber: 1, endedAt: null });

    await expect(updateEquippedItems(prisma, 'user-uuid', [])).rejects.toThrow(NotNightPhaseError);
  });

  it('throws InventoryCapacityExceededError when distinct ids exceed capacity', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue({ dayNumber: 1, endedAt: new Date() });

    await expect(updateEquippedItems(prisma, 'user-uuid', ['owned-a', 'owned-b'])).rejects.toThrow(
      InventoryCapacityExceededError,
    );
    expect(prisma.ownedItem.findMany).not.toHaveBeenCalled();
  });

  it('dedupes ids before checking capacity: ["a","a"] succeeds at capacity 1', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue({ dayNumber: 1, endedAt: new Date() });
    prisma.ownedItem.findMany.mockResolvedValue([makeOwnedItem({ id: 'owned-a' })]);
    prisma.ownedItem.update.mockResolvedValue(makeOwnedItem({ id: 'owned-a', isEquipped: true }));

    await expect(
      updateEquippedItems(prisma, 'user-uuid', ['owned-a', 'owned-a']),
    ).resolves.toBeDefined();
  });

  it('throws ItemNotOwnedError when an id is not owned by this session', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue({ dayNumber: 3, endedAt: new Date() });
    prisma.ownedItem.findMany.mockResolvedValue([makeOwnedItem({ id: 'owned-a' })]);

    await expect(updateEquippedItems(prisma, 'user-uuid', ['not-owned-uuid'])).rejects.toThrow(
      ItemNotOwnedError,
    );
    expect(prisma.ownedItem.update).not.toHaveBeenCalled();
  });

  it('equips listed ids and unequips previously-equipped ids not listed', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue({ dayNumber: 3, endedAt: new Date() });
    prisma.ownedItem.findMany.mockResolvedValue([
      makeOwnedItem({ id: 'owned-a', isEquipped: true }),
      makeOwnedItem({ id: 'owned-b', isEquipped: false }),
    ]);
    prisma.ownedItem.update.mockImplementation(({ where, data }) =>
      Promise.resolve(makeOwnedItem({ id: where.id, isEquipped: data.isEquipped })),
    );

    const result = await updateEquippedItems(prisma, 'user-uuid', ['owned-b']);

    expect(prisma.ownedItem.update).toHaveBeenCalledWith({
      where: { id: 'owned-a' },
      data: { isEquipped: false },
      include: { shopItem: true },
    });
    expect(prisma.ownedItem.update).toHaveBeenCalledWith({
      where: { id: 'owned-b' },
      data: { isEquipped: true },
      include: { shopItem: true },
    });
    expect(result.equippedItemIds).toEqual(['owned-b']);
  });
});
