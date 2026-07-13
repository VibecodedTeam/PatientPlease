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
  sub: 'google-game-1',
  email: 'doctor-game@example.test',
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

describe('POST /api/v1/game/pause', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    await prisma.diagnosisAttempt.deleteMany({});
    await prisma.gameDayLog.deleteMany({});
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

    const response = await app.inject({ method: 'POST', url: '/api/v1/game/pause' });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'unauthenticated' });
  });

  it('returns 409 no_active_game when the user has no GameSession', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie } = await signIn(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/game/pause',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: 'no_active_game' });
  });

  it('returns 409 no_open_day when the ACTIVE session has no open GameDayLog', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    await prisma.gameSession.create({ data: { userId, money: 0 } });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/game/pause',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: 'no_open_day' });
  });

  it('stamps pausedAt and flips the session to PAUSED, without leaking userId', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    const { gameSession, gameDayLog } = await createActiveSessionWithOpenDay(userId);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/game/pause',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    const rawBody = response.body;
    const body = response.json<{ gameSession: { id: string; status: string } }>();
    expect(body.gameSession.id).toBe(gameSession.id);
    expect(body.gameSession.status).toBe('PAUSED');
    expect(rawBody).not.toContain('userId');

    const updatedDayLog = await prisma.gameDayLog.findUniqueOrThrow({
      where: { id: gameDayLog.id },
    });
    expect(updatedDayLog.pausedAt).not.toBeNull();
  });

  it('accumulates totalPausedMs and clears pausedAt when the next /api/v1/round call resumes', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    const { gameDayLog } = await createActiveSessionWithOpenDay(userId);

    await app.inject({ method: 'POST', url: '/api/v1/game/pause', headers: { cookie } });
    await prisma.gameDayLog.update({
      where: { id: gameDayLog.id },
      data: { pausedAt: new Date(Date.now() - 5000) },
    });

    // No Case is seeded in this describe block, so /round may 409 no_cases_remaining once it
    // gets past the resume step — that's fine, the resume accounting already happened by then.
    await app.inject({ method: 'POST', url: '/api/v1/round', headers: { cookie } });

    const updatedDayLog = await prisma.gameDayLog.findUniqueOrThrow({
      where: { id: gameDayLog.id },
    });
    expect(updatedDayLog.pausedAt).toBeNull();
    expect(updatedDayLog.totalPausedMs).toBeGreaterThanOrEqual(5000);
    expect(updatedDayLog.totalPausedMs).toBeLessThan(6000);
  });
});

describe('POST /api/v1/game/reset', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    await prisma.diagnosisAttempt.deleteMany({});
    await prisma.gameDayLog.deleteMany({});
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

    const response = await app.inject({ method: 'POST', url: '/api/v1/game/reset' });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'unauthenticated' });
  });

  it('returns 200 with a null gameSession when the user has never played', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie } = await signIn(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/game/reset',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ gameSession: null });
  });

  it('marks the session GAME_OVER and closes an open GameDayLog, without leaking userId', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    const { gameSession, gameDayLog } = await createActiveSessionWithOpenDay(userId);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/game/reset',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    const rawBody = response.body;
    const body = response.json<{ gameSession: { id: string; status: string } }>();
    expect(body.gameSession.id).toBe(gameSession.id);
    expect(body.gameSession.status).toBe('GAME_OVER');
    expect(rawBody).not.toContain('userId');

    const updatedDayLog = await prisma.gameDayLog.findUniqueOrThrow({
      where: { id: gameDayLog.id },
    });
    expect(updatedDayLog.endedAt).not.toBeNull();
  });
});
