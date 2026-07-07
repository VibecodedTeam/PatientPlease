# 0006: Move `views/`, `components/`, and `styles/` inside `src/frontend/src/`

## Status

Accepted

## Context

CLAUDE.md previously documented `views/`, `components/`, `lib/`, `styles/`,
and `tests/` as top-level siblings of `src/frontend/src/`, with `src/`
holding only `main.jsx`, `App.jsx`, and the app-root `providers/`. That
matched the original Vite scaffold layout, but it split the frontend's own
React source across two sibling directories (`src/` and `views/`/`components/`)
for no benefit tied to `lib/`'s or `tests/`'s actual reasons for staying
separate: `lib/` is intentionally framework-free (Section 1, constraint 10),
and `tests/` is intentionally kept out of the source tree it mirrors
(Section 1, constraint 4). `views/`, `components/`, and `styles/` are none of
those things — they're just more React source, and having them outside `src/`
read as an accident of the initial scaffold rather than a deliberate split.

## Decision

- `src/frontend/src/` is now the entire React entry tree: `main.jsx`,
  `App.jsx`, `providers/` (app-root domains), `views/` (`MainView`,
  `NightView`), `components/`, and `styles/`.
- `src/frontend/lib/` and `src/frontend/tests/` remain outside `src/`, as
  siblings of it — `lib/` because it must stay framework-free, `tests/`
  because it must stay separate from the source it mirrors.
- `tests/` continues to mirror `src/frontend/`'s own tree exactly, which now
  means `tests/src/views/`, `tests/src/components/`, `tests/src/providers/`
  (mirroring `src/views/`, `src/components/`, `src/providers/`) plus
  `tests/lib/` (mirroring the top-level `lib/`).
- Every relative import crossing the old `views/`↔`components/`↔top-level
  boundary was updated for the new depth. Imports between two units that
  moved together (e.g. `views/MainView/` → `components/Wall/`) were
  unaffected, since both shifted one level deeper in lockstep.

## Consequences

- All of the frontend's own React source (entry point, providers, views,
  components, styles) now lives under one `src/` root, with only the
  intentionally-separate `lib/` and `tests/` outside it.
- Every relative import that previously crossed from `src/frontend/src/`
  into `src/frontend/views/` or `src/frontend/components/` (or vice versa)
  needed a path update; imports staying entirely within the moved group, or
  entirely within `lib/`/`tests/`/the unmoved `src/providers/`, did not.
- CLAUDE.md Sections 1, 3, 4, 5, 6, 7, and 8 were updated in the same change
  to keep the documented tree and every path example in sync with the actual
  layout — per Section 10's docs-discipline rule, this note exists so the
  reasoning survives independently of the diff.
