# Backend API Throttling

Date: 2026-07-13
Status: Approved

## Problem

The backend has no protection against request floods or brute-force traffic — every route
(including auth) accepts unlimited requests per client. We want a global rate limit applied
uniformly across the API.

## Decision

Use the official `@fastify/rate-limit` plugin, backed by its default in-memory store (no Redis —
the app runs as a single backend instance per `docker/docker-compose.yml`, so a shared store adds
infra with no current benefit).

### Plugin

- New `src/backend/src/plugins/rate-limit.ts`, following the same shape as `plugins/cookie.ts`: a
  `fastify-plugin`-wrapped async function taking typed options (`{ max, timeWindow }`).
- Registered in `app.ts` immediately after `cors` and before `cookiePlugin`/`currentUserPlugin`/routes,
  so throttled requests are rejected before cookie parsing, auth, or DB work.
- Keying: the plugin's default `keyGenerator` (`request.ip`). No `trustProxy` config exists today,
  so this matches current behavior everywhere else in the app.
- No per-route overrides — one global limit for every route, including `/health` (the docker
  healthcheck's 5s interval is far below the default limit, so it will never trip).
- Response on limit exceeded: the plugin's default `429` with `RateLimit-*` headers and a JSON body
  `{ statusCode: 429, error: 'Too Many Requests', message: ... }`. No custom error handler needed —
  none exists today.

### Config

Two new resolvers in `config.ts`, mirroring `resolvePort`/`resolveSessionTtlMs` (parse env var,
validate, fall back to a safe default rather than throwing — unlike the required secrets, these
have sane defaults):

```ts
resolveRateLimitMax(value: string | undefined, fallback: number): number
resolveRateLimitWindowMs(value: string | undefined, fallback: number): number
```

Defaults: `RATE_LIMIT_MAX=100`, `RATE_LIMIT_WINDOW_MS=60000` (100 requests/minute). Read in
`app.ts` the same way `resolveCookieSecret`/`resolveSessionTtlMs` are today. Both env vars are
added to `docker/docker-compose.yml`'s backend `environment:` block for consistency with the
other config vars; unset falls back to the defaults.

`BuildAppOptions` (in `app.ts`) gains optional `rateLimitMax`/`rateLimitWindowMs` overrides, same
pattern as the existing `googleClient` test override, so tests can configure a very low limit
without depending on process-level env vars.

## Testing

- `test/config.test.ts`: unit tests for `resolveRateLimitMax`/`resolveRateLimitWindowMs` (valid
  value, missing → fallback, empty string, non-numeric) — same style as existing `resolvePort`
  tests.
- `test/routes/rate-limit.test.ts`: builds the app via `buildApp({ rateLimitMax: N, rateLimitWindowMs: ... })`
  with a very low max, fires N+1 requests at `/health`, and asserts the final one returns `429`.

## Docs

Add a short note to `docs/api/` describing the global rate limit and its response headers, since
it changes observable behavior for every endpoint.

## Out of scope

- Per-route or per-user/session limits.
- Redis-backed shared store (revisit if the backend ever runs as multiple instances behind a
  load balancer).
- `trustProxy` / `X-Forwarded-For` handling (revisit if a reverse proxy is added to the stack).
