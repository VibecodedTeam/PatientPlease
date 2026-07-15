import type { FastifyInstance } from 'fastify';
import { prisma } from '../db/prisma.js';
import { NoActiveGameError, NoOpenDayError } from '../services/game.js';
import {
  CaseNotFoundError,
  ExaminationAlreadyOrderedError,
  ExaminationNotOwnedError,
  NotAnExaminationError,
  orderExamination,
} from '../services/examination.js';

interface OrderExaminationBody {
  caseId: string;
  shopItemId: string;
}

export default function examinationRoutes(fastify: FastifyInstance): void {
  fastify.post<{ Body: OrderExaminationBody }>(
    '/api/v1/examinations',
    {
      schema: {
        body: {
          type: 'object',
          required: ['caseId', 'shopItemId'],
          properties: {
            caseId: { type: 'string', minLength: 1 },
            shopItemId: { type: 'string', minLength: 1 },
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
        const result = await orderExamination(
          prisma,
          user.id,
          request.body.caseId,
          request.body.shopItemId,
        );
        return await reply.status(200).send(result);
      } catch (error) {
        if (error instanceof NoActiveGameError) {
          return reply.status(409).send({ error: 'no_active_game' });
        }
        if (error instanceof NoOpenDayError) {
          return reply.status(409).send({ error: 'no_open_day' });
        }
        if (error instanceof CaseNotFoundError) {
          return reply.status(404).send({ error: 'case_not_found' });
        }
        if (error instanceof NotAnExaminationError) {
          return reply.status(409).send({ error: 'not_an_examination' });
        }
        if (error instanceof ExaminationNotOwnedError) {
          return reply.status(409).send({ error: 'examination_not_owned' });
        }
        if (error instanceof ExaminationAlreadyOrderedError) {
          return reply.status(409).send({ error: 'examination_already_ordered' });
        }
        throw error;
      }
    },
  );
}
