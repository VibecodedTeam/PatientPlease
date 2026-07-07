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
  sub: 'google-round-1',
  email: 'doctor@example.test',
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

async function createDiagnosis() {
  return prisma.diagnosis.create({
    data: { code: 'MELANOMA', name: 'Melanoma', description: 'test', category: 'MALIGNANT' },
  });
}

async function createTreatment() {
  return prisma.treatment.create({
    data: {
      code: 'REFER_ONCO',
      name: 'Refer to oncology',
      description: 'test',
      kind: 'REFERRAL',
    },
  });
}

async function createCase(diagnosisId: string, treatmentId: string) {
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
  const gameCase = await prisma.case.create({
    data: {
      patientId: patient.id,
      difficulty: 1,
      correctDiagnosisId: diagnosisId,
      correctTreatmentId: treatmentId,
      moneyReward: 50,
      moneyPenalty: 20,
      resultExplanationText: 'It was melanoma.',
    },
  });
  await prisma.caseDocument.create({
    data: {
      caseId: gameCase.id,
      attentionPointRegion: 'LEFT_ARM',
      type: 'SKIN_IMAGE',
      title: 'Left shoulder — day 1',
      sortOrder: 1,
      imageUrl: 'https://cdn.example.test/lesion.png',
    },
  });
  return gameCase;
}

describe('POST /api/v1/round', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    await prisma.diagnosisAttempt.deleteMany({});
    await prisma.gameDayLog.deleteMany({});
    await prisma.ownedItem.deleteMany({});
    await prisma.caseDocument.deleteMany({});
    await prisma.case.deleteMany({});
    await prisma.patient.deleteMany({});
    await prisma.gameSession.deleteMany({});
    await prisma.userSession.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.shopItem.deleteMany({});
    await prisma.diagnosis.deleteMany({});
    await prisma.treatment.deleteMany({});
    await app.close();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('returns 401 with no session cookie', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();

    const response = await app.inject({ method: 'POST', url: '/api/v1/round' });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'unauthenticated' });
  });

  it('returns the full round payload for a brand-new user, with no answer-key or attentionPoints leakage', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie, userId } = await signIn(app);

    const diagnosis = await createDiagnosis();
    const treatment = await createTreatment();
    await createCase(diagnosis.id, treatment.id);
    const shopItem = await prisma.shopItem.create({
      data: {
        sku: 'sku-1',
        name: 'Handbook',
        description: 'test',
        itemType: 'HANDBOOK',
        price: 100,
      },
    });
    const gameSession = await prisma.gameSession.create({ data: { userId, money: 40 } });
    await prisma.ownedItem.create({
      data: {
        gameSessionId: gameSession.id,
        shopItemId: shopItem.id,
        purchasePrice: 100,
        purchasedOnDay: 2,
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/round',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    const rawBody = response.body;
    const body = response.json<{
      gameSession: { id: string };
      ownedItems: { shopItem: { sku: string } }[];
      case: Record<string, unknown> & { documents: { attentionPointRegion: string | null }[] };
      diagnosisOptions: { id: string; code: string; name: string; category: string }[];
      treatmentOptions: { id: string; code: string; name: string; kind: string }[];
    }>();

    expect(body.gameSession.id).toBe(gameSession.id);
    expect(body.ownedItems).toHaveLength(1);
    expect(body.ownedItems[0]?.shopItem.sku).toBe('sku-1');
    expect(body.diagnosisOptions).toEqual([
      { id: diagnosis.id, code: 'MELANOMA', name: 'Melanoma', category: 'MALIGNANT' },
    ]);
    expect(body.treatmentOptions).toEqual([
      { id: treatment.id, code: 'REFER_ONCO', name: 'Refer to oncology', kind: 'REFERRAL' },
    ]);
    expect(body.case.documents[0]?.attentionPointRegion).toBe('LEFT_ARM');
    expect(body.case).not.toHaveProperty('correctDiagnosisId');
    expect(body.case).not.toHaveProperty('correctTreatmentId');
    expect(body.case).not.toHaveProperty('resultExplanationText');
    expect(rawBody).not.toContain('attentionPoints');
  });

  it('resumes an open day log: calling twice returns the same case and does not duplicate the GameDayLog row', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie } = await signIn(app);
    const diagnosis = await createDiagnosis();
    const treatment = await createTreatment();
    await createCase(diagnosis.id, treatment.id);

    const first = await app.inject({ method: 'POST', url: '/api/v1/round', headers: { cookie } });
    const second = await app.inject({ method: 'POST', url: '/api/v1/round', headers: { cookie } });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    const firstBody = first.json<{ gameSession: { id: string }; case: { id: string } }>();
    const secondBody = second.json<{ case: { id: string } }>();
    expect(secondBody.case.id).toBe(firstBody.case.id);

    const dayLogCount = await prisma.gameDayLog.count({
      where: { gameSessionId: firstBody.gameSession.id },
    });
    expect(dayLogCount).toBe(1);
  });

  it('returns 409 and marks the session COMPLETED once every active Case has a DiagnosisAttempt in this session', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie } = await signIn(app);
    const diagnosis = await createDiagnosis();
    const treatment = await createTreatment();
    const gameCase = await createCase(diagnosis.id, treatment.id);

    const first = await app.inject({ method: 'POST', url: '/api/v1/round', headers: { cookie } });
    const firstBody = first.json<{ gameSession: { id: string } }>();
    const gameDayLog = await prisma.gameDayLog.findFirstOrThrow({
      where: { gameSessionId: firstBody.gameSession.id },
    });
    await prisma.diagnosisAttempt.create({
      data: {
        gameDayLogId: gameDayLog.id,
        caseId: gameCase.id,
        selectedDiagnosisId: diagnosis.id,
        isDiagnosisCorrect: true,
        moneyDelta: 50,
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/round',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: 'no_cases_remaining' });
    const gameSession = await prisma.gameSession.findUniqueOrThrow({
      where: { id: firstBody.gameSession.id },
    });
    expect(gameSession.status).toBe('COMPLETED');
  });
});
