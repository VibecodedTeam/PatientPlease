import type { Prisma } from '@prisma/client';

/** The known gameplay/analytics event vocabulary (see prisma/schema/logging.prisma's
 * GameplayLog doc-comment: eventType is a plain String validated here, not a DB enum,
 * since this vocabulary is expected to grow ad hoc as new events are logged). */
export const GAMEPLAY_EVENT_TYPES = ['BOOK_DOCUMENT_OPENED'] as const;
export type GameplayEventType = (typeof GAMEPLAY_EVENT_TYPES)[number];

export interface GameplayLogGameSessionRecord {
  id: string;
  userId: string;
}

export interface GameplayLogRecord {
  id: string;
  gameSessionId: string | null;
  caseId: string | null;
  eventType: string;
  payload: Prisma.JsonValue;
  occurredAt: Date;
}

/** Narrow, structurally-compatible subset of PrismaClient this service depends on — mirrors ChatPrismaClient in services/chat.ts. */
export interface LogsPrismaClient {
  gameSession: {
    findUnique(args: { where: { id: string } }): Promise<GameplayLogGameSessionRecord | null>;
  };
  case: {
    findUnique(args: { where: { id: string } }): Promise<{ id: string } | null>;
  };
  gameplayLog: {
    create(args: {
      data: {
        gameSessionId: string;
        caseId: string | null;
        eventType: string;
        payload: Prisma.InputJsonValue;
      };
    }): Promise<GameplayLogRecord>;
  };
}

export class LogGameSessionNotFoundError extends Error {
  constructor(message = 'GameSession not found or not owned by this user') {
    super(message);
    this.name = 'LogGameSessionNotFoundError';
  }
}

export class LogCaseNotFoundError extends Error {
  constructor(message = 'Case not found') {
    super(message);
    this.name = 'LogCaseNotFoundError';
  }
}

export interface CreateGameplayLogInput {
  userId: string;
  gameSessionId: string;
  caseId: string | null;
  eventType: GameplayEventType;
  payload: Prisma.InputJsonValue;
}

export async function createGameplayLog(
  prisma: LogsPrismaClient,
  input: CreateGameplayLogInput,
): Promise<GameplayLogRecord> {
  const gameSession = await prisma.gameSession.findUnique({ where: { id: input.gameSessionId } });
  if (!gameSession || gameSession.userId !== input.userId) {
    throw new LogGameSessionNotFoundError();
  }

  if (input.caseId !== null) {
    const gameCase = await prisma.case.findUnique({ where: { id: input.caseId } });
    if (!gameCase) {
      throw new LogCaseNotFoundError();
    }
  }

  return prisma.gameplayLog.create({
    data: {
      gameSessionId: input.gameSessionId,
      caseId: input.caseId,
      eventType: input.eventType,
      payload: input.payload ?? {},
    },
  });
}
