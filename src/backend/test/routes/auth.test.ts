import { jest } from '@jest/globals';
import fastifyCookie from '@fastify/cookie';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/db/prisma.js';
import {
  hashToken,
  type AuthenticatedUser,
  type GoogleIdTokenVerifier,
} from '../../src/services/auth.js';

function userBody(response: { json<T>(): T }): { user: AuthenticatedUser } {
  return response.json<{ user: AuthenticatedUser }>();
}

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

function rawSessionToken(response: {
  headers: { 'set-cookie'?: string | string[] | undefined };
}): string {
  const cookie = extractSessionCookie(response);
  const signedValue = decodeURIComponent(cookie.slice('session='.length));
  const unsigned = fastifyCookie.unsign(signedValue, process.env['COOKIE_SECRET'] as string);
  if (!unsigned.valid) {
    throw new Error('session cookie failed to unsign');
  }
  return unsigned.value;
}

const VALID_PAYLOAD = {
  sub: 'google-123',
  email: 'user@example.test',
  email_verified: true,
  name: 'Test User',
  picture: 'https://example.test/avatar.png',
};

function createGoogleClient(
  payload: Record<string, unknown> | undefined,
  shouldThrow = false,
): GoogleIdTokenVerifier {
  return {
    verifyIdToken: jest.fn(() => {
      if (shouldThrow) {
        return Promise.reject(new Error('bad token'));
      }
      return Promise.resolve({ getPayload: () => payload });
    }),
  };
}

describe('auth routes', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    await prisma.userSession.deleteMany({});
    await prisma.user.deleteMany({});
    await app.close();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /auth/google', () => {
    it('signs in a new user, sets a session cookie, and creates a hashed UserSession row', async () => {
      app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
      await app.ready();

      const response = await app.inject({
        method: 'POST',
        url: '/auth/google',
        payload: { idToken: 'raw' },
      });

      expect(response.statusCode).toBe(200);
      const body = userBody(response);
      expect(typeof body.user.id).toBe('string');
      expect(body.user).toEqual({
        id: body.user.id,
        email: 'user@example.test',
        name: 'Test User',
        avatarUrl: 'https://example.test/avatar.png',
      });

      const setCookieHeader = response.headers['set-cookie'];
      expect(setCookieHeader).toBeDefined();
      expect(String(setCookieHeader)).toMatch(/HttpOnly/);

      const sessions = await prisma.userSession.findMany();
      expect(sessions).toHaveLength(1);
      const rawToken = rawSessionToken(response);
      expect(sessions[0]?.sessionToken).toBe(hashToken(rawToken));
      expect(sessions[0]?.sessionToken).not.toBe(rawToken);
    });

    it('creates a second UserSession (not a second User) when the same Google identity signs in twice', async () => {
      app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
      await app.ready();

      await app.inject({ method: 'POST', url: '/auth/google', payload: { idToken: 'raw' } });
      await app.inject({ method: 'POST', url: '/auth/google', payload: { idToken: 'raw' } });

      expect(await prisma.user.count()).toBe(1);
      expect(await prisma.userSession.count()).toBe(2);
    });

    it('returns 400 when idToken is missing', async () => {
      app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
      await app.ready();

      const response = await app.inject({ method: 'POST', url: '/auth/google', payload: {} });

      expect(response.statusCode).toBe(400);
    });

    it('returns 401 when Google verification fails', async () => {
      app = buildApp({ googleClient: createGoogleClient(undefined, true) });
      await app.ready();

      const response = await app.inject({
        method: 'POST',
        url: '/auth/google',
        payload: { idToken: 'bad' },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({ error: 'invalid_google_token' });
    });

    it('returns 401 when the Google email is unverified', async () => {
      app = buildApp({
        googleClient: createGoogleClient({ ...VALID_PAYLOAD, email_verified: false }),
      });
      await app.ready();

      const response = await app.inject({
        method: 'POST',
        url: '/auth/google',
        payload: { idToken: 'raw' },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /auth/me', () => {
    it('returns the current user for a valid session cookie', async () => {
      app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
      await app.ready();
      const signInResponse = await app.inject({
        method: 'POST',
        url: '/auth/google',
        payload: { idToken: 'raw' },
      });
      const cookie = extractSessionCookie(signInResponse);

      const response = await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie } });

      expect(response.statusCode).toBe(200);
      const body = userBody(response);
      expect(body.user).toEqual({
        id: expect.any(String) as string,
        email: 'user@example.test',
        name: 'Test User',
        avatarUrl: expect.any(String) as string,
      });
    });

    it('returns 401 when there is no session cookie', async () => {
      app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
      await app.ready();

      const response = await app.inject({ method: 'GET', url: '/auth/me' });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({ error: 'unauthenticated' });
    });

    it('returns 401 when the session has expired', async () => {
      app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
      await app.ready();
      const signInResponse = await app.inject({
        method: 'POST',
        url: '/auth/google',
        payload: { idToken: 'raw' },
      });
      const cookie = extractSessionCookie(signInResponse);
      await prisma.userSession.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

      const response = await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie } });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('deletes the session, clears the cookie, and 401s a subsequent /auth/me', async () => {
      app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
      await app.ready();
      const signInResponse = await app.inject({
        method: 'POST',
        url: '/auth/google',
        payload: { idToken: 'raw' },
      });
      const cookie = extractSessionCookie(signInResponse);

      const logoutResponse = await app.inject({
        method: 'POST',
        url: '/auth/logout',
        headers: { cookie },
      });

      expect(logoutResponse.statusCode).toBe(204);
      expect(await prisma.userSession.count()).toBe(0);

      const meResponse = await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie } });
      expect(meResponse.statusCode).toBe(401);
    });

    it('returns 204 even when there is no session cookie', async () => {
      app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
      await app.ready();

      const response = await app.inject({ method: 'POST', url: '/auth/logout' });

      expect(response.statusCode).toBe(204);
    });
  });
});
