import type { FastifyInstance } from 'fastify';
import { prisma } from '../db/prisma.js';
import { NoActiveGameError, NoOpenDayError, pauseGame, resetGame } from '../services/game.js';

export default function gameRoutes(fastify: FastifyInstance): void {
  fastify.post('/api/v1/game/pause', async (request, reply) => {
    const user = await request.getCurrentUser();
    if (!user) {
      return reply.status(401).send({ error: 'unauthenticated' });
    }

    try {
      const gameSession = await pauseGame(prisma, user.id);
      return await reply.status(200).send({ gameSession });
    } catch (error) {
      if (error instanceof NoActiveGameError) {
        return reply.status(409).send({ error: 'no_active_game' });
      }
      if (error instanceof NoOpenDayError) {
        return reply.status(409).send({ error: 'no_open_day' });
      }
      throw error;
    }
  });

  fastify.post('/api/v1/game/reset', async (request, reply) => {
    const user = await request.getCurrentUser();
    if (!user) {
      return reply.status(401).send({ error: 'unauthenticated' });
    }

    const gameSession = await resetGame(prisma, user.id);
    return reply.status(200).send({ gameSession });
  });
}
