# Backend API Throttling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a global, in-memory, per-IP rate limit to every backend route using `@fastify/rate-limit`.

**Architecture:** A new `plugins/rate-limit.ts` wraps `@fastify/rate-limit` and is registered in `app.ts` right after `cors`, before any other plugin/route, so throttled requests are rejected before cookie parsing, auth, or DB work. Limit/window are configurable via `RATE_LIMIT_MAX`/`RATE_LIMIT_WINDOW_MS` env vars (default 100 req / 60000ms), resolved in `config.ts` the same way `resolvePort` is today. `BuildAppOptions` gains `rateLimitMax`/`rateLimitWindowMs` overrides so tests can force a low limit without touching process env vars.

**Tech Stack:** Fastify 5, `@fastify/rate-limit`, `fastify-plugin`, TypeScript, Jest + `ts-jest` + `app.inject()`.

## Global Constraints

- Backend is TypeScript only, strict mode, compiled with `tsc`.
- No production logic without a failing test first (TDD red-green-refactor).
- pnpm only — install with `pnpm add`, never npm/yarn.
- Commit messages: Conventional Commits (`feat(scope): summary`), scope = the plugin/config folder name.
- No direct pushes to `main` — this work happens on the existing branch `feature/api-throttling`.

---

### Task 1: Add the `@fastify/rate-limit` dependency

**Files:**
- Modify: `src/backend/package.json`
- Modify: `pnpm-lock.yaml` (auto-updated by the install command)

- [ ] **Step 1: Install the dependency in the backend workspace**

Run: `pnpm --filter backend add @fastify/rate-limit@^11.1.0`

Expected: `src/backend/package.json`'s `dependencies` gains `"@fastify/rate-limit": "^11.1.0"`, and the root `pnpm-lock.yaml` updates. Verify with:

```bash
grep '"@fastify/rate-limit"' src/backend/package.json
```

Expected output: `"@fastify/rate-limit": "^11.1.0",`

- [ ] **Step 2: Commit**

```bash
git add src/backend/package.json pnpm-lock.yaml
git commit -m "chore(backend): add @fastify/rate-limit dependency"
```

---

### Task 2: Config resolvers for rate-limit env vars

**Files:**
- Modify: `src/backend/src/config.ts`
- Test: `src/backend/test/config.test.ts`

**Interfaces:**
- Produces: `resolveRateLimitMax(value: string | undefined, fallback: number): number` and `resolveRateLimitWindowMs(value: string | undefined, fallback: number): number`, both exported from `config.ts`. Task 3 imports both.

- [ ] **Step 1: Write the failing tests**

Add to `src/backend/test/config.test.ts` (append after the existing `resolveSessionTtlMs` describe block, alongside the existing imports — add `resolveRateLimitMax` and `resolveRateLimitWindowMs` to the import list at the top of the file):

