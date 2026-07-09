import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import {
  resolveChatAudioMaxBytes,
  resolveChatLlmProvider,
  resolveCookieSecret,
  resolveFrontendOrigin,
  resolveGeminiApiKey,
  resolveGeminiModel,
  resolveGoogleClientId,
  resolveGoogleSpeechApiKey,
  resolveSessionTtlMs,
} from './config.js';
import cookiePlugin from './plugins/cookie.js';
import currentUserPlugin from './plugins/current-user.js';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import dayRoutes from './routes/day.js';
import gameRoutes from './routes/game.js';
import healthRoutes from './routes/health.js';
import inventoryRoutes from './routes/inventory.js';
import roundRoutes from './routes/round.js';
import shopRoutes from './routes/shop.js';
import type { GoogleIdTokenVerifier } from './services/auth.js';
import { createGeminiClient, createMockGeminiClient, type GeminiClient } from './services/llm.js';
import { createGoogleSpeechClient, type TranscriptionClient } from './services/transcription.js';

export interface BuildAppOptions {
  /** Overrides the real google-auth-library OAuth2Client — used by tests to avoid real network calls to Google. */
  googleClient?: GoogleIdTokenVerifier;
  /** Overrides the real Google Speech-to-Text client — used by tests to avoid real network calls. */
  transcriptionClient?: TranscriptionClient;
  /** Overrides the real Gemini client — used by tests to avoid real network calls. */
  geminiClient?: GeminiClient;
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({ logger: true });

  const cookieSecret = resolveCookieSecret(process.env['COOKIE_SECRET'], process.env['NODE_ENV']);
  const googleClientId = resolveGoogleClientId(process.env['GOOGLE_CLIENT_ID']);
  const sessionTtlMs = resolveSessionTtlMs(process.env['SESSION_TTL_MS']);
  const frontendOrigin = resolveFrontendOrigin(process.env['FRONTEND_ORIGIN']);
  const chatLlmProvider = resolveChatLlmProvider(process.env['CHAT_LLM_PROVIDER']);
  const googleSpeechApiKey = resolveGoogleSpeechApiKey(process.env['GOOGLE_SPEECH_API_KEY']);
  const chatAudioMaxBytes = resolveChatAudioMaxBytes(process.env['CHAT_AUDIO_MAX_BYTES']);

  app.register(cors, { origin: frontendOrigin, credentials: true });
  app.register(cookiePlugin, { secret: cookieSecret });
  app.register(currentUserPlugin);
  app.register(multipart, { attachFieldsToBody: true, limits: { fileSize: chatAudioMaxBytes } });
  app.register(authRoutes, {
    googleClientId,
    sessionTtlMs,
    ...(options.googleClient ? { googleClient: options.googleClient } : {}),
  });
  app.register(healthRoutes);
  app.register(roundRoutes);
  app.register(gameRoutes);
  app.register(dayRoutes);
  app.register(chatRoutes, {
    transcriptionClient:
      options.transcriptionClient ?? createGoogleSpeechClient({ apiKey: googleSpeechApiKey }),
    geminiClient:
      options.geminiClient ??
      (chatLlmProvider === 'mock'
        ? createMockGeminiClient()
        : createGeminiClient({
            apiKey: resolveGeminiApiKey(process.env['GEMINI_API_KEY']),
            model: resolveGeminiModel(process.env['GEMINI_MODEL']),
          })),
  });
  app.register(shopRoutes);
  app.register(inventoryRoutes);

  return app;
}
