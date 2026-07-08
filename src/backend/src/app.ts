import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import {
  resolveCookieSecret,
  resolveFrontendOrigin,
  resolveGoogleClientId,
  resolveSessionTtlMs,
} from './config.js';
import cookiePlugin from './plugins/cookie.js';
import currentUserPlugin from './plugins/current-user.js';
import authRoutes from './routes/auth.js';
import dayRoutes from './routes/day.js';
import gameRoutes from './routes/game.js';
import healthRoutes from './routes/health.js';
import roundRoutes from './routes/round.js';
import type { GoogleIdTokenVerifier } from './services/auth.js';

export interface BuildAppOptions {
  /** Overrides the real google-auth-library OAuth2Client — used by tests to avoid real network calls to Google. */
  googleClient?: GoogleIdTokenVerifier;
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({ logger: true });

  const cookieSecret = resolveCookieSecret(process.env['COOKIE_SECRET'], process.env['NODE_ENV']);
  const googleClientId = resolveGoogleClientId(process.env['GOOGLE_CLIENT_ID']);
  const sessionTtlMs = resolveSessionTtlMs(process.env['SESSION_TTL_MS']);
  const frontendOrigin = resolveFrontendOrigin(process.env['FRONTEND_ORIGIN']);

  app.register(cors, { origin: frontendOrigin, credentials: true });
  app.register(cookiePlugin, { secret: cookieSecret });
  app.register(currentUserPlugin);
  app.register(authRoutes, {
    googleClientId,
    sessionTtlMs,
    ...(options.googleClient ? { googleClient: options.googleClient } : {}),
  });
  app.register(healthRoutes);
  app.register(roundRoutes);
  app.register(gameRoutes);
  app.register(dayRoutes);

  return app;
}
