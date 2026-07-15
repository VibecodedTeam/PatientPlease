import { jest } from '@jest/globals';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/db/prisma.js';
import { truncateDatabase } from '../setup/truncate.js';
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
  sub: 'google-logs-1',
  email: 'doctor-logs@example.test',
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

describe('POST /api/v1/logs', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    await truncateDatabase();
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
      url: '/api/v1/logs',
      payload: { gameSessionId: 'x', eventType: 'BOOK_DOCUMENT_OPENED' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'unauthenticated' });
  });

  it('returns 400 on a malformed body missing gameSessionId', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie } = await signIn(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/logs',
      headers: { cookie },
      payload: { eventType: 'BOOK_DOCUMENT_OPENED' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 400 for an eventType outside the known gameplay event vocabulary', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie } = await signIn(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/logs',
      headers: { cookie },
      payload: { gameSessionId: 'irrelevant', eventType: 'NOT_A_REAL_EVENT' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 404 game_session_not_found when the GameSession does not belong to the caller', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie } = await signIn(app);

    const otherUser = await prisma.user.create({
      data: { googleId: 'other-google-id', email: 'other@example.test', name: 'Other Doctor' },
    });
    const otherSession = await prisma.gameSession.create({ data: { userId: otherUser.id } });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/logs',
      headers: { cookie },
      payload: { gameSessionId: otherSession.id, eventType: 'BOOK_DOCUMENT_OPENED' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'game_session_not_found' });
  });

  it('returns 404 case_not_found when caseId is given but matches no Case', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    const gameSession = await prisma.gameSession.create({ data: { userId } });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/logs',
      headers: { cookie },
      payload: {
        gameSessionId: gameSession.id,
        caseId: '00000000-0000-0000-0000-000000000000',
        eventType: 'BOOK_DOCUMENT_OPENED',
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'case_not_found' });
  });

  it('creates a GameplayLog for BOOK_DOCUMENT_OPENED and returns it', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    const gameSession = await prisma.gameSession.create({ data: { userId } });
    const gameCase = await createCase();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/logs',
      headers: { cookie },
      payload: {
        gameSessionId: gameSession.id,
        caseId: gameCase.id,
        eventType: 'BOOK_DOCUMENT_OPENED',
        payload: { documentId: 'doc-1' },
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{
      log: {
        id: string;
        gameSessionId: string;
        caseId: string;
        eventType: string;
        payload: unknown;
      };
    }>();
    expect(body.log.gameSessionId).toBe(gameSession.id);
    expect(body.log.caseId).toBe(gameCase.id);
    expect(body.log.eventType).toBe('BOOK_DOCUMENT_OPENED');
    expect(body.log.payload).toEqual({ documentId: 'doc-1' });

    const rows = await prisma.gameplayLog.findMany({ where: { gameSessionId: gameSession.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.eventType).toBe('BOOK_DOCUMENT_OPENED');
  });

  it('creates a GameplayLog without a caseId or payload', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    const gameSession = await prisma.gameSession.create({ data: { userId } });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/logs',
      headers: { cookie },
      payload: { gameSessionId: gameSession.id, eventType: 'BOOK_DOCUMENT_OPENED' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{ log: { caseId: string | null; payload: unknown } }>();
    expect(body.log.caseId).toBeNull();
    expect(body.log.payload).toEqual({});
  });
});
