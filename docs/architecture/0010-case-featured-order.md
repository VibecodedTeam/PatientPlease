# 0010: Pinned "featured" case ordering via `Case.featuredOrder`

## Status

Implemented

## Context

Case selection for a new day (`selectNextCase`,
[round.ts](../../src/backend/src/services/round.ts)) always worked the same
way: find the lowest `difficulty` among active, un-attempted cases for the
session, then deterministically pick one of the tied candidates via
`pickIndexForSeed(gameSessionId, ...)`. There was no way to guarantee a
specific case, or a specific sequence of cases, always appears first — the
tie-break was per-session pseudo-random.

We wanted 15 curated cases (maximum diagnosis diversity, prioritizing the 5
cases with a real patient photo — see `src/frontend/public/cases/cases.txt`)
to always be the first 15 a new session sees, in a fixed order.

## Decision

Added a nullable `featuredOrder Int? @db.SmallInt` column to `Case`
([patient.prisma](../../src/backend/prisma/schema/patient.prisma), migration
`20260714150814_add_case_featured_order`). Only the 15 curated cases set it
(values 1-15); the other ~46 cases leave it `null`.

`selectNextCase` now checks first for the lowest-`featuredOrder`,
un-attempted, active case (`orderBy: { featuredOrder: 'asc' }`) and returns
it directly if found — no randomness involved, since `featuredOrder` values
are unique. Only once every featured case has been attempted does it fall
back to the pre-existing difficulty-tiered random selection.

Seed data: `RealCaseSeed.featuredOrder?: number` (`realCases.ts`), set on
the 15 chosen cases and passed through in `seed.ts`'s `prisma.case.create`
call as `realCase.featuredOrder ?? null`.

## Consequences

- A new session's first 15 cases are fully deterministic and repeatable,
  regardless of `gameSessionId`.
- Adding/removing a featured case is a seed-data change (set or clear
  `featuredOrder` on that case), no schema change needed.
- `featuredOrder` values must stay unique across active cases for the
  ordering to be unambiguous; nothing in the schema enforces this today (no
  `@unique`) since the reseed script controls all 15 values directly — if
  this list grows or becomes editable outside the seed script, revisit.
