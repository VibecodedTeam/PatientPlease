const DEFAULT_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function resolvePort(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return value && Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function resolveGoogleClientId(value: string | undefined): string {
  if (!value) {
    throw new Error('GOOGLE_CLIENT_ID environment variable is not set');
  }
  return value;
}

export function resolveFrontendOrigin(value: string | undefined): string {
  if (!value) {
    throw new Error('FRONTEND_ORIGIN environment variable is not set');
  }
  return value.replace(/\/+$/, '');
}

const KNOWN_PLACEHOLDER_COOKIE_SECRETS = new Set([
  'dev-only-insecure-secret-change-me',
  'ci-only-insecure-secret-change-me',
]);

export function resolveCookieSecret(
  value: string | undefined,
  nodeEnv: string | undefined,
): string {
  if (!value) {
    throw new Error('COOKIE_SECRET environment variable is not set');
  }
  if (nodeEnv === 'production' && KNOWN_PLACEHOLDER_COOKIE_SECRETS.has(value)) {
    throw new Error(
      'COOKIE_SECRET is set to a known placeholder value and must not be used in production',
    );
  }
  return value;
}

export function resolveSessionTtlMs(value: string | undefined): number {
  if (!value) {
    return DEFAULT_SESSION_TTL_MS;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error('SESSION_TTL_MS environment variable must be a number');
  }
  return parsed;
}

/** Strictly gates the dev-session login bypass — only the literal string "true" enables it, so a typo'd or truthy-but-wrong value (e.g. "1", "yes") never accidentally exposes the bypass. */
export function resolveDevSessionEnabled(value: string | undefined): boolean {
  return value === 'true';
}

export function resolveDayDurationSeconds(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return value && Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function resolveRateLimitMax(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return value && Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function resolveRateLimitWindowMs(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return value && Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function resolveGeminiApiKey(value: string | undefined): string {
  if (!value) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  return value;
}

export function resolveWhisperBaseUrl(value: string | undefined): string {
  if (!value) {
    throw new Error('WHISPER_BASE_URL environment variable is not set');
  }
  return value.replace(/\/+$/, '');
}

const DEFAULT_WHISPER_MODEL = 'whisper-1';

export function resolveWhisperModel(value: string | undefined): string {
  return value ? value : DEFAULT_WHISPER_MODEL;
}

export function resolveWhisperApiKey(value: string | undefined): string | undefined {
  return value ? value : undefined;
}

const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';

export function resolveGeminiModel(value: string | undefined): string {
  return value ? value : DEFAULT_GEMINI_MODEL;
}

const DEFAULT_CHAT_AUDIO_MAX_BYTES = 10 * 1024 * 1024;

export function resolveChatAudioMaxBytes(value: string | undefined): number {
  if (!value) {
    return DEFAULT_CHAT_AUDIO_MAX_BYTES;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error('CHAT_AUDIO_MAX_BYTES environment variable must be a number');
  }
  return parsed;
}

export type ChatLlmProvider = 'gemini' | 'mock';

/**
 * Selects which client backs POST /api/v1/chat's replies. "mock" is local/dev only —
 * it skips Gemini entirely (no network call, no GEMINI_API_KEY needed) so chat can
 * still be exercised manually when the Gemini free-tier quota returns 429. Defaults
 * to "gemini" so production/default behavior is unaffected when unset.
 */
export function resolveChatLlmProvider(value: string | undefined): ChatLlmProvider {
  if (!value || value === 'gemini') {
    return 'gemini';
  }
  if (value === 'mock') {
    return 'mock';
  }
  throw new Error('CHAT_LLM_PROVIDER environment variable must be "gemini" or "mock"');
}
