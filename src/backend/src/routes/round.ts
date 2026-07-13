import type { FastifyInstance } from 'fastify';
import { prisma } from '../db/prisma.js';
import {
  GameCompletedError,
  GameOverError,
  NoCasesRemainingError,
  startRound,
} from '../services/round.js';

export default function roundRoutes(fastify: FastifyInstance): void {
  fastify.post('/api/v1/round', async (request, reply) => {
    const user = await request.getCurrentUser();
    if (!user) {
      return reply.status(401).send({ error: 'unauthenticated' });
    }

    try {
      const result = await startRound(prisma, user.id);
      return await reply.status(200).send(result);
    } catch (error) {
      if (error instanceof NoCasesRemainingError) {
        return reply.status(409).send({ error: 'no_cases_remaining' });
      }
      if (error instanceof GameCompletedError) {
        return reply.status(409).send({ error: 'game_completed' });
      }
      if (error instanceof GameOverError) {
        return reply.status(409).send({ error: 'game_over' });
      }
      throw error;
    }
  });
}
