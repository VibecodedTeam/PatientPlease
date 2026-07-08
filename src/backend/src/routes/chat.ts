import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import type { MultipartFile } from '@fastify/multipart';
import { prisma } from '../db/prisma.js';
import {
  ChatCaseNotFoundError,
  ChatGameSessionNotFoundError,
  sendChatMessage,
} from '../services/chat.js';
import {
  ALLOWED_CHAT_AUDIO_MIME_TYPES,
  TranscriptionError,
  type TranscriptionClient,
} from '../services/transcription.js';
import { GeminiError, type GeminiClient } from '../services/llm.js';

export interface ChatRoutesOptions extends FastifyPluginOptions {
  transcriptionClient: TranscriptionClient;
  geminiClient: GeminiClient;
}

interface ChatMultipartField {
  value: string;
}

interface ChatMultipartBody {
  gameSessionId?: ChatMultipartField;
  caseId?: ChatMultipartField;
  text?: ChatMultipartField;
  audio?: MultipartFile;
}

export default function chatRoutes(fastify: FastifyInstance, opts: ChatRoutesOptions): void {
  fastify.post<{ Body: ChatMultipartBody }>('/api/v1/chat', async (request, reply) => {
    const user = await request.getCurrentUser();
    if (!user) {
      return reply.status(401).send({ error: 'unauthenticated' });
    }

    const gameSessionId = request.body.gameSessionId?.value;
    const caseId = request.body.caseId?.value;
    const text = request.body.text?.value;
    const audio = request.body.audio;

    if (!gameSessionId || !caseId) {
      return reply
        .status(400)
        .send({ error: 'invalid_input', message: 'gameSessionId and caseId are required' });
    }

    const hasText = Boolean(text && text.trim().length > 0);
    const hasAudio = Boolean(audio);

    if (hasText === hasAudio) {
      return reply
        .status(400)
        .send({ error: 'invalid_input', message: 'Provide exactly one of text or audio' });
    }

    let playerText: string;

    if (audio) {
      if (!ALLOWED_CHAT_AUDIO_MIME_TYPES.has(audio.mimetype)) {
        return reply.status(400).send({
          error: 'invalid_input',
          message: `Unsupported audio mime type: ${audio.mimetype}`,
        });
      }

      let buffer: Buffer;
      try {
        buffer = await audio.toBuffer();
      } catch (error) {
        if ((error as { code?: string }).code === 'FST_REQ_FILE_TOO_LARGE') {
          return reply
            .status(400)
            .send({ error: 'invalid_input', message: 'Audio file exceeds the size limit' });
        }
        throw error;
      }

      try {
        playerText = await opts.transcriptionClient.transcribe({
          buffer,
          mimeType: audio.mimetype,
        });
      } catch (error) {
        if (error instanceof TranscriptionError) {
          fastify.log.warn(error.cause ?? error, 'Audio transcription failed');
          return reply.status(502).send({ error: 'transcription_failed' });
        }
        throw error;
      }
    } else {
      playerText = text as string;
    }

    try {
      const result = await sendChatMessage(
        prisma,
        { generateReply: (input) => opts.geminiClient.generateReply(input) },
        { userId: user.id, gameSessionId, caseId, playerText },
      );
      return await reply
        .status(200)
        .send({ chatMessages: [result.playerMessage, result.patientMessage] });
    } catch (error) {
      if (error instanceof ChatGameSessionNotFoundError) {
        return reply.status(404).send({ error: 'game_session_not_found' });
      }
      if (error instanceof ChatCaseNotFoundError) {
        return reply.status(404).send({ error: 'case_not_found' });
      }
      if (error instanceof GeminiError) {
        fastify.log.warn(error.cause ?? error, 'Gemini request failed');
        return reply.status(502).send({ error: 'llm_failed' });
      }
      throw error;
    }
  });
}
