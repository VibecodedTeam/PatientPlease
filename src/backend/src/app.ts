import Fastify from 'fastify';

export function buildApp() {
  const app = Fastify();

  app.get('/health', () => ({ status: 'ok' }));

  return app;
}
