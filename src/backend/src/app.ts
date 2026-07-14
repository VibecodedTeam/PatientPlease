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
  resolveRateLimitMax,
  resolveRateLimitWindowMs,
  resolveSessionTtlMs,
  resolveWhisperApiKey,
  resolveWhisperBaseUrl,
  resolveWhisperModel,
} from './config.js';
import cookiePlugin from './plugins/cookie.js';
import currentUserPlugin from './plugins/current-user.js';
import rateLimitPlugin from './plugins/rate-limit.js';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import dayRoutes from './routes/day.js';
import diagnosisRoutes from './routes/diagnoses.js';
import examinationRoutes from './routes/examinations.js';
import gameRoutes from './routes/game.js';
import healthRoutes from './routes/health.js';
import inventoryRoutes from './routes/inventory.js';
import logRoutes from './routes/logs.js';
import roundRoutes from './routes/round.js';
import shopRoutes from './routes/shop.js';
import type { GoogleIdTokenVerifier } from './services/auth.js';
import { createGeminiClient, createMockGeminiClient, type GeminiClient } from './services/llm.js';
import { createWhisperClient, type TranscriptionClient } from './services/transcription.js';

export interface BuildAppOptions {
  /** Overrides the real google-auth-library OAuth2Client — used by tests to avoid real network calls to Google. */
  googleClient?: GoogleIdTokenVerifier;
  /** Enables the POST /auth/dev-session login bypass — must never be true in production (see resolveDevSessionEnabled). */
  enableDevSession?: boolean;
  /** Overrides the resolved request cap for the rate-limit plugin — used by tests to force throttling without waiting out real time windows. */
  rateLimitMax?: number;
  /** Overrides the resolved window (ms) for the rate-limit plugin — used by tests alongside rateLimitMax. */
  rateLimitWindowMs?: number;
  /** Overrides the real Whisper transcription client — used by tests to avoid real network calls. */
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
  const rateLimitMax =
    options.rateLimitMax ?? resolveRateLimitMax(process.env['RATE_LIMIT_MAX'], 100);
  const rateLimitWindowMs =
    options.rateLimitWindowMs ??
    resolveRateLimitWindowMs(process.env['RATE_LIMIT_WINDOW_MS'], 60000);
  const chatLlmProvider = resolveChatLlmProvider(process.env['CHAT_LLM_PROVIDER']);
  const whisperBaseUrl = resolveWhisperBaseUrl(process.env['WHISPER_BASE_URL']);
  const whisperModel = resolveWhisperModel(process.env['WHISPER_MODEL']);
  const whisperApiKey = resolveWhisperApiKey(process.env['WHISPER_API_KEY']);
  const chatAudioMaxBytes = resolveChatAudioMaxBytes(process.env['CHAT_AUDIO_MAX_BYTES']);

  app.register(cors, { origin: frontendOrigin, credentials: true });
  app.register(rateLimitPlugin, { max: rateLimitMax, timeWindow: rateLimitWindowMs });
  app.register(cookiePlugin, { secret: cookieSecret });
  app.register(currentUserPlugin);
  app.register(multipart, { attachFieldsToBody: true, limits: { fileSize: chatAudioMaxBytes } });
  app.register(authRoutes, {
    googleClientId,
    sessionTtlMs,
    enableDevSession: options.enableDevSession ?? false,
    ...(options.googleClient ? { googleClient: options.googleClient } : {}),
  });
  app.register(healthRoutes);
  app.register(roundRoutes);
  app.register(gameRoutes);
  app.register(dayRoutes);
  app.register(chatRoutes, {
    transcriptionClient:
      options.transcriptionClient ??
      createWhisperClient({
        baseUrl: whisperBaseUrl,
        model: whisperModel,
        ...(whisperApiKey ? { apiKey: whisperApiKey } : {}),
      }),
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
  app.register(examinationRoutes);
  app.register(diagnosisRoutes);
  app.register(logRoutes);

  return app;
}
