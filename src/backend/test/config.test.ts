import {
  resolveChatAudioMaxBytes,
  resolveChatLlmProvider,
  resolveCookieSecret,
  resolveFrontendOrigin,
  resolveGeminiApiKey,
  resolveGeminiModel,
  resolveGoogleClientId,
  resolvePort,
  resolveRateLimitMax,
  resolveRateLimitWindowMs,
  resolveSessionTtlMs,
  resolveWhisperApiKey,
  resolveWhisperBaseUrl,
  resolveWhisperModel,
} from '../src/config.js';

describe('resolvePort', () => {
  it('returns the parsed value when PORT is set', () => {
    expect(resolvePort('5000', 4000)).toBe(5000);
  });

  it('falls back to the default when PORT is unset', () => {
    expect(resolvePort(undefined, 4000)).toBe(4000);
  });

  it('falls back to the default when PORT is an empty string', () => {
    expect(resolvePort('', 4000)).toBe(4000);
  });

  it('falls back to the default when PORT is non-numeric', () => {
    expect(resolvePort('abc', 4000)).toBe(4000);
  });

  it('falls back to the default when PORT is "0"', () => {
    expect(resolvePort('0', 4000)).toBe(4000);
  });

  it('falls back to the default when PORT is negative', () => {
    expect(resolvePort('-1', 4000)).toBe(4000);
  });
});

describe('resolveGoogleClientId', () => {
  it('returns the value when GOOGLE_CLIENT_ID is set', () => {
    expect(resolveGoogleClientId('client-id.apps.googleusercontent.com')).toBe(
      'client-id.apps.googleusercontent.com',
    );
  });

  it('throws when GOOGLE_CLIENT_ID is unset', () => {
    expect(() => resolveGoogleClientId(undefined)).toThrow(
      'GOOGLE_CLIENT_ID environment variable is not set',
    );
  });

  it('throws when GOOGLE_CLIENT_ID is an empty string', () => {
    expect(() => resolveGoogleClientId('')).toThrow(
      'GOOGLE_CLIENT_ID environment variable is not set',
    );
  });
});

describe('resolveCookieSecret', () => {
  it('returns the value when COOKIE_SECRET is set', () => {
    expect(resolveCookieSecret('a-long-random-secret', 'development')).toBe('a-long-random-secret');
  });

  it('throws when COOKIE_SECRET is unset', () => {
    expect(() => resolveCookieSecret(undefined, 'development')).toThrow(
      'COOKIE_SECRET environment variable is not set',
    );
  });

  it('throws when COOKIE_SECRET is an empty string', () => {
    expect(() => resolveCookieSecret('', 'development')).toThrow(
      'COOKIE_SECRET environment variable is not set',
    );
  });

  it('allows the known dev/CI placeholder secret outside production', () => {
    expect(resolveCookieSecret('dev-only-insecure-secret-change-me', 'development')).toBe(
      'dev-only-insecure-secret-change-me',
    );
  });

  it('throws when NODE_ENV is production and COOKIE_SECRET is a known placeholder', () => {
    expect(() => resolveCookieSecret('dev-only-insecure-secret-change-me', 'production')).toThrow(
      'COOKIE_SECRET is set to a known placeholder value and must not be used in production',
    );
  });
});

describe('resolveFrontendOrigin', () => {
  it('returns the value when FRONTEND_ORIGIN is set', () => {
    expect(resolveFrontendOrigin('http://localhost:4173')).toBe('http://localhost:4173');
  });

  it('throws when FRONTEND_ORIGIN is unset', () => {
    expect(() => resolveFrontendOrigin(undefined)).toThrow(
      'FRONTEND_ORIGIN environment variable is not set',
    );
  });

  it('throws when FRONTEND_ORIGIN is an empty string', () => {
    expect(() => resolveFrontendOrigin('')).toThrow(
      'FRONTEND_ORIGIN environment variable is not set',
    );
  });
});

