import type { FastifyInstance } from 'fastify';
import request from 'supertest';
import { buildApp } from '../../src/app';

describe('POST /api/v1/game/pause', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 with paused true and an ISO pausedAt timestamp', async () => {
    const response = await request(app.server).post('/api/v1/game/pause');

    expect(response.status).toBe(200);
    expect(response.body.paused).toBe(true);
    expect(typeof response.body.pausedAt).toBe('string');
    expect(new Date(response.body.pausedAt).toISOString()).toBe(response.body.pausedAt);
  });
});
