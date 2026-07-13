import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import {
  resolveCookieSecret,
  resolveFrontendOrigin,
  resolveGoogleClientId,
  resolveRateLimitMax,
  resolveRateLimitWindowMs,
  resolveSessionTtlMs,
} from './config.js';
import cookiePlugin from './plugins/cookie.js';
import currentUserPlugin from './plugins/current-user.js';
import rateLimitPlugin from './plugins/rate-limit.js';
import authRoutes from './routes/auth.js';
import dayRoutes from './routes/day.js';
import examinationRoutes from './routes/examinations.js';
import gameRoutes from './routes/game.js';
import healthRoutes from './routes/health.js';
import inventoryRoutes from './routes/inventory.js';
import roundRoutes from './routes/round.js';
import shopRoutes from './routes/shop.js';
import type { GoogleIdTokenVerifier } from './services/auth.js';

export interface BuildAppOptions {
  /** Overrides the real google-auth-library OAuth2Client — used by tests to avoid real network calls to Google. */
  googleClient?: GoogleIdTokenVerifier;
  /** Overrides the resolved request cap for the rate-limit plugin — used by tests to force throttling without waiting out real time windows. */
  rateLimitMax?: number;
  /** Overrides the resolved window (ms) for the rate-limit plugin — used by tests alongside rateLimitMax. */
  rateLimitWindowMs?: number;
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({ logger: true });

  const cookieSecret = resolveCookieSecret(process.env['COOKIE_SECRET'], process.env['NODE_ENV']);
  const googleClientId = resolveGoogleClientId(process.env['GOOGLE_CLIENT_ID']);
  const sessionTtlMs = resolveSessionTtlMs(process.env['SESSION_TTL_MS']);
  const frontendOrigin = resolveFrontendOrigin(process.env['FRONTEND_ORIGIN']);
  const rateLimitMax =
    options.rateLimitMax ?? resolveRateLimitMax(process.env['RATE_LIMIT_MAX'], 100);
  const rateLimitWindowMs =
    options.rateLimitWindowMs ?? resolveRateLimitWindowMs(process.env['RATE_LIMIT_WINDOW_MS'], 60000);

  app.register(cors, { origin: frontendOrigin, credentials: true });
  app.register(rateLimitPlugin, { max: rateLimitMax, timeWindow: rateLimitWindowMs });
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
  app.register(shopRoutes);
  app.register(inventoryRoutes);
  app.register(examinationRoutes);

  return app;
}
