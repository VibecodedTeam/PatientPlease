import { jest } from '@jest/globals';
import {
  InvalidGoogleTokenError,
  createSession,
  deleteSession,
  hashToken,
  resolveSession,
  signInWithGoogle,
  upsertGoogleUser,
  verifyGoogleIdToken,
  type AuthPrismaClient,
  type GoogleIdTokenVerifier,
} from '../../src/services/auth.js';

function createMockPrisma() {
  return {
    user: {
      upsert: jest.fn<AuthPrismaClient['user']['upsert']>(),
    },
    userSession: {
      create: jest.fn<AuthPrismaClient['userSession']['create']>(),
      findFirst: jest.fn<AuthPrismaClient['userSession']['findFirst']>(),
      deleteMany: jest.fn<AuthPrismaClient['userSession']['deleteMany']>(),
    },
  };
}

function createMockGoogleClient(
  payload: Record<string, unknown> | undefined,
  shouldThrow = false,
): GoogleIdTokenVerifier {
  return {
    verifyIdToken: jest.fn(() => {
      if (shouldThrow) {
        return Promise.reject(new Error('bad token'));
      }
      return Promise.resolve({ getPayload: () => payload });
    }),
  };
}

describe('verifyGoogleIdToken', () => {
  it('returns the mapped profile for a valid payload', async () => {
    const client = createMockGoogleClient({
      sub: 'google-123',
      email: 'user@example.test',
      email_verified: true,
      name: 'Test User',
      picture: 'https://example.test/avatar.png',
    });

    const profile = await verifyGoogleIdToken(client, 'raw-id-token', 'client-id');

    expect(profile).toEqual({
      googleId: 'google-123',
      email: 'user@example.test',
      name: 'Test User',
      avatarUrl: 'https://example.test/avatar.png',
    });
    expect(client.verifyIdToken).toHaveBeenCalledWith({
      idToken: 'raw-id-token',
      audience: 'client-id',
    });
  });

  it('defaults avatarUrl to null when picture is absent', async () => {
    const client = createMockGoogleClient({
      sub: 'google-123',
      email: 'user@example.test',
      email_verified: true,
      name: 'Test User',
    });

    const profile = await verifyGoogleIdToken(client, 'raw-id-token', 'client-id');

    expect(profile.avatarUrl).toBeNull();
  });

  it('throws InvalidGoogleTokenError when verification itself fails, preserving the original error as cause', async () => {
    const client = createMockGoogleClient(undefined, true);

    await expect(verifyGoogleIdToken(client, 'bad-token', 'client-id')).rejects.toThrow(
      InvalidGoogleTokenError,
    );
    try {
      await verifyGoogleIdToken(client, 'bad-token', 'client-id');
      throw new Error('expected verifyGoogleIdToken to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidGoogleTokenError);
      expect((error as InvalidGoogleTokenError).cause).toBeInstanceOf(Error);
      expect(((error as InvalidGoogleTokenError).cause as Error).message).toBe('bad token');
    }
  });

  it('throws InvalidGoogleTokenError when the payload is missing required claims', async () => {
    const client = createMockGoogleClient({ sub: 'google-123' });

    await expect(verifyGoogleIdToken(client, 'raw-id-token', 'client-id')).rejects.toThrow(
      InvalidGoogleTokenError,
    );
  });

  it('throws InvalidGoogleTokenError when email_verified is false', async () => {
    const client = createMockGoogleClient({
      sub: 'google-123',
      email: 'user@example.test',
      email_verified: false,
      name: 'Test User',
    });

    await expect(verifyGoogleIdToken(client, 'raw-id-token', 'client-id')).rejects.toThrow(
      InvalidGoogleTokenError,
    );
  });
});

describe('upsertGoogleUser', () => {
  it('upserts a user keyed on googleId and returns the mapped user', async () => {
    const prisma = createMockPrisma();
    prisma.user.upsert.mockResolvedValue({
      id: 'user-uuid',
      email: 'user@example.test',
      name: 'Test User',
      avatarUrl: null,
    });

    const result = await upsertGoogleUser(prisma, {
      googleId: 'google-123',
      email: 'user@example.test',
      name: 'Test User',
      avatarUrl: null,
    });

    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { googleId: 'google-123' },
      create: {
        googleId: 'google-123',
        email: 'user@example.test',
        name: 'Test User',
        avatarUrl: null,
      },
      update: { email: 'user@example.test', name: 'Test User', avatarUrl: null },
    });
    expect(result).toEqual({
      id: 'user-uuid',
      email: 'user@example.test',
      name: 'Test User',
      avatarUrl: null,
    });
  });
});

