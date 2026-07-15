import { jest } from '@jest/globals';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { EXAMINATION_FAILURE_PENALTY_MONEY } from '../../src/constants.js';
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
  sub: 'google-examinations-1',
  email: 'doctor-examinations@example.test',
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

async function createActiveSessionWithOpenDay(userId: string, money = 100) {
  const gameSession = await prisma.gameSession.create({ data: { userId, money } });
  const gameDayLog = await prisma.gameDayLog.create({
    data: {
      gameSessionId: gameSession.id,
      dayNumber: 1,
      startingMoney: money,
      startedAt: new Date(),
    },
  });
  return { gameSession, gameDayLog };
}

async function createCase() {
  const patient = await prisma.patient.create({
    data: {
      name: 'Jan Kowalski',
      age: 52,
      sex: 'MALE',
      occupation: 'Roofer',
      portraitImageUrl: 'https://cdn.example.test/jan.png',
      bodyModelVariant: 'male_average_01',
    },
  });
  const diagnosis = await prisma.diagnosis.create({
    data: { code: 'MELANOMA', name: 'Melanoma', description: 'test', category: 'MALIGNANT' },
  });
  return prisma.case.create({
    data: {
      patientId: patient.id,
      difficulty: 1,
      correctDiagnosisId: diagnosis.id,
      moneyReward: 50,
      moneyPenalty: 20,
      resultExplanationText: 'It was melanoma.',
    },
  });
}

async function createExaminationShopItem(timeCostMs = 60000) {
  return prisma.shopItem.create({
    data: {
      sku: `exam-${Math.random().toString(36).slice(2)}`,
      name: 'Biopsy',
      description: 'test',
      itemType: 'EXAMINATION',
      price: 20,
      content: { timeCostMs },
    },
  });
}

