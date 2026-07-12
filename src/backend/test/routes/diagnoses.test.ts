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
  sub: 'google-diagnoses-1',
  email: 'doctor-diagnoses@example.test',
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

async function createCase(overrides: { correctTreatmentId?: string } = {}) {
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
  const wrongDiagnosis = await prisma.diagnosis.create({
    data: { code: 'BENIGN_MOLE', name: 'Benign mole', description: 'test', category: 'BENIGN' },
  });
  const gameCase = await prisma.case.create({
    data: {
      patientId: patient.id,
      difficulty: 1,
      correctDiagnosisId: diagnosis.id,
      ...(overrides.correctTreatmentId ? { correctTreatmentId: overrides.correctTreatmentId } : {}),
      moneyReward: 50,
      moneyPenalty: 20,
      resultExplanationText: 'It was melanoma.',
    },
  });
  return { case: gameCase, correctDiagnosis: diagnosis, wrongDiagnosis };
}

describe('POST /api/v1/diagnoses', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    await prisma.diagnosisAttempt.deleteMany({});
    await prisma.caseExamination.deleteMany({});
    await prisma.caseDocument.deleteMany({});
    await prisma.gameDayLog.deleteMany({});
    await prisma.ownedItem.deleteMany({});
    await prisma.case.deleteMany({});
    await prisma.patient.deleteMany({});
    await prisma.treatment.deleteMany({});
    await prisma.diagnosis.deleteMany({});
    await prisma.gameSession.deleteMany({});
    await prisma.userSession.deleteMany({});
    await prisma.user.deleteMany({});
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
      url: '/api/v1/diagnoses',
      payload: { caseId: 'x', selectedDiagnosisId: 'y' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'unauthenticated' });
  });

  it('returns 409 no_active_game when the player has no GameSession', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie } = await signIn(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/diagnoses',
      headers: { cookie },
      payload: { caseId: 'x', selectedDiagnosisId: 'y' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: 'no_active_game' });
  });

  it('returns 404 case_not_found when caseId matches no Case', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    await createActiveSessionWithOpenDay(userId);
    const { correctDiagnosis } = await createCase();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/diagnoses',
      headers: { cookie },
      payload: {
        caseId: '00000000-0000-0000-0000-000000000000',
        selectedDiagnosisId: correctDiagnosis.id,
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'case_not_found' });
  });

  it('records a correct diagnosis, adds moneyReward, and returns the updated gameSession', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    await createActiveSessionWithOpenDay(userId, 100);
    const { case: gameCase, correctDiagnosis } = await createCase();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/diagnoses',
      headers: { cookie },
      payload: { caseId: gameCase.id, selectedDiagnosisId: correctDiagnosis.id },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{
      gameSession: { money: number };
      result: {
        isDiagnosisCorrect: boolean;
        isTreatmentCorrect: boolean | null;
        moneyDelta: number;
      };
    }>();
    expect(body.gameSession.money).toBe(150);
    expect(body.result).toEqual({
      isDiagnosisCorrect: true,
      isTreatmentCorrect: null,
      moneyDelta: 50,
    });

    const attempts = await prisma.diagnosisAttempt.findMany({ where: { caseId: gameCase.id } });
    expect(attempts).toHaveLength(1);
    expect(attempts[0]?.isDiagnosisCorrect).toBe(true);
  });

  it('records an incorrect diagnosis and deducts moneyPenalty', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    await createActiveSessionWithOpenDay(userId, 100);
    const { case: gameCase, wrongDiagnosis } = await createCase();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/diagnoses',
      headers: { cookie },
      payload: { caseId: gameCase.id, selectedDiagnosisId: wrongDiagnosis.id },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{ gameSession: { money: number } }>();
    expect(body.gameSession.money).toBe(80);
  });

  it('returns 409 diagnosis_already_attempted on a second submission for the same case', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    await createActiveSessionWithOpenDay(userId, 100);
    const { case: gameCase, correctDiagnosis } = await createCase();

    await app.inject({
      method: 'POST',
      url: '/api/v1/diagnoses',
      headers: { cookie },
      payload: { caseId: gameCase.id, selectedDiagnosisId: correctDiagnosis.id },
    });
    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/diagnoses',
      headers: { cookie },
      payload: { caseId: gameCase.id, selectedDiagnosisId: correctDiagnosis.id },
    });

    expect(second.statusCode).toBe(409);
    expect(second.json()).toEqual({ error: 'diagnosis_already_attempted' });
  });

  it('returns 400 on a malformed body missing selectedDiagnosisId', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie } = await signIn(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/diagnoses',
      headers: { cookie },
      payload: { caseId: 'x' },
    });

    expect(response.statusCode).toBe(400);
  });
});