describe('hashToken', () => {
  it('is deterministic and never returns the raw token', () => {
    const raw = 'some-raw-token';
    const hash = hashToken(raw);

    expect(hash).toBe(hashToken(raw));
    expect(hash).not.toBe(raw);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('createSession', () => {
  it('generates a high-entropy raw token, stores its hash, and sets expiresAt from ttlMs', async () => {
    const prisma = createMockPrisma();
    prisma.userSession.create.mockResolvedValue({ id: 'session-uuid' });
    const before = Date.now();

    const { rawToken, expiresAt } = await createSession(prisma, 'user-uuid', 60_000);

    const after = Date.now();
    expect(rawToken.length).toBeGreaterThanOrEqual(40);
    expect(prisma.userSession.create).toHaveBeenCalledTimes(1);
    const createArgs = prisma.userSession.create.mock.calls[0]?.[0];
    expect(createArgs?.data.userId).toBe('user-uuid');
    expect(createArgs?.data.sessionToken).toBe(hashToken(rawToken));
    expect(createArgs?.data.sessionToken).not.toBe(rawToken);
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + 60_000);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(after + 60_000);
  });
});

describe('resolveSession', () => {
  it('returns null when no non-expired session matches', async () => {
    const prisma = createMockPrisma();
    prisma.userSession.findFirst.mockResolvedValue(null);

    const result = await resolveSession(prisma, 'raw-token');

    expect(result).toBeNull();
    const findArgs = prisma.userSession.findFirst.mock.calls[0]?.[0];
    expect(findArgs?.where.sessionToken).toBe(hashToken('raw-token'));
  });

  it('returns the mapped user when a non-expired session matches', async () => {
    const prisma = createMockPrisma();
    prisma.userSession.findFirst.mockResolvedValue({
      user: { id: 'user-uuid', email: 'user@example.test', name: 'Test User', avatarUrl: null },
    });

    const result = await resolveSession(prisma, 'raw-token');

    expect(result).toEqual({
      id: 'user-uuid',
      email: 'user@example.test',
      name: 'Test User',
      avatarUrl: null,
    });
  });
});

describe('deleteSession', () => {
  it('deletes by the hashed token via deleteMany (idempotent)', async () => {
    const prisma = createMockPrisma();
    prisma.userSession.deleteMany.mockResolvedValue({ count: 1 });

    await deleteSession(prisma, 'raw-token');

    expect(prisma.userSession.deleteMany).toHaveBeenCalledWith({
      where: { sessionToken: hashToken('raw-token') },
    });
  });
});

describe('signInWithGoogle', () => {
  it('verifies, upserts, and creates a session on success', async () => {
    const prisma = createMockPrisma();
    prisma.user.upsert.mockResolvedValue({
      id: 'user-uuid',
      email: 'user@example.test',
      name: 'Test User',
      avatarUrl: null,
    });
    prisma.userSession.create.mockResolvedValue({ id: 'session-uuid' });
    const client = createMockGoogleClient({
      sub: 'google-123',
      email: 'user@example.test',
      email_verified: true,
      name: 'Test User',
    });

    const result = await signInWithGoogle(prisma, client, 'client-id', 'raw-id-token', 60_000);

    expect(result.user).toEqual({
      id: 'user-uuid',
      email: 'user@example.test',
      name: 'Test User',
      avatarUrl: null,
    });
    expect(result.rawToken).toBeTruthy();
    expect(prisma.userSession.create).toHaveBeenCalledTimes(1);
  });

  it('propagates InvalidGoogleTokenError without touching the database', async () => {
    const prisma = createMockPrisma();
    const client = createMockGoogleClient(undefined, true);

    await expect(
      signInWithGoogle(prisma, client, 'client-id', 'bad-token', 60_000),
    ).rejects.toThrow(InvalidGoogleTokenError);
    expect(prisma.user.upsert).not.toHaveBeenCalled();
    expect(prisma.userSession.create).not.toHaveBeenCalled();
  });
});
