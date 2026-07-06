# GET /health

Liveness/readiness endpoint for the backend service. Used by:
- `docker/docker-compose.yml`'s `backend` service healthcheck.
- `.github/workflows/ci.yml`'s `docker-smoke` job, which curls this endpoint after bringing up the full stack via Docker Compose.

## Request

    GET /health

No parameters, no auth.

## Response

| Condition             | Status | Body                     |
|------------------------|--------|--------------------------|
| Database reachable     | 200    | `{ "status": "ok" }`    |
| Database unreachable   | 503    | `{ "status": "error" }` |

The handler executes `SELECT 1` against Postgres via Prisma on every call — this is a genuine end-to-end check (HTTP → Fastify → Prisma → Postgres), not just "the Node process is running."

## Related

- Route: `src/backend/src/routes/health.ts`
- App wiring: `src/backend/src/app.ts`
- Test: `src/backend/test/routes/health.test.ts`
