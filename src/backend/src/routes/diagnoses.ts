import type { FastifyInstance } from 'fastify';
import { prisma } from '../db/prisma.js';
import { NoActiveGameError, NoOpenDayError } from '../services/game.js';
import {
  CaseAlreadyAttemptedError,
  CaseNotFoundError,
  submitDiagnosis,
} from '../services/diagnoses.js';

interface SubmitDiagnosisBody {
  caseId: string;
  selectedDiagnosisId: string;
}

export default function diagnosesRoutes(fastify: FastifyInstance): void {
  fastify.post<{ Body: SubmitDiagnosisBody }>(
    '/api/v1/diagnoses',
    {
      schema: {
        body: {
          type: 'object',
          required: ['caseId', 'selectedDiagnosisId'],
          properties: {
            caseId: { type: 'string', minLength: 1 },
            selectedDiagnosisId: { type: 'string', minLength: 1 },
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
        const result = await submitDiagnosis(prisma, user.id, request.body);
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
        if (error instanceof CaseAlreadyAttemptedError) {
          return reply.status(409).send({ error: 'case_already_attempted' });
        }
        throw error;
      }
    },
  );
}
