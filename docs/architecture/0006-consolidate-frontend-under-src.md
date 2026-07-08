# 0006: Consolidate the entire frontend under `src/frontend/src/`

## Status

Accepted

## Context

CLAUDE.md previously documented `views/`, `components/`, `lib/`, `styles/`,
`tests/`, and `e2e/` as top-level siblings of `src/frontend/src/`, with `src/`
holding only `main.jsx`, `App.jsx`, and the app-root `providers/`. That
matched the original Vite scaffold layout, but it split the frontend across
several sibling directories for no benefit tied to any of their actual
reasons for existing: `lib/` is intentionally framework-free, `tests/` is
intentionally kept separate from the source it mirrors, and `e2e/` is
intentionally a thin Playwright smoke layer distinct from the Jest/RTL unit
tests. None of those reasons required living outside `src/` — having them
(and `views/`, `components/`, `styles/`, which have no such reason at all)
scattered at the top level read as an accident of the initial scaffold
rather than a deliberate split.

## Decision

- `src/frontend/src/` is now the entire frontend: `main.jsx`, `App.jsx`,
  `providers/` (app-root domains), `views/` (`MainView`, `NightView`),
  `components/`, `styles/`, `lib/`, `tests/`, and `e2e/`.
- Only build/tooling config stays at `src/frontend/`'s top level, outside
  `src/`: `package.json`, `Dockerfile`, `vite.config.js`, `index.html`,
  `jest.config.js`, `playwright.config.js`.
- `tests/` mirrors `src/frontend/src/`'s own tree exactly — `tests/views/`,
  `tests/components/`, `tests/providers/`, `tests/lib/` — with no extra
  nesting, since `tests/` is now itself a direct sibling of the folders it
  mirrors rather than being outside the tree it mirrors.
- `jest.config.js`'s `roots` and `playwright.config.js`'s `testDir` point at
  `src/tests` and `src/e2e` respectively.
- Every relative import crossing an old top-level/`src/` boundary was
  updated for the new depth. Imports between units that moved together (or
  were already inside `src/`, like the app-root `providers/`) were
  unaffected, since their relative distance to each other never changed —
  only imports that crossed from something that moved to something that
  didn't (or vice versa) needed a path update.

## Consequences

- The entire frontend now lives under one `src/` root; `src/frontend/`
  itself holds only tooling config.
- Because `lib/` and `tests/` joined the moved group in the same change that
  moved `views/`/`components/`/`styles/`, every path that crosses between
  them and the rest of the frontend reverted to the exact relative form it
  had before either restructuring — e.g. `RoundProvider.jsx`'s import of
  `lib/Api` is `../../../../lib/Api`, identical to its original pre-restructure
  path, because both ends of that import moved one level deeper in lockstep.
- CLAUDE.md Sections 1, 3, 4, 5, 6, 7, and 8 were updated in the same change
  to keep the documented tree and every path example in sync with the actual
  layout — per Section 10's docs-discipline rule, this note exists so the
  reasoning survives independently of the diff.
