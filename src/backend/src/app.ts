import Fastify, { FastifyInstance } from 'fastify';
import healthRoutes from './routes/health';
import gameRoutes from './routes/game';

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: true });
  app.register(healthRoutes);
  app.register(gameRoutes, { prefix: '/api/v1' });
  return app;
}