describe('POST /api/v1/examinations', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    await prisma.caseExamination.deleteMany({});
    await prisma.caseDocument.deleteMany({});
    await prisma.diagnosisAttempt.deleteMany({});
    await prisma.gameDayLog.deleteMany({});
    await prisma.ownedItem.deleteMany({});
    await prisma.case.deleteMany({});
    await prisma.patient.deleteMany({});
    await prisma.diagnosis.deleteMany({});
    await prisma.gameSession.deleteMany({});
    await prisma.userSession.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.shopItem.deleteMany({});
    await app.close();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('returns 401 with no session cookie', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/examinations',
      payload: { caseId: 'x', shopItemId: 'y' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'unauthenticated' });
  });

  it('returns 400 when the body is missing required fields', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie } = await signIn(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/examinations',
      headers: { cookie },
      payload: { caseId: 'x' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 409 no_active_game when the user has no GameSession', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie } = await signIn(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/examinations',
      headers: { cookie },
      payload: { caseId: 'x', shopItemId: 'y' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: 'no_active_game' });
  });

  it('returns 409 no_open_day when the ACTIVE session has no open GameDayLog', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    const gameSession = await prisma.gameSession.create({ data: { userId, money: 100 } });
    const gameCase = await createCase();
    const shopItem = await createExaminationShopItem();
    await prisma.ownedItem.create({
      data: {
        gameSessionId: gameSession.id,
        shopItemId: shopItem.id,
        purchasePrice: shopItem.price,
        purchasedOnDay: 1,
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/examinations',
      headers: { cookie },
      payload: { caseId: gameCase.id, shopItemId: shopItem.id },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: 'no_open_day' });
  });

  it('returns 404 case_not_found when the case does not exist', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    await createActiveSessionWithOpenDay(userId);
    const shopItem = await createExaminationShopItem();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/examinations',
      headers: { cookie },
      payload: { caseId: '00000000-0000-0000-0000-000000000000', shopItemId: shopItem.id },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'case_not_found' });
  });

  it('returns 409 not_an_examination when the ShopItem is not of type EXAMINATION', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    await createActiveSessionWithOpenDay(userId);
    const gameCase = await createCase();
    const shopItem = await prisma.shopItem.create({
      data: {
        sku: 'book-1',
        name: 'Handbook',
        description: 'test',
        itemType: 'HANDBOOK',
        price: 10,
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/examinations',
      headers: { cookie },
      payload: { caseId: gameCase.id, shopItemId: shopItem.id },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: 'not_an_examination' });
  });

  it('returns 409 examination_not_owned when the player has not purchased the examination', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    await createActiveSessionWithOpenDay(userId);
    const gameCase = await createCase();
    const shopItem = await createExaminationShopItem();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/examinations',
      headers: { cookie },
      payload: { caseId: gameCase.id, shopItemId: shopItem.id },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: 'examination_not_owned' });
  });

  it('returns 409 examination_already_ordered when ordering the same examination on the same case twice', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    const { gameSession } = await createActiveSessionWithOpenDay(userId);
    const gameCase = await createCase();
    const shopItem = await createExaminationShopItem();
    await prisma.ownedItem.create({
      data: {
        gameSessionId: gameSession.id,
        shopItemId: shopItem.id,
        purchasePrice: shopItem.price,
        purchasedOnDay: 1,
      },
    });

    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/examinations',
      headers: { cookie },
      payload: { caseId: gameCase.id, shopItemId: shopItem.id },
    });
    expect(first.statusCode).toBe(200);

    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/examinations',
      headers: { cookie },
      payload: { caseId: gameCase.id, shopItemId: shopItem.id },
    });

    expect(second.statusCode).toBe(409);
    expect(second.json()).toEqual({ error: 'examination_already_ordered' });
  });

  it('matched: returns isSuccessful true, leaves money untouched, reveals the document, and adds timeCostMs to the day', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    const { gameSession, gameDayLog } = await createActiveSessionWithOpenDay(userId, 100);
    const gameCase = await createCase();
    const shopItem = await createExaminationShopItem(60000);
    await prisma.ownedItem.create({
      data: {
        gameSessionId: gameSession.id,
        shopItemId: shopItem.id,
        purchasePrice: shopItem.price,
        purchasedOnDay: 1,
      },
    });
    await prisma.caseDocument.create({
      data: {
        caseId: gameCase.id,
        type: 'EXAMINATION_RESULTS',
        title: 'Biopsy results',
        sortOrder: 1,
        content: { shopItemId: shopItem.id },
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/examinations',
      headers: { cookie },
      payload: { caseId: gameCase.id, shopItemId: shopItem.id },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{
      gameSession: { money: number };
      caseExamination: { caseId: string; shopItemId: string; isSuccessful: boolean };
      timeCostMs: number;
    }>();
    expect(body.caseExamination.isSuccessful).toBe(true);
    expect(body.caseExamination.caseId).toBe(gameCase.id);
    expect(body.caseExamination.shopItemId).toBe(shopItem.id);
    expect(body.gameSession.money).toBe(100);
    expect(body.timeCostMs).toBe(60000);

    const updatedSession = await prisma.gameSession.findUniqueOrThrow({
      where: { id: gameSession.id },
    });
    expect(updatedSession.money).toBe(100);
    const updatedDayLog = await prisma.gameDayLog.findUniqueOrThrow({
      where: { id: gameDayLog.id },
    });
    expect(updatedDayLog.extraElapsedMs).toBe(60000);
  });

  it('unmatched: returns isSuccessful false and deducts the failure penalty from money', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    const { gameSession } = await createActiveSessionWithOpenDay(userId, 100);
    const gameCase = await createCase();
    const shopItem = await createExaminationShopItem(60000);
    await prisma.ownedItem.create({
      data: {
        gameSessionId: gameSession.id,
        shopItemId: shopItem.id,
        purchasePrice: shopItem.price,
        purchasedOnDay: 1,
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/examinations',
      headers: { cookie },
      payload: { caseId: gameCase.id, shopItemId: shopItem.id },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{
      gameSession: { money: number };
      caseExamination: { isSuccessful: boolean };
    }>();
    expect(body.caseExamination.isSuccessful).toBe(false);
    expect(body.gameSession.money).toBe(100 - EXAMINATION_FAILURE_PENALTY_MONEY);

    const updatedSession = await prisma.gameSession.findUniqueOrThrow({
      where: { id: gameSession.id },
    });
    expect(updatedSession.money).toBe(100 - EXAMINATION_FAILURE_PENALTY_MONEY);
  });
});
