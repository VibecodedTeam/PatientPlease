import {
  resolveCookieSecret,
  resolveFrontendOrigin,
  resolveGoogleClientId,
  resolvePort,
  resolveSessionTtlMs,
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