```ts
import {
  resolveCookieSecret,
  resolveFrontendOrigin,
  resolveGoogleClientId,
  resolvePort,
  resolveRateLimitMax,
  resolveRateLimitWindowMs,
  resolveSessionTtlMs,
} from '../src/config.js';
```

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter backend exec jest test/config.test.ts -t "resolveRateLimit"`
Expected: FAIL — `resolveRateLimitMax` / `resolveRateLimitWindowMs` are not exported from `../src/config.js` (TypeScript compile error via `ts-jest`).

- [ ] **Step 3: Implement the resolvers**

Append to `src/backend/src/config.ts`:

```ts
export function resolveRateLimitMax(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return value && Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function resolveRateLimitWindowMs(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return value && Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter backend exec jest test/config.test.ts`
Expected: PASS, all tests in the file green.

- [ ] **Step 5: Commit**

```bash
git add src/backend/src/config.ts src/backend/test/config.test.ts
git commit -m "feat(config): add rate-limit env var resolvers"
```

---

### Task 3: Rate-limit plugin + app wiring, with an integration test proving 429 behavior

**Files:**
- Create: `src/backend/src/plugins/rate-limit.ts`
- Modify: `src/backend/src/app.ts`
- Test: `src/backend/test/routes/rate-limit.test.ts`

**Interfaces:**
- Consumes: `resolveRateLimitMax`, `resolveRateLimitWindowMs` from Task 2's `config.ts`.
- Produces: default export `rateLimitPlugin` from `plugins/rate-limit.ts` taking `{ max: number; timeWindow: number }`; `BuildAppOptions` (in `app.ts`) gains optional `rateLimitMax?: number` and `rateLimitWindowMs?: number`, consumed by later tasks/tests via `buildApp({ rateLimitMax, rateLimitWindowMs })`.

- [ ] **Step 1: Write the failing integration test**

Create `src/backend/test/routes/rate-limit.test.ts`:

```ts
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/db/prisma.js';

describe('global rate limiting', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp({ rateLimitMax: 2, rateLimitWindowMs: 60000 });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('allows requests up to the configured limit', async () => {
    const first = await app.inject({ method: 'GET', url: '/health' });
    const second = await app.inject({ method: 'GET', url: '/health' });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
  });

  it('returns 429 once the per-IP limit is exceeded', async () => {
    const third = await app.inject({ method: 'GET', url: '/health' });

    expect(third.statusCode).toBe(429);
    expect(third.json()).toMatchObject({ statusCode: 429, error: 'Too Many Requests' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter backend exec jest test/routes/rate-limit.test.ts`
Expected: FAIL — either a TypeScript error (`rateLimitMax` does not exist on `BuildAppOptions`) or, if you temporarily stub the options, both requests return `200` and the third also returns `200` (no throttling registered yet) so the `429` assertion fails.

- [ ] **Step 3: Create the plugin**

Create `src/backend/src/plugins/rate-limit.ts`:

```ts
import rateLimit from '@fastify/rate-limit';
import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

export interface RateLimitPluginOptions {
  max: number;
  timeWindow: number;
}

export default fp(async function rateLimitPlugin(
  fastify: FastifyInstance,
  opts: RateLimitPluginOptions,
) {
  await fastify.register(rateLimit, { max: opts.max, timeWindow: opts.timeWindow });
});
```

- [ ] **Step 4: Wire the plugin into `app.ts`**

In `src/backend/src/app.ts`, add the resolver imports (extend the existing `import { ... } from './config.js'` block):

```ts
import {
  resolveCookieSecret,
  resolveFrontendOrigin,
  resolveGoogleClientId,
  resolveRateLimitMax,
  resolveRateLimitWindowMs,
  resolveSessionTtlMs,
} from './config.js';
```

Add the plugin import next to the other plugin imports:

```ts
import rateLimitPlugin from './plugins/rate-limit.js';
```

Extend `BuildAppOptions`:

```ts
export interface BuildAppOptions {
  /** Overrides the real google-auth-library OAuth2Client — used by tests to avoid real network calls to Google. */
  googleClient?: GoogleIdTokenVerifier;
  /** Overrides the resolved request cap for the rate-limit plugin — used by tests to force throttling without waiting out real time windows. */
  rateLimitMax?: number;
  /** Overrides the resolved window (ms) for the rate-limit plugin — used by tests alongside rateLimitMax. */
  rateLimitWindowMs?: number;
}
```

In `buildApp`, after the existing `frontendOrigin` line, add:

```ts
  const rateLimitMax =
    options.rateLimitMax ?? resolveRateLimitMax(process.env['RATE_LIMIT_MAX'], 100);
  const rateLimitWindowMs =
    options.rateLimitWindowMs ?? resolveRateLimitWindowMs(process.env['RATE_LIMIT_WINDOW_MS'], 60000);
```

Register the plugin immediately after `cors`, before `cookiePlugin` (so throttled requests never reach cookie/auth/DB work):

```ts
  app.register(cors, { origin: frontendOrigin, credentials: true });
  app.register(rateLimitPlugin, { max: rateLimitMax, timeWindow: rateLimitWindowMs });
  app.register(cookiePlugin, { secret: cookieSecret });
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter backend exec jest test/routes/rate-limit.test.ts`
Expected: PASS, both tests green.

- [ ] **Step 6: Run the full backend test suite to check for regressions**

Run: `pnpm --filter backend test`
Expected: all existing suites still pass — the default 100 req/min limit is far above what any single existing test file sends to one app instance.

- [ ] **Step 7: Commit**

```bash
git add src/backend/src/plugins/rate-limit.ts src/backend/src/app.ts src/backend/test/routes/rate-limit.test.ts
git commit -m "feat(backend): add global per-IP rate limiting"
```

---

### Task 4: Config surfacing (`.env.example`, `docker-compose.yml`) and API docs

**Files:**
- Modify: `src/backend/.env.example`
- Modify: `docker/docker-compose.yml`
- Create: `docs/api/rate-limiting.md`

- [ ] **Step 1: Document the new env vars in `.env.example`**

Append to `src/backend/.env.example`:

```
# Optional. Max requests per IP per RATE_LIMIT_WINDOW_MS. Defaults to 100 if unset.
RATE_LIMIT_MAX=100
# Optional. Rate-limit window in milliseconds. Defaults to 60000 (1 minute) if unset.
RATE_LIMIT_WINDOW_MS=60000
```

- [ ] **Step 2: Surface the same vars in `docker/docker-compose.yml`**

In `docker/docker-compose.yml`, extend the `backend` service's `environment:` block (immediately after the existing `FRONTEND_ORIGIN` line) so it reads:

```yaml
      FRONTEND_ORIGIN: ${FRONTEND_ORIGIN:-http://localhost:4173}
      RATE_LIMIT_MAX: ${RATE_LIMIT_MAX:-100}
      RATE_LIMIT_WINDOW_MS: ${RATE_LIMIT_WINDOW_MS:-60000}
```

- [ ] **Step 3: Write the API doc note**

Create `docs/api/rate-limiting.md`:

```markdown
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
```

- [ ] **Step 4: Commit**

```bash
git add src/backend/.env.example docker/docker-compose.yml docs/api/rate-limiting.md
git commit -m "docs(backend): document global rate limiting"
```

---

### Task 5: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run backend lint**

Run: `pnpm --filter backend lint`
Expected: no errors.

- [ ] **Step 2: Run backend typecheck**

Run: `pnpm --filter backend typecheck`
Expected: no errors.

- [ ] **Step 3: Run the full backend test suite**

Run: `pnpm --filter backend test`
Expected: all suites pass, including the new `test/config.test.ts` and `test/routes/rate-limit.test.ts` cases.

- [ ] **Step 4: Run backend build**

Run: `pnpm --filter backend build`
Expected: `tsc` compiles cleanly to `src/backend/dist/`.

- [ ] **Step 5: Manual smoke check (optional but recommended)**

Run: `pnpm --filter backend dev` in one terminal, then from another terminal:

```bash
for i in $(seq 1 105); do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4000/health; done | sort | uniq -c
```

Expected: mostly `200`, with some `429` entries once the default 100/min limit is exceeded within the loop's runtime. Stop the dev server after checking.
