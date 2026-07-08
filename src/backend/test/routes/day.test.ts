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
  sub: 'google-day-1',
  email: 'doctor-day@example.test',
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

describe('POST /api/v1/day/reset', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    await prisma.diagnosisAttempt.deleteMany({});
    await prisma.gameDayLog.deleteMany({});
    await prisma.caseDocument.deleteMany({});
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

    const response = await app.inject({ method: 'POST', url: '/api/v1/day/reset' });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'unauthenticated' });
  });

  it('returns 409 no_active_game when the user has no GameSession', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie } = await signIn(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/day/reset',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: 'no_active_game' });
  });

  it('returns 409 no_open_day when the session has no open GameDayLog', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    await prisma.gameSession.create({ data: { userId, money: 0 } });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/day/reset',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: 'no_open_day' });
  });

  it.each(['GAME_OVER', 'COMPLETED'] as const)(
    'returns 409 no_active_game when the session is %s, even with a stray open GameDayLog',
    async (status) => {
      app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
      await app.ready();
      const { cookie, userId } = await signIn(app);
      const { gameSession } = await createActiveSessionWithOpenDay(userId);
      await prisma.gameSession.update({ where: { id: gameSession.id }, data: { status } });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/day/reset',
        headers: { cookie },
      });

      expect(response.statusCode).toBe(409);
      expect(response.json()).toEqual({ error: 'no_active_game' });
    },
  );

  it('deletes DiagnosisAttempts, refunds money to startingMoney, and resets day counters', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    const { gameSession, gameDayLog } = await createActiveSessionWithOpenDay(userId, 50);

    const diagnosis = await prisma.diagnosis.create({
      data: { code: 'MELANOMA', name: 'Melanoma', description: 'test', category: 'MALIGNANT' },
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
    await prisma.diagnosisAttempt.create({
      data: {
        gameDayLogId: gameDayLog.id,
        caseId: gameCase.id,
        selectedDiagnosisId: diagnosis.id,
        isDiagnosisCorrect: true,
        moneyDelta: 50,
      },
    });
    await prisma.gameSession.update({ where: { id: gameSession.id }, data: { money: 100 } });
    await prisma.gameDayLog.update({
      where: { id: gameDayLog.id },
      data: { casesAttempted: 1, casesCorrect: 1 },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/day/reset',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    const rawBody = response.body;
    const body = response.json<{ gameSession: { id: string; money: number } }>();
    expect(body.gameSession.money).toBe(50);
    expect(rawBody).not.toContain('userId');

    const attemptCount = await prisma.diagnosisAttempt.count({
      where: { gameDayLogId: gameDayLog.id },
    });
    expect(attemptCount).toBe(0);

    const updatedDayLog = await prisma.gameDayLog.findUniqueOrThrow({
      where: { id: gameDayLog.id },
    });
    expect(updatedDayLog.casesAttempted).toBe(0);
    expect(updatedDayLog.casesCorrect).toBe(0);
  });

  it('flips a PAUSED session back to ACTIVE', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    const { gameSession } = await createActiveSessionWithOpenDay(userId);
    await prisma.gameSession.update({ where: { id: gameSession.id }, data: { status: 'PAUSED' } });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/day/reset',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{ gameSession: { status: string } }>();
    expect(body.gameSession.status).toBe('ACTIVE');
  });
});
