# 0002: CI pipeline runs tests and a Docker Compose alive-check on every PR to main/dev

## Status
Accepted

## Context
CLAUDE.md Section 9 specifies a `ci.yml` (lint/test/build, on every PR) and a separate `deploy.yml` (build+push+deploy+alive-check against the real deployed environment, on merge to `main`). This ADR covers the `ci.yml` half only — `deploy.yml` and an actual deploy target are explicitly out of scope for this change and remain future work.

The team wants PR-time confidence not just that unit/integration tests pass, but that the three-container stack (`postgres`, `backend`, `frontend`) defined in `docker/docker-compose.yml` actually boots and serves traffic — the backend previously had no implemented server at all (`src/backend/src/app.ts`/`server.ts` were empty stubs), so a passing test suite alone wouldn't have caught "the container exits immediately on start."

## Decision
`.github/workflows/ci.yml` triggers on `pull_request` targeting `main` or `dev`, with two jobs:

1. **`test`** — installs deps, lints, generates the Prisma client, runs `pnpm test` (frontend Jest+RTL, backend Jest+ts-jest+supertest against a `postgres:16-alpine` GitHub Actions service container), then `pnpm build`.
2. **`docker-smoke`** (needs `test`) — runs `docker compose -f docker/docker-compose.yml up --build -d --wait`, relying on Docker healthchecks on all three services (`pg_isready` for postgres, a Node `fetch` against `/health` for backend, the same against `/` for frontend) to fail fast if any container doesn't come up healthy. It then independently re-verifies each service (`pg_isready` via `docker compose exec`, `curl` for backend/frontend) for clearer per-service failure attribution in the Actions log, and always tears the stack down afterward.

The backend's `/health` route does a real `SELECT 1` through Prisma rather than a static 200, so the backend and DB alive-checks aren't fully independent — a broken `DATABASE_URL` fails backend's own healthcheck too, and the separate `pg_isready` check pinpoints whether Postgres itself is the problem.

## What actually implementing this surfaced

Adding the first real backend healthcheck and standing the stack up end-to-end (rather than just building images) uncovered three pre-existing/latent bugs that a build-only pipeline would never have caught:

- **Prisma's musl query engine vs. Alpine's OpenSSL.** `node:20-alpine` ships OpenSSL 3.x, but a default `prisma generate` bundles an engine built against OpenSSL 1.1 — the backend container crash-looped. Fixed by pinning `binaryTargets = ["native", "linux-musl-openssl-3.0.x"]` in `prisma/schema.prisma` and installing `openssl` in the backend's runtime image stage.
- **The frontend container was silently unreachable via its published port, on every prior commit.** The Dockerfile's `CMD` had a redundant `--` (`pnpm start -- --host 0.0.0.0 ...`) that pnpm forwarded literally into Vite's argv; Vite never parsed `--host` and bound to loopback only. The container's own healthcheck (run inside the container, against `localhost`) would have passed regardless, which is exactly why the *host-facing* `curl` re-check in `docker-smoke` exists as a second, independent verification layer, not just a formality.
- **Corepack's lazy pnpm download at container startup is a network-timing-dependent flake.** Observed failing once, succeeding on retry. Fixed by baking the pinned pnpm version into the frontend image at build time (`corepack prepare pnpm@9.15.9 --activate`) instead of relying on first-run download.

None of these were prompted by a spec requirement — they were found by actually running `docker compose up --wait` against the real healthchecks and reading container logs when something didn't come up clean. This is the practical argument for why `docker-smoke` belongs in the PR gate rather than only in a post-deploy check: it caught defects a passing test suite and a successful `docker build` both missed.

## Consequences
- PRs against `main`/`dev` now require a real, running full-stack boot to pass — the first time the backend (and, it turned out, the frontend) has needed to actually be reachable in CI.
- `docker-smoke` adds a few minutes to CI (image builds); acceptable given the payoff of catching container-level breakage before merge.
- `deploy.yml` (build/push images, deploy, alive-check against a real deployed environment) and GitHub branch-protection rules requiring these checks are not part of this change and should be a follow-up once a deploy target is chosen.
