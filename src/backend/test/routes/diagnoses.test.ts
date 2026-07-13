import { jest } from '@jest/globals';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { MIN_DAY_DURATION_MS } from '../../src/constants.js';
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
      startedAt: new Date(Date.now() - MIN_DAY_DURATION_MS - 1000),
    },
  });
  return { gameSession, gameDayLog };
}

async function createMelanomaCase() {
  const diagnosis = await prisma.diagnosis.create({
    data: { code: 'MELANOMA', name: 'Melanoma', description: 'test', category: 'MALIGNANT' },
  });
  const decoyDiagnosis = await prisma.diagnosis.create({
    data: { code: 'NEVUS', name: 'Nevus', description: 'test', category: 'BENIGN' },
  });
  const patient = await prisma.patient.create({
    data: {
      name: 'Jan Kowalski',
      age: 52,
      sex: 'MALE',
      portraitImageUrl: 'https://cdn.example.test/jan.png',
      bodyModelVariant: 'male_average_01',
    },
  });
  const gameCase = await prisma.case.create({
    data: {
      patientId: patient.id,
      difficulty: 1,
      correctDiagnosisId: diagnosis.id,
      moneyReward: 50,
      moneyPenalty: 20,
      resultExplanationText: 'It was melanoma.',
    },
  });
  return { diagnosis, decoyDiagnosis, gameCase };
}

describe('POST /api/v1/diagnoses', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    await prisma.diagnosisAttempt.deleteMany({});
    await prisma.gameDayLog.deleteMany({});
    await prisma.caseDocument.deleteMany({});
    await prisma.caseHint.deleteMany({});
    await prisma.case.deleteMany({});
    await prisma.patient.deleteMany({});
    await prisma.gameSession.deleteMany({});
    await prisma.userSession.deleteMany({});
    await prisma.user.deleteMany({});
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

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/diagnoses',
      payload: { caseId: 'case-uuid', selectedDiagnosisId: 'diagnosis-uuid' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'unauthenticated' });
  });

  it('returns 409 no_active_game when the user has no GameSession', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie } = await signIn(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/diagnoses',
      headers: { cookie },
      payload: { caseId: 'case-uuid', selectedDiagnosisId: 'diagnosis-uuid' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: 'no_active_game' });
  });

  it('returns 409 no_open_day when the session has no open GameDayLog', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    await prisma.gameSession.create({ data: { userId, money: 100 } });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/diagnoses',
      headers: { cookie },
      payload: { caseId: 'case-uuid', selectedDiagnosisId: 'diagnosis-uuid' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: 'no_open_day' });
  });

  it('returns 404 case_not_found when the caseId does not exist', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    await createActiveSessionWithOpenDay(userId);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/diagnoses',
      headers: { cookie },
      payload: {
        caseId: '00000000-0000-7000-8000-000000000000',
        selectedDiagnosisId: 'diagnosis-uuid',
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'case_not_found' });
  });

  it('returns 409 case_already_attempted when this case already has a DiagnosisAttempt today', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    const { gameDayLog } = await createActiveSessionWithOpenDay(userId);
    const { diagnosis, gameCase } = await createMelanomaCase();
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
      url: '/api/v1/diagnoses',
      headers: { cookie },
      payload: { caseId: gameCase.id, selectedDiagnosisId: diagnosis.id },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: 'case_already_attempted' });
  });

  it('grades a correct diagnosis, credits moneyReward, and records the attempt', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    const { gameSession, gameDayLog } = await createActiveSessionWithOpenDay(userId, 100);
    const { diagnosis, gameCase } = await createMelanomaCase();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/diagnoses',
      headers: { cookie },
      payload: { caseId: gameCase.id, selectedDiagnosisId: diagnosis.id },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{
      gameSession: { money: number };
      isDiagnosisCorrect: boolean;
      moneyDelta: number;
    }>();
    expect(body.isDiagnosisCorrect).toBe(true);
    expect(body.moneyDelta).toBe(50);
    expect(body.gameSession.money).toBe(150);

    const updatedSession = await prisma.gameSession.findUniqueOrThrow({
      where: { id: gameSession.id },
    });
    expect(updatedSession.money).toBe(150);

    const attempts = await prisma.diagnosisAttempt.findMany({
      where: { gameDayLogId: gameDayLog.id },
    });
    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toMatchObject({
      caseId: gameCase.id,
      selectedDiagnosisId: diagnosis.id,
      isDiagnosisCorrect: true,
      moneyDelta: 50,
    });
  });

  it('grades an incorrect diagnosis, debits moneyPenalty, and records the attempt', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    await createActiveSessionWithOpenDay(userId, 100);
    const { decoyDiagnosis, gameCase } = await createMelanomaCase();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/diagnoses',
      headers: { cookie },
      payload: { caseId: gameCase.id, selectedDiagnosisId: decoyDiagnosis.id },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{
      gameSession: { money: number };
      isDiagnosisCorrect: boolean;
      moneyDelta: number;
    }>();
    expect(body.isDiagnosisCorrect).toBe(false);
    expect(body.moneyDelta).toBe(-20);
    expect(body.gameSession.money).toBe(80);
  });

  it('excludes the just-diagnosed case from the next /api/v1/round call', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    await createActiveSessionWithOpenDay(userId, 100);
    const { diagnosis, gameCase } = await createMelanomaCase();

    await app.inject({
      method: 'POST',
      url: '/api/v1/diagnoses',
      headers: { cookie },
      payload: { caseId: gameCase.id, selectedDiagnosisId: diagnosis.id },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/round',
      headers: { cookie },
    });

    // Every Case created in this test was just diagnosed, so none remain.
    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: 'no_cases_remaining' });
  });
});
