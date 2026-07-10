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

async function createActiveSessionWithOpenDay(
  userId: string,
  money = 100,
  // Far enough in the past that endDay's minimum-duration gate doesn't trip by default;
  // tests exercising that gate pass a recent startedAt explicitly.
  startedAt: Date = new Date(Date.now() - MIN_DAY_DURATION_MS - 1000),
) {
  const gameSession = await prisma.gameSession.create({ data: { userId, money } });
  const gameDayLog = await prisma.gameDayLog.create({
    data: {
      gameSessionId: gameSession.id,
      dayNumber: 1,
      startingMoney: money,
      startedAt,
    },
  });
  return { gameSession, gameDayLog };
}

async function createMelanomaCase() {
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
  return { diagnosis, gameCase };
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

  it('accumulates totalPausedMs from a stamped pausedAt before clearing it', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    const { gameDayLog } = await createActiveSessionWithOpenDay(userId);
    await prisma.gameDayLog.update({
      where: { id: gameDayLog.id },
      data: { pausedAt: new Date(Date.now() - 5000) },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/day/reset',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    const updatedDayLog = await prisma.gameDayLog.findUniqueOrThrow({
      where: { id: gameDayLog.id },
    });
    expect(updatedDayLog.pausedAt).toBeNull();
    expect(updatedDayLog.totalPausedMs).toBeGreaterThanOrEqual(5000);
    expect(updatedDayLog.totalPausedMs).toBeLessThan(6000);
  });
});

describe('POST /api/v1/day/end', () => {
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

    const response = await app.inject({ method: 'POST', url: '/api/v1/day/end' });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'unauthenticated' });
  });

  it('returns 409 no_active_game when the user has no GameSession', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie } = await signIn(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/day/end',
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
      url: '/api/v1/day/end',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: 'no_open_day' });
  });

  it('returns 409 day_not_elapsed when the day was opened less than MIN_DAY_DURATION_MS ago', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    const { gameDayLog } = await createActiveSessionWithOpenDay(userId, 80, new Date());

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/day/end',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(409);
    const body = response.json<{ error: string; remainingMs: number }>();
    expect(body.error).toBe('day_not_elapsed');
    expect(body.remainingMs).toBeGreaterThan(0);
    expect(body.remainingMs).toBeLessThanOrEqual(MIN_DAY_DURATION_MS);

    const stillOpen = await prisma.gameDayLog.findUniqueOrThrow({
      where: { id: gameDayLog.id },
    });
    expect(stillOpen.endedAt).toBeNull();
  });

  it('stamps endedAt/endingMoney and returns both gameSession and dayLog', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    const { gameDayLog } = await createActiveSessionWithOpenDay(userId, 80);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/day/end',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    const rawBody = response.body;
    const body = response.json<{
      gameSession: { status: string };
      dayLog: {
        id: string;
        dayNumber: number;
        startingMoney: number;
        endingMoney: number;
        endedAt: string;
      };
    }>();
    expect(body.gameSession.status).toBe('ACTIVE');
    expect(body.dayLog.id).toBe(gameDayLog.id);
    expect(body.dayLog.endingMoney).toBe(80);
    expect(body.dayLog.endedAt).not.toBeNull();
    expect(rawBody).not.toContain('gameSessionId');

    const updated = await prisma.gameDayLog.findUniqueOrThrow({ where: { id: gameDayLog.id } });
    expect(updated.endedAt).not.toBeNull();
    expect(updated.endingMoney).toBe(80);
  });

  it('calling it twice returns 409 no_open_day on the second call', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    await createActiveSessionWithOpenDay(userId, 80);

    const first = await app.inject({ method: 'POST', url: '/api/v1/day/end', headers: { cookie } });
    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/day/end',
      headers: { cookie },
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(409);
    expect(second.json()).toEqual({ error: 'no_open_day' });
  });

  it('computes casesAttempted/casesCorrect/thresholdMet/penaltyApplied and updates consecutiveBadDiagnosisCount', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    const { gameSession, gameDayLog } = await createActiveSessionWithOpenDay(userId, 80);
    await prisma.gameSession.update({
      where: { id: gameSession.id },
      data: { studentLoanThreshold: 100 },
    });
    const { diagnosis, gameCase } = await createMelanomaCase();
    await prisma.diagnosisAttempt.createMany({
      data: [
        {
          gameDayLogId: gameDayLog.id,
          caseId: gameCase.id,
          selectedDiagnosisId: diagnosis.id,
          isDiagnosisCorrect: true,
          moneyDelta: 50,
        },
        {
          gameDayLogId: gameDayLog.id,
          caseId: gameCase.id,
          selectedDiagnosisId: diagnosis.id,
          isDiagnosisCorrect: false,
          moneyDelta: -20,
        },
      ],
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/day/end',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{
      gameSession: { consecutiveBadDiagnosisCount: number };
      dayLog: {
        casesAttempted: number;
        casesCorrect: number;
        thresholdMet: boolean;
        penaltyApplied: boolean;
      };
    }>();
    expect(body.dayLog.casesAttempted).toBe(2);
    expect(body.dayLog.casesCorrect).toBe(1);
    expect(body.dayLog.thresholdMet).toBe(false);
    expect(body.dayLog.penaltyApplied).toBe(true);
    expect(body.gameSession.consecutiveBadDiagnosisCount).toBe(1);

    const updatedDayLog = await prisma.gameDayLog.findUniqueOrThrow({
      where: { id: gameDayLog.id },
    });
    expect(updatedDayLog.casesAttempted).toBe(2);
    expect(updatedDayLog.casesCorrect).toBe(1);
    expect(updatedDayLog.thresholdMet).toBe(false);
    expect(updatedDayLog.penaltyApplied).toBe(true);
  });
});
