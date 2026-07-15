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
  sub: 'google-shop-1',
  email: 'doctor-shop@example.test',
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

async function createNightPhaseSession(userId: string, money = 100) {
  const gameSession = await prisma.gameSession.create({ data: { userId, money } });
  await prisma.gameDayLog.create({
    data: {
      gameSessionId: gameSession.id,
      dayNumber: 1,
      startingMoney: money,
      startedAt: new Date(),
      endedAt: new Date(),
      endingMoney: money,
    },
  });
  return gameSession;
}

describe('shop routes', () => {
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

  describe('GET /api/v1/shop', () => {
    it('returns 401 with no session cookie', async () => {
      app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
      await app.ready();

      const response = await app.inject({ method: 'GET', url: '/api/v1/shop' });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({ error: 'unauthenticated' });
    });

    it('returns the day-1 catalog for a brand-new user with no GameSession', async () => {
      app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
      await app.ready();
      const { cookie } = await signIn(app);
      await prisma.shopItem.create({
        data: {
          sku: 'sku-1',
          name: 'Handbook',
          description: 'test',
          itemType: 'HANDBOOK',
          price: 50,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/shop',
        headers: { cookie },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json<{
        isNightPhase: boolean;
        upcomingDayNumber: number;
        inventoryCapacity: number;
        money: number;
        items: { sku: string; owned: boolean }[];
      }>();
      expect(body.isNightPhase).toBe(false);
      expect(body.upcomingDayNumber).toBe(1);
      expect(body.inventoryCapacity).toBe(1);
      expect(body.money).toBe(0);
      expect(body.items).toEqual([expect.objectContaining({ sku: 'sku-1', owned: false })]);
    });

    it('excludes inactive items and items locked past the upcoming day, includes unlockDay: null items', async () => {
      app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
      await app.ready();
      const { cookie } = await signIn(app);
      await prisma.shopItem.create({
        data: {
          sku: 'active',
          name: 'Active',
          description: 'test',
          itemType: 'HANDBOOK',
          price: 10,
        },
      });
      await prisma.shopItem.create({
        data: {
          sku: 'inactive',
          name: 'Inactive',
          description: 'test',
          itemType: 'HANDBOOK',
          price: 10,
          isActive: false,
        },
      });
      await prisma.shopItem.create({
        data: {
          sku: 'locked',
          name: 'Locked',
          description: 'test',
          itemType: 'HANDBOOK',
          price: 10,
          unlockDay: 5,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/shop',
        headers: { cookie },
      });

      const body = response.json<{ items: { sku: string }[] }>();
      expect(body.items.map((item) => item.sku)).toEqual(['active']);
    });

    it('exposes timeCostMs for EXAMINATION items and null for non-EXAMINATION items', async () => {
      app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
      await app.ready();
      const { cookie } = await signIn(app);
      await prisma.shopItem.create({
        data: {
          sku: 'exam-1',
          name: 'Biopsy',
          description: 'test',
          itemType: 'EXAMINATION',
          price: 20,
          content: { timeCostMs: 60000 },
        },
      });
      await prisma.shopItem.create({
        data: {
          sku: 'book-1',
          name: 'Handbook',
          description: 'test',
          itemType: 'HANDBOOK',
          price: 50,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/shop',
        headers: { cookie },
      });

      const body = response.json<{ items: { sku: string; timeCostMs: number | null }[] }>();
      expect(body.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ sku: 'exam-1', timeCostMs: 60000 }),
          expect.objectContaining({ sku: 'book-1', timeCostMs: null }),
        ]),
      );
    });
  });

  describe('POST /api/v1/shop/purchase', () => {
    it('returns 401 with no session cookie', async () => {
      app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
      await app.ready();

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/shop/purchase',
        payload: { shopItemId: 'x' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 409 not_night_phase during the day phase', async () => {
      app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
      await app.ready();
      const { cookie, userId } = await signIn(app);
      const gameSession = await prisma.gameSession.create({ data: { userId, money: 100 } });
      await prisma.gameDayLog.create({
        data: {
          gameSessionId: gameSession.id,
          dayNumber: 1,
          startingMoney: 100,
          startedAt: new Date(),
        },
      });
      const shopItem = await prisma.shopItem.create({
        data: {
          sku: 'sku-1',
          name: 'Handbook',
          description: 'test',
          itemType: 'HANDBOOK',
          price: 50,
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/shop/purchase',
        headers: { cookie },
        payload: { shopItemId: shopItem.id },
      });

      expect(response.statusCode).toBe(409);
      expect(response.json()).toEqual({ error: 'not_night_phase' });
    });

    it('happy path: debits money and creates an unequipped OwnedItem', async () => {
      app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
      await app.ready();
      const { cookie, userId } = await signIn(app);
      const gameSession = await createNightPhaseSession(userId, 100);
      const shopItem = await prisma.shopItem.create({
        data: {
          sku: 'sku-1',
          name: 'Handbook',
          description: 'test',
          itemType: 'HANDBOOK',
          price: 50,
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/shop/purchase',
        headers: { cookie },
        payload: { shopItemId: shopItem.id },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json<{
        gameSession: { money: number };
        ownedItem: { isEquipped: boolean; shopItem: { sku: string } };
      }>();
      expect(body.gameSession.money).toBe(50);
      expect(body.ownedItem.isEquipped).toBe(false);
      expect(body.ownedItem.shopItem.sku).toBe('sku-1');

      const updatedSession = await prisma.gameSession.findUniqueOrThrow({
        where: { id: gameSession.id },
      });
      expect(updatedSession.money).toBe(50);
    });

    it('duplicate purchase returns 409 item_already_owned', async () => {
      app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
      await app.ready();
      const { cookie, userId } = await signIn(app);
      const gameSession = await createNightPhaseSession(userId, 100);
      const shopItem = await prisma.shopItem.create({
        data: {
          sku: 'sku-1',
          name: 'Handbook',
          description: 'test',
          itemType: 'HANDBOOK',
          price: 50,
        },
      });
      await prisma.ownedItem.create({
        data: {
          gameSessionId: gameSession.id,
          shopItemId: shopItem.id,
          purchasePrice: 50,
          purchasedOnDay: 1,
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/shop/purchase',
        headers: { cookie },
        payload: { shopItemId: shopItem.id },
      });

      expect(response.statusCode).toBe(409);
      expect(response.json()).toEqual({ error: 'item_already_owned' });
    });

    it('underfunded purchase returns 409 insufficient_funds', async () => {
      app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
      await app.ready();
      const { cookie, userId } = await signIn(app);
      await createNightPhaseSession(userId, 10);
      const shopItem = await prisma.shopItem.create({
        data: {
          sku: 'sku-1',
          name: 'Handbook',
          description: 'test',
          itemType: 'HANDBOOK',
          price: 50,
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/shop/purchase',
        headers: { cookie },
        payload: { shopItemId: shopItem.id },
      });

      expect(response.statusCode).toBe(409);
      expect(response.json()).toEqual({ error: 'insufficient_funds' });
    });
  });
});
