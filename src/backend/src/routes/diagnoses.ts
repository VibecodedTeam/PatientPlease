import type { FastifyInstance } from 'fastify';
import { prisma } from '../db/prisma.js';
import { NoActiveGameError, NoOpenDayError } from '../services/game.js';
import {
  CaseNotFoundError,
  DiagnosisAlreadyAttemptedError,
  DiagnosisNotFoundError,
  TreatmentNotFoundError,
  submitDiagnosis,
} from '../services/diagnosis.js';

interface SubmitDiagnosisBody {
  caseId: string;
  selectedDiagnosisId: string;
  selectedTreatmentId?: string;
}

export default function diagnosisRoutes(fastify: FastifyInstance): void {
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
            selectedTreatmentId: { type: 'string', minLength: 1 },
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
        const result = await submitDiagnosis(
          prisma,
          user.id,
          request.body.caseId,
          request.body.selectedDiagnosisId,
          request.body.selectedTreatmentId ?? null,
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
        if (error instanceof DiagnosisNotFoundError) {
          return reply.status(404).send({ error: 'diagnosis_not_found' });
        }
        if (error instanceof TreatmentNotFoundError) {
          return reply.status(404).send({ error: 'treatment_not_found' });
        }
        if (error instanceof DiagnosisAlreadyAttemptedError) {
          return reply.status(409).send({ error: 'diagnosis_already_attempted' });
        }
        throw error;
      }
    },
  );
}
