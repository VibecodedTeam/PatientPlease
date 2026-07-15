import { OAuth2Client } from 'google-auth-library';
import type { FastifyInstance, FastifyPluginOptions, FastifyReply } from 'fastify';
import { prisma } from '../db/prisma.js';
import { getRawSessionToken, SESSION_COOKIE_NAME } from '../plugins/current-user.js';
import {
  InvalidGoogleTokenError,
  createSession,
  deleteSession,
  signInWithGoogle,
  upsertGoogleUser,
  type GoogleIdTokenVerifier,
} from '../services/auth.js';

export interface AuthRoutesOptions extends FastifyPluginOptions {
  googleClientId: string;
  sessionTtlMs: number;
  googleClient?: GoogleIdTokenVerifier;
  /** Enables POST /auth/dev-session — see resolveDevSessionEnabled in config.ts. */
  enableDevSession?: boolean;
}

interface GoogleSignInBody {
  idToken: string;
}

/** The fixture user's stable Google-shaped identity so repeated dev-session calls upsert the same User row instead of creating duplicates. */
const DEV_SESSION_GOOGLE_ID = 'dev-session-fixture-google-id';
const DEV_SESSION_EMAIL = 'e2e-dev-session@example.test';
const DEV_SESSION_NAME = 'Dev Session User';

/** Sets the signed session cookie exactly the way every session-minting route (Google sign-in, dev-session bypass) needs — the single implementation of "what counts as a session cookie" on the response side, mirroring getRawSessionToken on the read side. */
function setSessionCookie(reply: FastifyReply, rawToken: string, sessionTtlMs: number): void {
  reply.setCookie(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(sessionTtlMs / 1000),
    signed: true,
  });
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

        setSessionCookie(reply, result.rawToken, opts.sessionTtlMs);

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

  fastify.post('/auth/dev-session', async (request, reply) => {
    if (!opts.enableDevSession) {
      return reply.status(404).send();
    }

    const user = await upsertGoogleUser(prisma, {
      googleId: DEV_SESSION_GOOGLE_ID,
      email: DEV_SESSION_EMAIL,
      name: DEV_SESSION_NAME,
      avatarUrl: null,
    });
    const session = await createSession(prisma, user.id, opts.sessionTtlMs);

    setSessionCookie(reply, session.rawToken, opts.sessionTtlMs);

    return reply.status(200).send({ user });
  });

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