describe('resolveSessionTtlMs', () => {
  it('returns the parsed value when SESSION_TTL_MS is set', () => {
    expect(resolveSessionTtlMs('60000')).toBe(60000);
  });

  it('falls back to 30 days when SESSION_TTL_MS is unset', () => {
    expect(resolveSessionTtlMs(undefined)).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it('falls back to 30 days when SESSION_TTL_MS is an empty string', () => {
    expect(resolveSessionTtlMs('')).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it('throws when SESSION_TTL_MS is not a number', () => {
    expect(() => resolveSessionTtlMs('thirty-days')).toThrow(
      'SESSION_TTL_MS environment variable must be a number',
    );
  });
});

describe('resolveRateLimitMax', () => {
  it('returns the parsed value when RATE_LIMIT_MAX is set', () => {
    expect(resolveRateLimitMax('50', 100)).toBe(50);
  });

  it('falls back to the default when RATE_LIMIT_MAX is unset', () => {
    expect(resolveRateLimitMax(undefined, 100)).toBe(100);
  });

  it('falls back to the default when RATE_LIMIT_MAX is an empty string', () => {
    expect(resolveRateLimitMax('', 100)).toBe(100);
  });

  it('falls back to the default when RATE_LIMIT_MAX is non-numeric', () => {
    expect(resolveRateLimitMax('abc', 100)).toBe(100);
  });

  it('falls back to the default when RATE_LIMIT_MAX is "0"', () => {
    expect(resolveRateLimitMax('0', 100)).toBe(100);
  });

  it('falls back to the default when RATE_LIMIT_MAX is negative', () => {
    expect(resolveRateLimitMax('-1', 100)).toBe(100);
  });
});

describe('resolveRateLimitWindowMs', () => {
  it('returns the parsed value when RATE_LIMIT_WINDOW_MS is set', () => {
    expect(resolveRateLimitWindowMs('30000', 60000)).toBe(30000);
  });

  it('falls back to the default when RATE_LIMIT_WINDOW_MS is unset', () => {
    expect(resolveRateLimitWindowMs(undefined, 60000)).toBe(60000);
  });

  it('falls back to the default when RATE_LIMIT_WINDOW_MS is an empty string', () => {
    expect(resolveRateLimitWindowMs('', 60000)).toBe(60000);
  });

  it('falls back to the default when RATE_LIMIT_WINDOW_MS is non-numeric', () => {
    expect(resolveRateLimitWindowMs('abc', 60000)).toBe(60000);
  });
});

describe('resolveGeminiApiKey', () => {
  it('returns the value when GEMINI_API_KEY is set', () => {
    expect(resolveGeminiApiKey('test-key')).toBe('test-key');
  });

  it('throws when GEMINI_API_KEY is unset', () => {
    expect(() => resolveGeminiApiKey(undefined)).toThrow(
      'GEMINI_API_KEY environment variable is not set',
    );
  });

  it('throws when GEMINI_API_KEY is an empty string', () => {
    expect(() => resolveGeminiApiKey('')).toThrow('GEMINI_API_KEY environment variable is not set');
  });
});

describe('resolveWhisperBaseUrl', () => {
  it('returns the value when set', () => {
    expect(resolveWhisperBaseUrl('http://localhost:8000/v1')).toBe('http://localhost:8000/v1');
  });
  it('throws when unset', () => {
    expect(() => resolveWhisperBaseUrl(undefined)).toThrow(/WHISPER_BASE_URL/);
  });
});

describe('resolveWhisperModel', () => {
  it('defaults to whisper-1 when unset', () => {
    expect(resolveWhisperModel(undefined)).toBe('whisper-1');
  });
  it('returns the value when set', () => {
    expect(resolveWhisperModel('Systran/faster-whisper-base')).toBe('Systran/faster-whisper-base');
  });
});

describe('resolveWhisperApiKey', () => {
  it('returns undefined when unset (local servers need no key)', () => {
    expect(resolveWhisperApiKey(undefined)).toBeUndefined();
  });
  it('returns the value when set', () => {
    expect(resolveWhisperApiKey('sk-test')).toBe('sk-test');
  });
});

describe('resolveGeminiModel', () => {
  it('returns the value when GEMINI_MODEL is set', () => {
    expect(resolveGeminiModel('gemini-1.5-pro')).toBe('gemini-1.5-pro');
  });

  it('falls back to the default when GEMINI_MODEL is unset', () => {
    expect(resolveGeminiModel(undefined)).toBe('gemini-2.0-flash');
  });

  it('falls back to the default when GEMINI_MODEL is an empty string', () => {
    expect(resolveGeminiModel('')).toBe('gemini-2.0-flash');
  });
});

describe('resolveChatAudioMaxBytes', () => {
  it('returns the parsed value when CHAT_AUDIO_MAX_BYTES is set', () => {
    expect(resolveChatAudioMaxBytes('1000')).toBe(1000);
  });

  it('falls back to 10MB when CHAT_AUDIO_MAX_BYTES is unset', () => {
    expect(resolveChatAudioMaxBytes(undefined)).toBe(10 * 1024 * 1024);
  });

  it('falls back to 10MB when CHAT_AUDIO_MAX_BYTES is an empty string', () => {
    expect(resolveChatAudioMaxBytes('')).toBe(10 * 1024 * 1024);
  });

  it('throws when CHAT_AUDIO_MAX_BYTES is not a number', () => {
    expect(() => resolveChatAudioMaxBytes('lots')).toThrow(
      'CHAT_AUDIO_MAX_BYTES environment variable must be a number',
    );
  });
});

describe('resolveChatLlmProvider', () => {
  it('defaults to "gemini" when CHAT_LLM_PROVIDER is unset', () => {
    expect(resolveChatLlmProvider(undefined)).toBe('gemini');
  });

  it('defaults to "gemini" when CHAT_LLM_PROVIDER is an empty string', () => {
    expect(resolveChatLlmProvider('')).toBe('gemini');
  });

  it('returns "gemini" when CHAT_LLM_PROVIDER is explicitly set to "gemini"', () => {
    expect(resolveChatLlmProvider('gemini')).toBe('gemini');
  });

  it('returns "mock" when CHAT_LLM_PROVIDER is set to "mock"', () => {
    expect(resolveChatLlmProvider('mock')).toBe('mock');
  });

  it('throws when CHAT_LLM_PROVIDER is set to an unrecognized value', () => {
    expect(() => resolveChatLlmProvider('chatgpt')).toThrow(
      'CHAT_LLM_PROVIDER environment variable must be "gemini" or "mock"',
    );
  });
});
