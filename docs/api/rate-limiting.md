# Global Rate Limiting

Every backend route is subject to a global, per-client-IP rate limit, enforced by
`@fastify/rate-limit` before any other plugin (cookies, auth, routes) runs.

## Behavior

- Default: 100 requests per 60000ms (1 minute) window, per IP.
- Configurable via `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS` env vars (see
  `src/backend/.env.example` and `docker/docker-compose.yml`).
- No per-route overrides — the limit applies uniformly, including `/health`.

## Response when the limit is exceeded

    HTTP/1.1 429 Too Many Requests
    RateLimit-Limit: 100
    RateLimit-Remaining: 0
    RateLimit-Reset: <seconds-until-reset>

    { "statusCode": 429, "error": "Too Many Requests", "message": "Rate limit exceeded, retry in <n>" }

## Related

- Plugin: `src/backend/src/plugins/rate-limit.ts`
- App wiring: `src/backend/src/app.ts`
- Config resolvers: `src/backend/src/config.ts` (`resolveRateLimitMax`, `resolveRateLimitWindowMs`)
- Test: `src/backend/test/routes/rate-limit.test.ts`
