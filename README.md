# Skin Disease Diagnosis Game

An educational, *Papers, Please*–inspired game about skin cancer and skin disease awareness. The player works as a doctor running daily shifts: examining a 3D-rendered patient, reviewing case documents, talking to the patient, choosing a diagnosis and treatment, and spending earnings on equipment and handbooks between days.

Full architecture, rules, and conventions for this repo live in [`CLAUDE.md`](./CLAUDE.md) — this README is a practical getting-started guide; `CLAUDE.md` is the source of truth if anything here goes stale.

## Current status

This repository is an early-stage scaffold, not a running game yet:

- `src/frontend` is a working Vite + React single-page app shell (routing via `react-router-dom`), with one placeholder view (`MainView`) and empty `providers/` / `components/` folders reserved for future features.
- `src/backend` is a Fastify + Prisma project skeleton whose entry points (`src/app.js`, `src/server.js`) are **currently empty** — there is no HTTP server, no routes, and no Prisma models yet. The backend Docker image builds successfully, but its container exits immediately when started, since there's nothing to run.
- There is no CI workflow yet (`.github/workflows` doesn't exist), no ESLint config file yet (the `lint` scripts reference `eslint` but no `.eslintrc*`/flat config exists), and `docs/architecture`, `docs/game-design`, and `docs/api` don't have content yet.

**Note on tech stack vs. `CLAUDE.md`:** `CLAUDE.md` Section 3 specifies Next.js (App Router) for the frontend. The frontend actually implemented here is a plain React SPA served by Vite, with no Next.js/App Router — that is the intended stack going forward; treat the Next.js line in `CLAUDE.md` as stale until it's updated.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20 (pinned in root `package.json` `engines`)
- [pnpm](https://pnpm.io/) `9.15.9` (pinned in root `package.json` `packageManager`) — this repo uses pnpm workspaces exclusively; don't use npm or yarn
- [Docker](https://www.docker.com/) + Docker Compose v2, if you want to run the full stack in containers
- A PostgreSQL instance if you run the backend natively without Docker

## Repository layout

```
src/frontend/   React + Vite SPA (views/providers/components, CSS Modules, Jest + RTL tests)
src/backend/    Fastify API + Prisma/PostgreSQL (routes/services/db, Jest + supertest tests)
docker/         docker-compose.yml + environment template for running the full stack in containers
docs/           architecture notes, game design notes, API contract docs (mostly empty so far)
```

See `CLAUDE.md` Sections 4-6 for the full intended folder structure and file-layout conventions.

## Install dependencies

From the repo root (pnpm workspaces installs both `src/frontend` and `src/backend` in one pass):

```bash
pnpm install
```

## Running natively (no Docker)

1. Start a PostgreSQL instance and note its connection string, e.g. via Docker:
   ```bash
   docker run --rm -e POSTGRES_USER=game -e POSTGRES_PASSWORD=game -e POSTGRES_DB=skin_disease_game -p 5432:5432 postgres:16-alpine
   ```
2. Export `DATABASE_URL` for the backend:
   ```bash
   export DATABASE_URL="postgresql://game:game@localhost:5432/skin_disease_game"
   ```
3. Apply migrations and seed content data (diagnoses, treatments, shop items, patients/cases/documents/hints — never application/session data like users or game sessions):
   ```bash
   pnpm --filter backend exec prisma migrate deploy
   pnpm --filter backend seed
   ```
   The seed is safe to re-run any time — every row is upserted by a fixed id, so running it again never duplicates data.
4. Run both workspaces in dev mode from the repo root:
   ```bash
   pnpm dev
   ```
   This runs `vite` for the frontend (default `http://localhost:5173`) and `node --watch src/server.js` for the backend. **The backend dev command currently starts and exits immediately** — `src/server.js` has no code yet, so this is expected given the current state described above, not a setup error.

You can also run one workspace at a time:
```bash
pnpm --filter frontend dev
pnpm --filter backend dev
```

## Running with Docker Compose

`docker/docker-compose.yml` brings up Postgres, the backend, and the frontend as built containers.

1. Copy the env template and adjust if you want non-default credentials:
   ```bash
   cp docker/.env.example docker/.env
   ```
2. Build and start everything:
   ```bash
   pnpm docker:up
   ```
   (equivalent to `docker compose -f docker/docker-compose.yml up --build`)
3. The frontend is served at `http://localhost:4173` (production Vite build via `vite preview`). Postgres listens on `localhost:5432`. **The backend container builds successfully but exits immediately** — same reason as above, `src/server.js` doesn't implement a server yet.
4. The backend container seeds its content data (diagnoses, treatments, shop items, patients/cases/documents/hints) automatically on every start, after migrations and before the server boots — no manual step needed. It's safe on every restart since seeding upserts by a fixed id rather than inserting blindly. To re-run it manually against an already-running stack:
   ```bash
   docker compose -f docker/docker-compose.yml exec backend node dist/db/seed.js
   ```
5. Stop everything:
   ```bash
   pnpm docker:down
   ```

## Testing & linting

```bash
pnpm test   # runs Jest in both workspaces (frontend: Jest + React Testing Library, backend: Jest + supertest)
pnpm lint   # runs eslint in both workspaces (no config file exists yet, see "Current status" above)
```

## Working in this repo

This project follows a strict set of rules documented in [`CLAUDE.md`](./CLAUDE.md) — read it before contributing. Highlights:

- TDD is mandatory for all new frontend/backend logic (`CLAUDE.md` Section 8).
- No `position: absolute` outside the single Overlay Portal exception (`CLAUDE.md` Section 7).
- Domain state is only ever read/mutated through a Provider + hook pair; no cross-feature reach-through (`CLAUDE.md` Section 5).
- Only a feature's `index.js` barrel is a valid import path for outside code (`CLAUDE.md` Section 6).
- `src/frontend` and `src/backend` only ever talk over the HTTP API — never import each other directly (`CLAUDE.md` Sections 1 and 9).
- pnpm only; no direct pushes to `main`; PRs require green CI and at least one review (`CLAUDE.md` Sections 1 and 10).
