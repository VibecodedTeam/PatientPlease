import { createHash, randomBytes } from 'node:crypto';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

interface GoogleIdTokenPayload {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

/** Minimal shape this service needs from google-auth-library's OAuth2Client — decouples the service from that library's exact types and lets tests inject a plain-object fake instead of a real (privately-fielded) LoginTicket. */
export interface GoogleIdTokenVerifier {
  verifyIdToken: (options: {
    idToken: string;
    audience: string;
  }) => Promise<{ getPayload(): GoogleIdTokenPayload | undefined }>;
}

interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

/** Narrow, structurally-compatible subset of PrismaClient this service depends on — keeps unit tests free of the full generated client shape. */
export interface AuthPrismaClient {
  user: {
    upsert(args: {
      where: { googleId: string };
      create: { googleId: string; email: string; name: string; avatarUrl: string | null };
      update: { email: string; name: string; avatarUrl: string | null };
    }): Promise<{ id: string; email: string; name: string; avatarUrl: string | null }>;
  };
  userSession: {
    create(args: {
      data: { userId: string; sessionToken: string; expiresAt: Date };
    }): Promise<{ id: string }>;
    findFirst(args: {
      where: { sessionToken: string; expiresAt: { gt: Date } };
      include: { user: true };
    }): Promise<{
      user: { id: string; email: string; name: string; avatarUrl: string | null };
    } | null>;
    deleteMany(args: { where: { sessionToken: string } }): Promise<{ count: number }>;
  };
}

export class InvalidGoogleTokenError extends Error {
  constructor(message = 'Invalid Google ID token', options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'InvalidGoogleTokenError';
  }
}

export async function verifyGoogleIdToken(
  client: GoogleIdTokenVerifier,
  idToken: string,
  audience: string,
): Promise<GoogleProfile> {
  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken, audience });
    payload = ticket.getPayload();
  } catch (error) {
    throw new InvalidGoogleTokenError('Invalid Google ID token', { cause: error });
  }

  if (!payload?.sub || !payload.email || !payload.name) {
    throw new InvalidGoogleTokenError();
  }
  if (payload.email_verified === false) {
    throw new InvalidGoogleTokenError();
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name,
    avatarUrl: payload.picture ?? null,
  };
}

export async function upsertGoogleUser(
  prisma: AuthPrismaClient,
  profile: GoogleProfile,
): Promise<AuthenticatedUser> {
  const user = await prisma.user.upsert({
    where: { googleId: profile.googleId },
    create: {
      googleId: profile.googleId,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
    },
    update: {
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
    },
  });

  return toAuthenticatedUser(user);
}

export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

export async function createSession(
  prisma: AuthPrismaClient,
  userId: string,
  ttlMs: number,
): Promise<{ rawToken: string; expiresAt: Date }> {
  const rawToken = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + ttlMs);

  await prisma.userSession.create({
    data: { userId, sessionToken: hashToken(rawToken), expiresAt },
  });

  return { rawToken, expiresAt };
}

export async function resolveSession(
  prisma: AuthPrismaClient,
  rawToken: string,
): Promise<AuthenticatedUser | null> {
  const session = await prisma.userSession.findFirst({
    where: { sessionToken: hashToken(rawToken), expiresAt: { gt: new Date() } },
    include: { user: true },
  });

  return session ? toAuthenticatedUser(session.user) : null;
}

export async function deleteSession(prisma: AuthPrismaClient, rawToken: string): Promise<void> {
  await prisma.userSession.deleteMany({ where: { sessionToken: hashToken(rawToken) } });
}

export async function signInWithGoogle(
  prisma: AuthPrismaClient,
  googleClient: GoogleIdTokenVerifier,
  audience: string,
  idToken: string,
  sessionTtlMs: number,
): Promise<{ user: AuthenticatedUser; rawToken: string; expiresAt: Date }> {
  const profile = await verifyGoogleIdToken(googleClient, idToken, audience);
  const user = await upsertGoogleUser(prisma, profile);
  const session = await createSession(prisma, user.id, sessionTtlMs);

  return { user, rawToken: session.rawToken, expiresAt: session.expiresAt };
}

function toAuthenticatedUser(user: {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}): AuthenticatedUser {
  return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl };
}
