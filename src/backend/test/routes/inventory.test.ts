import { jest } from '@jest/globals';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/db/prisma.js';
import type { GoogleIdTokenVerifier } from '../../src/services/auth.js';

function extractSessionCookie(response: {
  headers: { 'set-cookie'?: string | string[] | undefined };
}): string {
  const header = response.headers['set-cookie'];
  const raw = Array.isArray(header) ? header[0] : header;
  const match = /session=([^;]+)/.exec(String(raw));
  if (!match?.[1]) {
    throw new Error('session cookie not set on response');
  }
  return `session=${match[1]}`;
}

const VALID_PAYLOAD = {
  sub: 'google-inventory-1',
  email: 'doctor-inventory@example.test',
  email_verified: true,
  name: 'Doctor Test',
};

function createGoogleClient(payload: Record<string, unknown> | undefined): GoogleIdTokenVerifier {
  return { verifyIdToken: jest.fn(() => Promise.resolve({ getPayload: () => payload })) };
}

async function signIn(app: FastifyInstance): Promise<{ cookie: string; userId: string }> {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/google',
    payload: { idToken: 'raw' },
  });
  const body = response.json<{ user: { id: string } }>();
  return { cookie: extractSessionCookie(response), userId: body.user.id };
}

async function createNightPhaseSession(userId: string, dayNumber = 1, money = 100) {
  const gameSession = await prisma.gameSession.create({ data: { userId, money } });
  await prisma.gameDayLog.create({
    data: {
      gameSessionId: gameSession.id,
      dayNumber,
      startingMoney: money,
      startedAt: new Date(),
      endedAt: new Date(),
      endingMoney: money,
    },
  });
  return gameSession;
}

async function createOwnedItem(gameSessionId: string, sku: string) {
  const shopItem = await prisma.shopItem.create({
    data: { sku, name: sku, description: 'test', itemType: 'HANDBOOK', price: 10 },
  });
  return prisma.ownedItem.create({
    data: { gameSessionId, shopItemId: shopItem.id, purchasePrice: 10, purchasedOnDay: 1 },
  });
}

describe('inventory routes', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    await prisma.ownedItem.deleteMany({});
    await prisma.gameDayLog.deleteMany({});
    await prisma.gameSession.deleteMany({});
    await prisma.userSession.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.shopItem.deleteMany({});
    await app.close();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/v1/inventory', () => {
    it('returns 401 with no session cookie', async () => {
      app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
      await app.ready();

      const response = await app.inject({ method: 'GET', url: '/api/v1/inventory' });

      expect(response.statusCode).toBe(401);
    });

    it('returns empty day-1 defaults for a brand-new user', async () => {
      app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
      await app.ready();
      const { cookie } = await signIn(app);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/inventory',
        headers: { cookie },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        isNightPhase: false,
        upcomingDayNumber: 1,
        inventoryCapacity: 1,
        equippedItemIds: [],
        ownedItems: [],
      });
    });
  });

  describe('PUT /api/v1/inventory', () => {
    it('returns 401 with no session cookie', async () => {
      app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
      await app.ready();

      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/inventory',
        payload: { equippedItemIds: [] },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 409 not_night_phase during the day phase', async () => {
      app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
      await app.ready();
      const { cookie, userId } = await signIn(app);
      const gameSession = await prisma.gameSession.create({ data: { userId, money: 0 } });
      await prisma.gameDayLog.create({
        data: {
          gameSessionId: gameSession.id,
          dayNumber: 1,
          startingMoney: 0,
          startedAt: new Date(),
        },
      });

      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/inventory',
        headers: { cookie },
        payload: { equippedItemIds: [] },
      });

      expect(response.statusCode).toBe(409);
      expect(response.json()).toEqual({ error: 'not_night_phase' });
    });

    it('returns 409 inventory_capacity_exceeded when distinct ids exceed capacity', async () => {
      app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
      await app.ready();
      const { cookie, userId } = await signIn(app);
      const gameSession = await createNightPhaseSession(userId, 1);
      const itemA = await createOwnedItem(gameSession.id, 'sku-a');
      const itemB = await createOwnedItem(gameSession.id, 'sku-b');

      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/inventory',
        headers: { cookie },
        payload: { equippedItemIds: [itemA.id, itemB.id] },
      });

      expect(response.statusCode).toBe(409);
      expect(response.json()).toEqual({ error: 'inventory_capacity_exceeded' });
    });

    it('returns 409 item_not_owned for an id not owned by this session', async () => {
      app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
      await app.ready();
      const { cookie, userId } = await signIn(app);
      await createNightPhaseSession(userId, 1);

      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/inventory',
        headers: { cookie },
        payload: { equippedItemIds: ['00000000-0000-0000-0000-000000000000'] },
      });

      expect(response.statusCode).toBe(409);
      expect(response.json()).toEqual({ error: 'item_not_owned' });
    });

    it('happy path: equips an item, then a later call drops it, both reflected in the DB', async () => {
      app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
      await app.ready();
      const { cookie, userId } = await signIn(app);
      const gameSession = await createNightPhaseSession(userId, 1);
      const item = await createOwnedItem(gameSession.id, 'sku-a');

      const equipResponse = await app.inject({
        method: 'PUT',
        url: '/api/v1/inventory',
        headers: { cookie },
        payload: { equippedItemIds: [item.id] },
      });

      expect(equipResponse.statusCode).toBe(200);
      expect(equipResponse.json()).toMatchObject({ equippedItemIds: [item.id] });
      const afterEquip = await prisma.ownedItem.findUniqueOrThrow({ where: { id: item.id } });
      expect(afterEquip.isEquipped).toBe(true);

      const unequipResponse = await app.inject({
        method: 'PUT',
        url: '/api/v1/inventory',
        headers: { cookie },
        payload: { equippedItemIds: [] },
      });

      expect(unequipResponse.statusCode).toBe(200);
      expect(unequipResponse.json()).toMatchObject({ equippedItemIds: [] });
      const afterUnequip = await prisma.ownedItem.findUniqueOrThrow({ where: { id: item.id } });
      expect(afterUnequip.isEquipped).toBe(false);
    });
  });
});
