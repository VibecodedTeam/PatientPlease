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
  return value;
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
