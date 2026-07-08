import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { prisma } from '../db/prisma.js';
import { resolveSession, type AuthenticatedUser } from '../services/auth.js';

export const SESSION_COOKIE_NAME = 'session';

/** Reads and unsigns the session cookie, returning the raw token or null. Shared by getCurrentUser and POST /auth/logout so there is exactly one implementation of "what counts as a session cookie". */
export function getRawSessionToken(request: FastifyRequest): string | null {
  const rawToken = request.cookies[SESSION_COOKIE_NAME];
  if (!rawToken) {
    return null;
  }

  const unsigned = request.unsignCookie(rawToken);
  return unsigned.valid ? unsigned.value : null;
}

declare module 'fastify' {
  interface FastifyRequest {
    getCurrentUser(): Promise<AuthenticatedUser | null>;
  }
}

export default fp(function currentUserPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest('getCurrentUser', async function (this: FastifyRequest) {
    const rawToken = getRawSessionToken(this);
    if (!rawToken) {
      return null;
    }

    return resolveSession(prisma, rawToken);
  });
});
