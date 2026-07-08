# 0007: Prisma content seed data

## Status

Accepted

## Context

Every content/reference table in the schema — `Diagnosis`, `Treatment`, `ShopItem`, `Patient`, `Case`, `CaseDocument`, `CaseHint` — started empty on every fresh `prisma migrate deploy` or `docker compose up`. The frontend worked around this by fetching a static `round_data.json` fixture directly, bypassing the backend entirely. This left local dev, CI, and Docker environments with no realistic data to exercise the actual `/api/v1/round` flow against, and no way to hand-verify FK relationships (`Case.correctDiagnosisId`, `CaseHint.requiredShopItemId`, etc.) without manually inserting rows.

This seeds only information/content data — the 7 models above — and deliberately never touches application/session data (`User`, `UserSession`, `GameSession`, `GameDayLog`, `OwnedItem`, `DiagnosisAttempt`, `ChatMessage`, `GameplayLog`), since that state only has meaning once created by actual play.

## Decision

- **Seed code lives in `src/backend/src/db/seed/`**, one file per content domain (`diagnoses.ts`, `treatments.ts`, `shopItems.ts`, `cases.ts`) plus an `index.ts` orchestrator and a `seed.ts` entrypoint — following this repo's own folder-structure doc, which already reserves `src/backend/src/db/` for "Prisma client instance, seed scripts."
- **Every seeded row gets a fixed, hardcoded UUID** and is written via `upsert({ where: { id }, ... })`, uniformly across all 7 models — even ones with a natural unique key (`Diagnosis.code`, `Treatment.code`, `ShopItem.sku`). `CaseDocument` has no natural unique key that covers every row (`@@unique([attentionPointRegion, caseId])` doesn't catch duplicates where `attentionPointRegion` is `null`, since Postgres treats `NULL` as distinct in unique indexes), so id-based upsert is the one strategy that keeps every model idempotent under the same rule.
- **A `SeedPrismaClient` narrow structural interface** (`src/backend/src/db/seed/types.ts`) mirrors the existing `RoundPrismaClient`/`AuthPrismaClient` pattern in `src/backend/src/services/` — seed functions depend on a minimal interface listing only the `.upsert(...)` calls they make, not the full generated Prisma client.
- **Docker auto-seeds on every container start.** `src/backend/Dockerfile`'s run-stage `CMD` runs `npx prisma migrate deploy && node dist/db/seed.js && node dist/server.js` — safe on every restart because seeding is upsert-based, not insert-only.
- **Local/native seeding** is available via `pnpm --filter backend seed` (`prisma generate && tsx src/db/seed.ts`), independent of the Docker path.
- **CI verifies the Docker container actually seeded itself**, not just that the Jest suite passed: the `docker-smoke` job in `.github/workflows/ci.yml` queries Postgres directly for row counts after `docker compose up`, since that's a different code path than the Jest tests (which run against CI's own Postgres service container, not the compose stack).
- **This is illustrative game content, not vetted clinical curriculum.** The diagnosis/treatment/case narratives are written to be plausible and internally consistent for gameplay purposes, not sourced from a medical review process. `docs/game-design` is where actual medical content sourcing/review notes belong — this content should go through that process before being treated as authoritative.

## Consequences

- Every fresh environment (local Postgres, CI, Docker) now has a full, FK-consistent content catalog without any manual setup step.
- Re-running the seed — locally, via CI, or via a container restart — is always safe and produces no duplicate rows.
- The seed's hardcoded UUIDs are a permanent part of the dataset's identity; changing a row's id later would orphan any data that came to reference the old one outside the seed itself.
- The medical/game content will need a pass through the `docs/game-design` review process before shipping — it was authored for structural correctness and gameplay variety, not clinical accuracy.
