import { NoActiveGameError } from './game.js';
import {
  resolveDayPhase,
  type DayPhaseInfo,
  type DayPhasePrismaClient,
  NotNightPhaseError,
} from './dayPhase.js';
import type { GameSessionRecord, GameSessionStatusValue, OwnedItemRecord } from './round.js';

export interface ShopCatalogItemRecord {
  id: string;
  sku: string;
  name: string;
  description: string;
  itemType: string;
  price: number;
  unlockDay: number | null;
  isActive: boolean;
  iconImageUrl: string | null;
}

/** Narrow, structurally-compatible subset of PrismaClient this service depends on — mirrors RoundPrismaClient in services/round.ts. */
export interface ShopPrismaClient extends DayPhasePrismaClient {
  gameSession: {
    findFirst(args: {
      where: { userId: string };
      orderBy: { createdAt: 'desc' };
    }): Promise<GameSessionRecord | null>;
    update(args: { where: { id: string }; data: { money: number } }): Promise<GameSessionRecord>;
  };
  shopItem: {
    findMany(args: {
      where: { isActive: boolean; OR: [{ unlockDay: null }, { unlockDay: { lte: number } }] };
      orderBy: { name: 'asc' };
    }): Promise<ShopCatalogItemRecord[]>;
    findUnique(args: { where: { id: string } }): Promise<ShopCatalogItemRecord | null>;
  };
  ownedItem: {
    findMany(args: { where: { gameSessionId: string } }): Promise<{ shopItemId: string }[]>;
    findFirst(args: {
      where: { gameSessionId: string; shopItemId: string };
    }): Promise<{ id: string } | null>;
    create(args: {
      data: {
        gameSessionId: string;
        shopItemId: string;
        purchasePrice: number;
        purchasedOnDay: number;
        isEquipped: false;
      };
      include: { shopItem: true };
    }): Promise<OwnedItemRecord>;
  };
}

export interface ShopCatalogItem {
  id: string;
  sku: string;
  name: string;
  description: string;
  itemType: string;
  price: number;
  unlockDay: number | null;
  iconImageUrl: string | null;
  owned: boolean;
}

export interface ShopCatalogResponse extends DayPhaseInfo {
  money: number;
  items: ShopCatalogItem[];
}

export class ItemNotFoundError extends Error {
  constructor(message = 'ShopItem not found') {
    super(message);
    this.name = 'ItemNotFoundError';
  }
}

export class ItemLockedError extends Error {
  constructor(message = 'ShopItem is locked') {
    super(message);
    this.name = 'ItemLockedError';
  }
}

export class ItemAlreadyOwnedError extends Error {
  constructor(message = 'ShopItem is already owned') {
    super(message);
    this.name = 'ItemAlreadyOwnedError';
  }
}

export class InsufficientFundsError extends Error {
  constructor(message = 'Insufficient funds') {
    super(message);
    this.name = 'InsufficientFundsError';
  }
}

async function findLatestGameSession(
  prisma: ShopPrismaClient,
  userId: string,
): Promise<GameSessionRecord | null> {
  return prisma.gameSession.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
}

async function requireActiveGameSession(
  prisma: ShopPrismaClient,
  userId: string,
): Promise<GameSessionRecord> {
  const session = await findLatestGameSession(prisma, userId);

  if (!session || session.status !== ('ACTIVE' satisfies GameSessionStatusValue)) {
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

export async function getShopCatalog(
  prisma: ShopPrismaClient,
  userId: string,
): Promise<ShopCatalogResponse> {
  const session = await findLatestGameSession(prisma, userId);

  let dayPhase: DayPhaseInfo;
  let money: number;
  let ownedShopItemIds: Set<string>;

  if (!session) {
    dayPhase = { isNightPhase: false, upcomingDayNumber: 1, inventoryCapacity: 1 };
    money = 0;
    ownedShopItemIds = new Set();
  } else {
    dayPhase = await resolveDayPhase(prisma, session.id);
    money = session.money;
    const owned = await prisma.ownedItem.findMany({ where: { gameSessionId: session.id } });
    ownedShopItemIds = new Set(owned.map((item) => item.shopItemId));
  }

  const items = await prisma.shopItem.findMany({
    where: {
      isActive: true,
      OR: [{ unlockDay: null }, { unlockDay: { lte: dayPhase.upcomingDayNumber } }],
    },
    orderBy: { name: 'asc' },
  });

  return {
    isNightPhase: dayPhase.isNightPhase,
    upcomingDayNumber: dayPhase.upcomingDayNumber,
    inventoryCapacity: dayPhase.inventoryCapacity,
    money,
    items: items.map((item) => ({
      id: item.id,
      sku: item.sku,
      name: item.name,
      description: item.description,
      itemType: item.itemType,
      price: item.price,
      unlockDay: item.unlockDay,
      iconImageUrl: item.iconImageUrl,
      owned: ownedShopItemIds.has(item.id),
    })),
  };
}

export async function purchaseItem(
  prisma: ShopPrismaClient,
  userId: string,
  shopItemId: string,
): Promise<{ gameSession: GameSessionRecord; ownedItem: OwnedItemRecord }> {
  const session = await requireActiveGameSession(prisma, userId);

  const dayPhase = await resolveDayPhase(prisma, session.id);
  if (!dayPhase.isNightPhase) {
    throw new NotNightPhaseError();
  }

  const shopItem = await prisma.shopItem.findUnique({ where: { id: shopItemId } });
  if (!shopItem || !shopItem.isActive) {
    throw new ItemNotFoundError();
  }

  if (shopItem.unlockDay !== null && shopItem.unlockDay > dayPhase.upcomingDayNumber) {
    throw new ItemLockedError();
  }

  const existing = await prisma.ownedItem.findFirst({
    where: { gameSessionId: session.id, shopItemId: shopItem.id },
  });
  if (existing) {
    throw new ItemAlreadyOwnedError();
  }

  if (session.money < shopItem.price) {
    throw new InsufficientFundsError();
  }

  const updatedSession = await prisma.gameSession.update({
    where: { id: session.id },
    data: { money: session.money - shopItem.price },
  });

  const ownedItem = await prisma.ownedItem.create({
    data: {
      gameSessionId: session.id,
      shopItemId: shopItem.id,
      purchasePrice: shopItem.price,
      purchasedOnDay: dayPhase.upcomingDayNumber - 1,
      isEquipped: false,
    },
    include: { shopItem: true },
  });

  return { gameSession: toGameSessionResponse(updatedSession), ownedItem };
}
