import type { FastifyInstance } from 'fastify';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import {
  GAMEPLAY_EVENT_TYPES,
  LogCaseNotFoundError,
  LogGameSessionNotFoundError,
  createGameplayLog,
  type GameplayEventType,
} from '../services/logs.js';

interface CreateLogBody {
  gameSessionId: string;
  caseId?: string;
  eventType: string;
  payload?: Prisma.InputJsonValue;
}

export default function logRoutes(fastify: FastifyInstance): void {
  fastify.post<{ Body: CreateLogBody }>(
    '/api/v1/logs',
    {
      schema: {
        body: {
          type: 'object',
          required: ['gameSessionId', 'eventType'],
          properties: {
            gameSessionId: { type: 'string', minLength: 1 },
            caseId: { type: 'string', minLength: 1 },
            eventType: { type: 'string', enum: [...GAMEPLAY_EVENT_TYPES] },
            payload: {},
          },
        },
      },
    },
    async (request, reply) => {
      const user = await request.getCurrentUser();
      if (!user) {
        return reply.status(401).send({ error: 'unauthenticated' });
      }

      try {
        const log = await createGameplayLog(prisma, {
          userId: user.id,
          gameSessionId: request.body.gameSessionId,
          caseId: request.body.caseId ?? null,
          eventType: request.body.eventType as GameplayEventType,
          payload: request.body.payload ?? {},
        });
        return await reply.status(200).send({ log });
      } catch (error) {
        if (error instanceof LogGameSessionNotFoundError) {
          return reply.status(404).send({ error: 'game_session_not_found' });
        }
        if (error instanceof LogCaseNotFoundError) {
          return reply.status(404).send({ error: 'case_not_found' });
        }
        throw error;
      }
    },
  );
}
