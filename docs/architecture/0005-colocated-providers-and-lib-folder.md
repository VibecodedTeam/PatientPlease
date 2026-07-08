# 0005: Co-located providers, a scoped `lib/` folder, and axios everywhere

## Status

Accepted

## Context

CLAUDE.md originally required every domain provider to live in a shared
top-level `src/frontend/providers/` folder, and forbade any `lib/`/`utils/`
folder outright. In practice this produced two problems as the `Table`
feature (patient documents desk UI) was built out:

- `DocumentTableProvider` and `RoundProvider` are each consumed by exactly
  one feature area (`Table` and `MainView`, respectively) and nothing else.
  Forcing them into a shared top-level `providers/` folder put them further
  from the one place that uses them, with no corresponding benefit — nothing
  outside that one feature reaches into them anyway.
- The merged Google Sign-In auth feature (PR #22) introduced its own
  `fetch`-based HTTP client inside `providers/Api/`, independent of this
  branch's own axios-based client (which had nowhere sanctioned to live,
  since `lib/` was forbidden, and ended up duplicated as a result). Two
  parallel HTTP mechanisms in one frontend is exactly the kind of drift the
  original `lib/` ban was trying to prevent — but banning `lib/` outright
  didn't stop it, it just pushed the duplicate somewhere else.

## Decision

- **`lib/` is allowed**, scoped strictly to pure, framework-free, stateless
  helpers — no React state, no domain ownership, nothing that could
  duplicate a provider's job. Its first (and, for now, only) occupant is
  `lib/Api/httpClient.js`: a `createHttpClient(baseUrl, { withCredentials })`
  factory wrapping axios, configured with axios's `fetch` adapter so it
  stays testable via `global.fetch` mocking in this repo's jsdom test
  environment (axios's default adapter resolution picks `xhr` in jsdom,
  which isn't interceptable that way).
- **Providers co-locate with whatever single place introduces them.** A
  domain consumed only within one view's or component's own subtree lives
  inside that folder, in its own `providers/<Domain>/` subfolder. A domain
  composed once at the app root and consumed across otherwise-unrelated
  views (`Api`, `Auth`) lives next to `src/frontend/src/App.jsx`. There is
  no shared top-level `providers/` folder anymore.
- **One HTTP mechanism, not two.** `providers/Api`'s `ApiProvider` (formerly
  a hand-rolled `fetch` client) now builds its client via `lib/Api`'s
  `createHttpClient`, so `useApi()` — and therefore `AuthProvider`, which
  consumes it — runs on axios like every other HTTP-talking provider.

## Consequences

- Every provider's location now answers one question — "who's the only
  consumer (or is there more than one)?" — instead of a rule that
  centralizes regardless of reach.
- `lib/` carries real risk of drifting back into a dumping ground if its
  scope isn't enforced in review: anything stateful, anything
  React-specific, or anything that could be a provider instead does not
  belong there. Section 1/6 of CLAUDE.md spell this out explicitly so
  reviewers have a bright line to check against.
- Consolidating on axios required rewriting two already-merged test files
  (`ApiProvider.test.jsx`, `AuthProvider.test.jsx`) that mocked
  `global.fetch` directly, since axios's `fetch` adapter constructs a
  `Request` object rather than calling `fetch(url, options)` — a
  materially different call shape those tests now assert against.
- Frontend Jest tests always mock `global.fetch` rather than `jest.mock()`
  on `axios`/`lib/Api`, since this repo's `esbuild-jest` transform doesn't
  guarantee `jest.mock()` hoists above `import` statements the way Babel's
  does — codified in CLAUDE.md Section 8.
