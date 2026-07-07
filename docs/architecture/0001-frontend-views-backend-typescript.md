# 0001: Frontend views/components/providers structure, backend TypeScript, no Next.js

Status: Accepted (path of `views/`/`components/` superseded by [0006](./0006-views-components-styles-under-src.md) — they now live under `src/frontend/src/`)

## Context

The frontend was originally documented around Next.js and a per-domain `features/` folder pattern, and the whole stack was JavaScript-only. In practice the frontend is built as a plain Vite + React + React Router SPA (no server-side rendering is needed for this game), and a `features/`-per-domain folder blurred the line between "this is a route-level screen" (there are only two: day phase and night phase) and "this is a reusable UI unit." The backend also used plain JavaScript, but it owns the diagnosis-verification and case-data logic that most benefits from compile-time checking.

## Decision

- Frontend has exactly two top-level views, `MainView` (day phase) and `NightView` (night phase), under `src/frontend/views/`. Every other screen element is a `components/` entry composed inside one of those views, not its own view and not a `features/` folder.
- Frontend drops Next.js in favor of a client-only SPA: Vite + React + `react-router-dom`.
- Frontend has no `lib/`/`utils/` folder. The Overlay Portal exception mechanism (CLAUDE.md Section 7) is `components/OverlayPortal/`, and the shared HTTP fetch wrapper is `providers/Api/` (`ApiProvider` + `useApi()`), following the same Provider + hook pattern as every other cross-cutting domain (CLAUDE.md Section 5).
- Frontend tests move out of their component folders into a single `src/frontend/tests/` tree that mirrors `views/`, `components/`, and `providers/` exactly.
- Backend (`src/backend`) is TypeScript-only; frontend (`src/frontend`) remains JavaScript-only. This is an intentional split: it puts compile-time checking where the correctness-critical diagnosis/case-data logic lives, without forcing a TypeScript/JSX toolchain migration onto the whole frontend at once.

## Consequences

- `CLAUDE.md` Sections 1, 3, 4, 5, 6, 7, 8, 9, 10 are updated to reflect this structure; anything referencing `features/`, Next.js, co-located tests, or "no TypeScript" project-wide is superseded by this document.
- The existing scaffold (`views/MainView`, backend `app.js`/`server.js`) is migrated in the same change so the repo doesn't contradict its own rules.
