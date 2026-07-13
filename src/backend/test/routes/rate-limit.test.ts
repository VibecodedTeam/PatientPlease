import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/db/prisma.js';

describe('global rate limiting', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp({ rateLimitMax: 2, rateLimitWindowMs: 60000 });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('allows requests up to the configured limit', async () => {
    const first = await app.inject({ method: 'GET', url: '/health' });
    const second = await app.inject({ method: 'GET', url: '/health' });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
  });

  it('returns 429 once the per-IP limit is exceeded', async () => {
    const third = await app.inject({ method: 'GET', url: '/health' });

    expect(third.statusCode).toBe(429);
    expect(third.json()).toMatchObject({ statusCode: 429, error: 'Too Many Requests' });
  });
});
