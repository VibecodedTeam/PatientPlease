import type { FastifyInstance } from 'fastify';
import { prisma } from '../db/prisma.js';
import { NoActiveGameError, NoOpenDayError, endDay, resetDay } from '../services/game.js';

export default function dayRoutes(fastify: FastifyInstance): void {
  fastify.post('/api/v1/day/reset', async (request, reply) => {
    const user = await request.getCurrentUser();
    if (!user) {
      return reply.status(401).send({ error: 'unauthenticated' });
    }

    try {
      const gameSession = await resetDay(prisma, user.id);
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

  fastify.post('/api/v1/day/end', async (request, reply) => {
    const user = await request.getCurrentUser();
    if (!user) {
      return reply.status(401).send({ error: 'unauthenticated' });
    }

    try {
      const result = await endDay(prisma, user.id);
      return await reply.status(200).send(result);
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
}
