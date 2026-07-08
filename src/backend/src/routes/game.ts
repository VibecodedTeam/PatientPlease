import type { FastifyInstance } from 'fastify';

export default async function gameRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/game/pause', async (_request, reply) => {
    return reply.status(200).send({ paused: true, pausedAt: new Date().toISOString() });
  });
}
