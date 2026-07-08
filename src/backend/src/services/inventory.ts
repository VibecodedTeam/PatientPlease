import { NoActiveGameError } from './game.js';
import {
  resolveDayPhase,
  type DayPhaseInfo,
  type DayPhasePrismaClient,
  NotNightPhaseError,
} from './dayPhase.js';
import type { GameSessionRecord, GameSessionStatusValue, OwnedItemRecord } from './round.js';

export type { NotNightPhaseError };

/** Narrow, structurally-compatible subset of PrismaClient this service depends on — mirrors RoundPrismaClient in services/round.ts. */
export interface InventoryPrismaClient extends DayPhasePrismaClient {
  gameSession: {
    findFirst(args: {
      where: { userId: string };
      orderBy: { createdAt: 'desc' };
    }): Promise<GameSessionRecord | null>;
  };
  ownedItem: {
    findMany(args: {
      where: { gameSessionId: string };
      include: { shopItem: true };
      orderBy: { purchasedAt: 'asc' };
    }): Promise<OwnedItemRecord[]>;
    update(args: {
      where: { id: string };
      data: { isEquipped: boolean };
      include: { shopItem: true };
    }): Promise<OwnedItemRecord>;
  };
}

export interface InventoryResponse extends DayPhaseInfo {
  equippedItemIds: string[];
  ownedItems: OwnedItemRecord[];
}

export class InventoryCapacityExceededError extends Error {
  constructor(message = 'Inventory capacity exceeded') {
    super(message);
    this.name = 'InventoryCapacityExceededError';
  }
}

export class ItemNotOwnedError extends Error {
  constructor(message = 'OwnedItem does not belong to this session') {
    super(message);
    this.name = 'ItemNotOwnedError';
  }
}

async function findLatestGameSession(
  prisma: InventoryPrismaClient,
  userId: string,
): Promise<GameSessionRecord | null> {
  return prisma.gameSession.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
}

async function requireActiveGameSession(
  prisma: InventoryPrismaClient,
  userId: string,
): Promise<GameSessionRecord> {
  const session = await findLatestGameSession(prisma, userId);

  if (!session || session.status !== ('ACTIVE' satisfies GameSessionStatusValue)) {
    throw new NoActiveGameError();
  }

  return session;
}

function toOwnedItemResponse(record: OwnedItemRecord): OwnedItemRecord {
  return {
    id: record.id,
    shopItem: {
      id: record.shopItem.id,
      sku: record.shopItem.sku,
      name: record.shopItem.name,
      description: record.shopItem.description,
      itemType: record.shopItem.itemType,
      iconImageUrl: record.shopItem.iconImageUrl,
    },
    purchasePrice: record.purchasePrice,
    purchasedOnDay: record.purchasedOnDay,
    purchasedAt: record.purchasedAt,
    isEquipped: record.isEquipped,
  };
}

function toEquippedItemIds(ownedItems: OwnedItemRecord[]): string[] {
  return ownedItems.filter((item) => item.isEquipped).map((item) => item.id);
}

export async function getInventory(
  prisma: InventoryPrismaClient,
  userId: string,
): Promise<InventoryResponse> {
  const session = await findLatestGameSession(prisma, userId);

  if (!session) {
    return {
      isNightPhase: false,
      upcomingDayNumber: 1,
      inventoryCapacity: 1,
      equippedItemIds: [],
      ownedItems: [],
    };
  }

  const dayPhase = await resolveDayPhase(prisma, session.id);
  const ownedItems = await prisma.ownedItem.findMany({
    where: { gameSessionId: session.id },
    include: { shopItem: true },
    orderBy: { purchasedAt: 'asc' },
  });
  const mapped = ownedItems.map(toOwnedItemResponse);

  return {
    isNightPhase: dayPhase.isNightPhase,
    upcomingDayNumber: dayPhase.upcomingDayNumber,
    inventoryCapacity: dayPhase.inventoryCapacity,
    equippedItemIds: toEquippedItemIds(mapped),
    ownedItems: mapped,
  };
}

export async function updateEquippedItems(
  prisma: InventoryPrismaClient,
  userId: string,
  equippedItemIds: string[],
): Promise<InventoryResponse> {
  const session = await requireActiveGameSession(prisma, userId);

  const dayPhase = await resolveDayPhase(prisma, session.id);
  if (!dayPhase.isNightPhase) {
    throw new NotNightPhaseError();
  }

  const distinctIds = new Set(equippedItemIds);
  if (distinctIds.size > dayPhase.inventoryCapacity) {
    throw new InventoryCapacityExceededError();
  }

  const ownedItems = await prisma.ownedItem.findMany({
    where: { gameSessionId: session.id },
    include: { shopItem: true },
    orderBy: { purchasedAt: 'asc' },
  });

  const ownedIds = new Set(ownedItems.map((item) => item.id));
  for (const id of distinctIds) {
    if (!ownedIds.has(id)) {
      throw new ItemNotOwnedError();
    }
  }

  const updatedItems: OwnedItemRecord[] = [];
  for (const item of ownedItems) {
    const updated = await prisma.ownedItem.update({
      where: { id: item.id },
      data: { isEquipped: distinctIds.has(item.id) },
      include: { shopItem: true },
    });
    updatedItems.push(toOwnedItemResponse(updated));
  }

  return {
    isNightPhase: dayPhase.isNightPhase,
    upcomingDayNumber: dayPhase.upcomingDayNumber,
    inventoryCapacity: dayPhase.inventoryCapacity,
    equippedItemIds: toEquippedItemIds(updatedItems),
    ownedItems: updatedItems,
  };
}
