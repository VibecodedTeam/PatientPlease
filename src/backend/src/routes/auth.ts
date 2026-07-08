import { OAuth2Client } from 'google-auth-library';
import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '../db/prisma.js';
import { getRawSessionToken, SESSION_COOKIE_NAME } from '../plugins/current-user.js';
import {
  InvalidGoogleTokenError,
  deleteSession,
  signInWithGoogle,
  type GoogleIdTokenVerifier,
} from '../services/auth.js';

export interface AuthRoutesOptions extends FastifyPluginOptions {
  googleClientId: string;
  sessionTtlMs: number;
  googleClient?: GoogleIdTokenVerifier;
}

interface GoogleSignInBody {
  idToken: string;
}

export default function authRoutes(fastify: FastifyInstance, opts: AuthRoutesOptions): void {
  const googleClient: GoogleIdTokenVerifier =
    opts.googleClient ?? new OAuth2Client(opts.googleClientId);

  fastify.post<{ Body: GoogleSignInBody }>(
    '/auth/google',
    {
      schema: {
        body: {
          type: 'object',
          required: ['idToken'],
          properties: { idToken: { type: 'string', minLength: 1 } },
        },
      },
    },
    async (request, reply) => {
      try {
        const result = await signInWithGoogle(
          prisma,
          googleClient,
          opts.googleClientId,
          request.body.idToken,
          opts.sessionTtlMs,
        );

        reply.setCookie(SESSION_COOKIE_NAME, result.rawToken, {
          httpOnly: true,
          secure: process.env['NODE_ENV'] === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: Math.floor(opts.sessionTtlMs / 1000),
          signed: true,
        });

        return await reply.status(200).send({ user: result.user });
      } catch (error) {
        if (error instanceof InvalidGoogleTokenError) {
          fastify.log.warn(error.cause ?? error, 'Google ID token verification failed');
          return reply.status(401).send({ error: 'invalid_google_token' });
        }
        throw error;
      }
    },
  );

  fastify.get('/auth/me', async (request, reply) => {
    const user = await request.getCurrentUser();
    if (!user) {
      return reply.status(401).send({ error: 'unauthenticated' });
    }
    return reply.status(200).send({ user });
  });

  fastify.post('/auth/logout', async (request, reply) => {
    const rawToken = getRawSessionToken(request);
    if (rawToken) {
      await deleteSession(prisma, rawToken);
    }
    reply.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    return reply.status(204).send();
  });
}
