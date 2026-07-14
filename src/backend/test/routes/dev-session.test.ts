import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/db/prisma.js';

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

describe('POST /auth/dev-session', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    await prisma.userSession.deleteMany({});
    await prisma.user.deleteMany({});
    await app.close();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('returns 404 when dev sessions are not enabled', async () => {
    app = buildApp({ enableDevSession: false });
    await app.ready();

    const response = await app.inject({ method: 'POST', url: '/auth/dev-session' });

    expect(response.statusCode).toBe(404);
  });

  it('mints a working session for a fixture user when enabled', async () => {
    app = buildApp({ enableDevSession: true });
    await app.ready();

    const response = await app.inject({ method: 'POST', url: '/auth/dev-session' });

    expect(response.statusCode).toBe(200);
    const body = response.json<{ user: { id: string; email: string } }>();
    expect(body.user.email).toBe('e2e-dev-session@example.test');

    const cookie = extractSessionCookie(response);
    const meResponse = await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie } });

    expect(meResponse.statusCode).toBe(200);
    expect(meResponse.json<{ user: { id: string } }>().user.id).toBe(body.user.id);
  });

  it('reuses the same fixture user across repeated calls instead of creating duplicates', async () => {
    app = buildApp({ enableDevSession: true });
    await app.ready();

    await app.inject({ method: 'POST', url: '/auth/dev-session' });
    await app.inject({ method: 'POST', url: '/auth/dev-session' });

    expect(await prisma.user.count()).toBe(1);
    expect(await prisma.userSession.count()).toBe(2);
  });
});
