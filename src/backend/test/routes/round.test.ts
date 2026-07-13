import { jest } from '@jest/globals';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/db/prisma.js';
import type { GoogleIdTokenVerifier } from '../../src/services/auth.js';
import { pickIndexForSeed } from '../../src/services/round.js';

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
    await prisma.caseExamination.deleteMany({});
    await prisma.diagnosisAttempt.deleteMany({});
    await prisma.gameDayLog.deleteMany({});
    await prisma.ownedItem.deleteMany({});
    await prisma.caseDocument.deleteMany({});
    await prisma.caseHint.deleteMany({});
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
      ownedItems: { shopItem: { sku: string }; isEquipped: boolean }[];
      case: Record<string, unknown> & { documents: { attentionPointRegion: string | null }[] };
      diagnosisOptions: { id: string; code: string; name: string; category: string }[];
      treatmentOptions: { id: string; code: string; name: string; kind: string }[];
    }>();

    expect(body.gameSession.id).toBe(gameSession.id);
    expect(body.ownedItems).toHaveLength(1);
    expect(body.ownedItems[0]?.shopItem.sku).toBe('sku-1');
    expect(body.ownedItems[0]?.isEquipped).toBe(false);
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

  it('narrows diagnosisOptions to 4 entries (correct + 3 decoys) when the catalog has more', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie } = await signIn(app);

    const diagnosis = await createDiagnosis();
    const treatment = await createTreatment();
    await createCase(diagnosis.id, treatment.id);
    await prisma.diagnosis.createMany({
      data: [
        { code: 'BCC', name: 'Basal Cell Carcinoma', description: 'test', category: 'MALIGNANT' },
        { code: 'NEVUS', name: 'Nevus', description: 'test', category: 'BENIGN' },
        { code: 'PSORIASIS', name: 'Psoriasis', description: 'test', category: 'INFLAMMATORY' },
        { code: 'ECZEMA', name: 'Eczema', description: 'test', category: 'INFLAMMATORY' },
        { code: 'WART', name: 'Wart', description: 'test', category: 'INFECTIOUS' },
      ],
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/round',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{
      diagnosisOptions: { id: string; code: string; name: string; category: string }[];
    }>();
    expect(body.diagnosisOptions).toHaveLength(4);
    expect(body.diagnosisOptions.some((option) => option.id === diagnosis.id)).toBe(true);
    const ids = body.diagnosisOptions.map((option) => option.id);
    expect(new Set(ids).size).toBe(ids.length);
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

  it('breaks ties at the lowest difficulty deterministically by session id, and stays on that case until diagnosed', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie } = await signIn(app);
    const diagnosis = await createDiagnosis();
    const treatment = await createTreatment();
    const caseA = await createCase(diagnosis.id, treatment.id);
    const caseB = await createCase(diagnosis.id, treatment.id);
    const candidates = [caseA, caseB].sort((a, b) => (a.id < b.id ? -1 : 1));

    const first = await app.inject({ method: 'POST', url: '/api/v1/round', headers: { cookie } });
    const firstBody = first.json<{ gameSession: { id: string }; case: { id: string } }>();
    const expectedIndex = pickIndexForSeed(firstBody.gameSession.id, candidates.length);
    expect(firstBody.case.id).toBe(candidates[expectedIndex]?.id);

    const second = await app.inject({ method: 'POST', url: '/api/v1/round', headers: { cookie } });
    const secondBody = second.json<{ case: { id: string } }>();
    expect(secondBody.case.id).toBe(firstBody.case.id);
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

  it('returns 409 game_completed for a COMPLETED session without wiping money or spawning a new session', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    const completed = await prisma.gameSession.create({
      data: { userId, money: 250, status: 'COMPLETED' },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/round',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: 'game_completed' });
    // No new session created, and the finished session's money is untouched.
    const sessions = await prisma.gameSession.findMany({ where: { userId } });
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.id).toBe(completed.id);
    expect(sessions[0]?.money).toBe(250);
  });

  it('starts a brand-new session and returns 200 when the latest session is GAME_OVER', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    const diagnosis = await createDiagnosis();
    const treatment = await createTreatment();
    await createCase(diagnosis.id, treatment.id);
    await prisma.gameSession.create({
      data: { userId, money: 250, status: 'GAME_OVER' },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/round',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    const sessions = await prisma.gameSession.findMany({ where: { userId } });
    expect(sessions).toHaveLength(2);
    const newSession = sessions.find((s) => s.status === 'ACTIVE');
    expect(newSession).toBeDefined();
    expect(newSession?.money).toBe(0);
  });

  it('hides an EXAMINATION_RESULTS document until a successful CaseExamination exists for it', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie } = await signIn(app);
    const diagnosis = await createDiagnosis();
    const treatment = await createTreatment();
    const gameCase = await createCase(diagnosis.id, treatment.id);
    const shopItem = await prisma.shopItem.create({
      data: {
        sku: 'biopsy-1',
        name: 'Biopsy',
        description: 'test',
        itemType: 'EXAMINATION',
        price: 20,
        content: { timeCostMs: 60000 },
      },
    });
    await prisma.caseDocument.create({
      data: {
        caseId: gameCase.id,
        type: 'EXAMINATION_RESULTS',
        title: 'Biopsy results',
        sortOrder: 2,
        content: { shopItemId: shopItem.id },
      },
    });

    const first = await app.inject({ method: 'POST', url: '/api/v1/round', headers: { cookie } });
    const firstBody = first.json<{
      gameSession: { id: string };
      case: { documents: { type: string }[] };
    }>();
    expect(firstBody.case.documents.map((document) => document.type)).not.toContain(
      'EXAMINATION_RESULTS',
    );

    await prisma.caseExamination.create({
      data: {
        gameSessionId: firstBody.gameSession.id,
        caseId: gameCase.id,
        shopItemId: shopItem.id,
        isSuccessful: true,
      },
    });

    const second = await app.inject({ method: 'POST', url: '/api/v1/round', headers: { cookie } });
    const secondBody = second.json<{ case: { documents: { type: string }[] } }>();
    expect(secondBody.case.documents.map((document) => document.type)).toContain(
      'EXAMINATION_RESULTS',
    );
  });
});
