# Database Seeding

`src/backend/src/db/seed.ts` populates the catalog and case tables (`Diagnosis`,
`Treatment`, `ShopItem`, `Patient`, `Case`, `CaseDocument`, `CaseHint`) with at
least 20 rows each.

By default it is **safe, not destructive**: if the catalog already has data,
`seed()` logs a message and no-ops instead of touching anything. Only passing
`{ force: true }` (or the `--force` CLI flag) makes it clear those tables
(and their direct dependents — `DiagnosisAttempt`, `ChatMessage`,
`GameplayLog`, `OwnedItem`) and repopulate them from scratch. This matters
locally: a developer who has been playtesting against the seeded catalog
should not lose that data just from re-running the seed command.

## Seeding leaves no trace in any build, and is CI-verification-only

`seed.ts` is excluded from `src/backend/tsconfig.build.json`, so
`pnpm --filter backend build` — the same build that produces the backend
Docker image, used by both the `docker-smoke` CI job and any future deploy
pipeline — **never compiles it into `dist/`**. It exists only as TypeScript
source and only runs via `tsx`. This is intentional: the seeder must never be
present in a shippable artifact, so it cannot end up running via a container
`CMD`, an autodeploy step, or anything else that executes whatever is baked
into the image.

Seeding is invoked in exactly three places, all requiring an explicit command,
all via `tsx` against source:

- CI: `.github/workflows/ci.yml`'s `docker-smoke` job installs backend
  dependencies and runs `pnpm --filter backend exec tsx src/db/seed.ts --force`
  **from the GitHub Actions runner** (connecting to Postgres over the port
  `docker/docker-compose.yml` exposes to the host), immediately followed by a
  row-count verification step. This exists purely to give that verification
  step real data — it is a CI-verification-only step, not a general-purpose
  deploy/release action. `--force` is used there purely for determinism —
  CI's database is always empty at that point anyway, since each run builds a
  fresh stack and tears it down with `down -v`.
- Local/manual, safe: `pnpm --filter backend db:seed` — no-ops if already seeded.
- Local/manual, destructive: `pnpm --filter backend db:seed:reset` — always
  wipes and reseeds. Use this when you actually want fresh catalog/case data.

**It is deliberately not wired into `src/backend/Dockerfile`'s `CMD`, into
`docker/docker-compose.yml`'s `command`/`entrypoint`, or into the production
build at all.** The `CMD`/`command` paths run identically for a developer's
local `docker compose up -d` and for CI's `docker compose up --build -d`, and
only run `prisma migrate deploy` (schema migrations, no data). A developer
running `docker compose up -d` locally must get an empty, freshly-migrated
database, and the image itself must not even contain the seed script — if
seeding is ever needed somewhere else, add an explicit step/script that runs
it from source, not a change to the container's default start command or the
production build.
