import type { FastifyInstance } from 'fastify';
import { prisma } from '../db/prisma';

export default async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/health', async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return reply.status(200).send({ status: 'ok' });
    } catch (error) {
      fastify.log.error(error, 'health check failed: database unreachable');
      return reply.status(503).send({ status: 'error' });
    }
  });
}
