# CLAUDE.md

This file governs how Claude Code (and any human contributor) works in this repository. It is the source of truth for architecture, workflow, and non-negotiable rules. If any instruction elsewhere conflicts with this file, this file wins. If this file conflicts with an explicit, current instruction from the user in a session, ask before deviating from either.
---

## 1. Hard Constraints (read this first)

These are never violated, no exceptions, no "just this once":

1. **No `position: absolute`** anywhere in frontend CSS/styles, except through the single documented `OverlayPortal` component exception in Section 7. Every other layout problem is solved with flexbox/grid/normal flow.
2. **No cross-component reach-through.** A component may only read/mutate another domain's state through that domain's Provider + hook pair (Section 5). No importing another domain's internal component, hook, or state directly.
3. **No file outside a `views/<Name>/`, `components/<Name>/`, or `providers/<Name>/` folder imports that folder's internals.** Only the folder's `index.js` barrel export is a valid import path for outsiders (Section 6). A unit's own test, in the mirrored `tests/` tree, is not an outsider and may import that unit's non-barrel files directly (Section 6).
4. **No production logic (frontend or backend) is written without a failing test first.** TDD red-green-refactor is mandatory (Section 8). Frontend tests live in the separate, mirrored `src/frontend/tests/` tree — never co-located with the source they test.
5. **`frontend` never imports from `backend` (or vice versa) directly.** The only contract between them is the HTTP API (Section 3, Section 9).
6. **Backend is TypeScript only; frontend is JavaScript only.** `src/backend` contains no `.js` source files — everything is `.ts`, compiled with `tsc`. `src/frontend` contains no `.ts`/`.tsx` files — everything is `.js`/`.jsx`, documented with JSDoc (`@param`/`@returns`) where the shape isn't obvious from the name, using PropTypes on components and explicit runtime checks at API boundaries.
7. **No direct pushes to `main`.** All work lands via PR, CI must be green, at least one review pass (see Section 10) is required before merge.
8. **Never skip hooks or checks** (`--no-verify`, disabling lint-staged, commenting out CI steps, etc.) to get something to pass.
9. **pnpm only.** No npm/yarn lockfiles, no mixing package managers.
10. **No `features/` folder and no `lib/`/`utils/` folder in frontend.** `src/frontend/` holds only its entry point (`src/`), `views/` (exactly `MainView` and `NightView`), `components/`, `providers/`, `tests/`, and `styles/`. Any logic that isn't itself a view, component, or provider is folded into whichever one of those owns it — there is no shared utility layer (Section 4, Section 6).
11. When a relevant skill exists (TDD, brainstorming, systematic-debugging, code-review, etc. from the `superpowers` plugin), **use it rather than re-deriving its process ad hoc.**

---

## 2. Project Overview

This is an educational game about skin cancer and skin disease awareness, styled after *Papers, Please*. The player is a doctor working through daily shifts:

- **Day phase**: Patients arrive one at a time. The player examines a 3D-rendered human figure (Three.js) with clickable/zoomable "attention points" (lesions, moles, rashes, etc.), reviews multi-frame documentation on a desk (photos, disease history, UV exposure history, clinical symptoms, family history, local weather history), talks to the patient via a chat/dialogue window (initially scripted/generic), consults a diagnosis-selection panel, and may reference purchased handbooks/equipment from a shelf. Settings and phone icons open popups. A pinned info board shows ambient info/hints. After the player picks a diagnosis and treatment, a result popup reveals correct/incorrect and money earned or lost.
- **Night phase**: A shop screen lets the player spend earned money on equipment, medical handbooks, and plot items, via a select-with-checkbox purchase UI.
- **Progression**: Case-specific hints unlock; medical reference handbooks are progressively available. An optional plotline layer applies pressure via a points/money threshold each day (a student-loan payoff mechanic), with penalties possible for repeated bad diagnoses.
- **Backend**: Serves patient case data, patient document images, logs gameplay/diagnosis events, and verifies diagnosis/documentation answers against stored case data.

This is a content-and-logic-heavy simulation game, not an action game — correctness of medical case data, documentation rendering, and diagnosis verification matters more than frame-perfect input handling.

---

## 3. Tech Stack

| Layer | Choice |
|---|---|
| Monorepo tooling | pnpm workspaces (root `package.json` + `pnpm-workspace.yaml`). No Turborepo, no Nx. |
| Frontend framework | React, bundled with Vite, routed with React Router (`react-router-dom`) as a client-rendered SPA. No Next.js, no server-side rendering. |
| 3D rendering | Three.js (patient figure, attention points, zoom/click interaction) |
| Frontend state | React Context + custom hooks only. No Redux, Zustand, MobX, Recoil, Jotai. |
| Frontend tests | Jest + React Testing Library only. No Vitest, no Playwright, no Cypress. Tests live in `src/frontend/tests/`, mirroring the `views/`/`components/`/`providers/` tree (Section 6). |
| Backend runtime | Node.js + Fastify API in `src/backend`, written in TypeScript. |
| ORM / DB | Prisma + PostgreSQL |
| Backend tests | Jest (`ts-jest`) + supertest (HTTP-level endpoint tests), against a real test Postgres database (preferred) or a mocked Prisma client for pure unit tests. Tests live in `src/backend/test/`. |
| Package manager | pnpm, everywhere — root scripts, CI, Docker builds |
| CI/CD | GitHub Actions (`.github/workflows`) |
| Containerization | Docker for frontend, backend, and Postgres (via docker-compose at `docker/docker-compose.yml` for local/deploy stack) |
| Language | **Backend**: TypeScript (ES2022+ target), strict mode, compiled with `tsc`. **Frontend**: JavaScript (ES2022+) with JSX, no TypeScript — JSDoc for non-obvious contracts, PropTypes for component props. |

---

## 4. Monorepo Folder Structure

```
/
├── CLAUDE.md
├── README.md
├── package.json                 # root: pnpm workspace scripts (lint, test, build, dev, docker:*)
├── pnpm-workspace.yaml
├── docker-compose.yml            # frontend + backend + postgres services
├── docs/
│   ├── architecture/             # ADRs, diagrams, provider/domain map
│   ├── game-design/               # case data design notes, medical content sourcing/review notes
│   └── api/                       # REST API contract docs (endpoints, request/response shapes)
├── .github/
│   └── workflows/
│       ├── ci.yml                 # lint, typecheck, test, build (runs on every PR)
│       └── deploy.yml             # build docker images, push, deploy, alive-check (runs on main)
├── src/
│   ├── frontend/
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   ├── app/                   # Next.js App Router routes only — thin, composition-only
│   │   ├── features/              # one folder per domain feature — see Section 5
│   │   │   ├── patient-scene/      # Three.js figure + attention points
│   │   │   ├── patient-documents/  # multi-frame document viewer
│   │   │   ├── diagnosis-panel/
│   │   │   ├── chat-dialogue/
│   │   │   ├── shop/                # night phase purchase UI
│   │   │   ├── inventory/           # shelf of owned books/equipment
│   │   │   ├── day-night-cycle/
│   │   │   ├── result-popup/
│   │   │   └── info-board/
│   │   ├── providers/              # one Provider + hook pair per domain (Section 5) — may re-export from features' index.js, this is the composition root
│   │   ├── lib/                    # pure utilities, api client wrapper (fetch to backend), no state
│   │   └── styles/                 # global tokens/reset only — never component-specific layout
│   └── backend/
│       ├── package.json
│       ├── Dockerfile
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/
│       ├── src/
│       │   ├── routes/             # one file per resource (patients, cases, diagnoses, images, logs)
│       │   ├── services/           # business logic, called by routes, testable in isolation
│       │   ├── db/                 # Prisma client instance, seed scripts
│       │   └── server.js           # app entrypoint, includes /health for alive-check
│       └── test/
│           └── setup/              # test-db bootstrap/teardown helpers
```

Rules tied to this structure:
- `src/frontend` and `src/backend` are **owned modules**. Frontend code never imports anything from `src/backend/**` and vice versa. The only contract is the HTTP API described in `docs/api/`.
- `app/` (Next.js routes) is composition-only: it assembles features and providers, it does not contain feature business logic or its own state.
- Anything reusable across 2+ features that is not global/cross-cutting state goes in `lib/`, not in a provider.

---

## 5. State Management & Provider Isolation Contract

**Rule**: Every cross-cutting domain of state gets **exactly one Provider + exactly one custom hook**, and that pair is the *only* legal way for anything outside that domain to read or mutate its state.

Pattern (naming is mandatory, not a suggestion):

- Domain `PatientSession` → `PatientSessionProvider` (component) + `usePatientSession()` (hook). Owns: current patient, current phase of the appointment, examined attention points.
- Domain `Diagnosis` → `DiagnosisProvider` + `useDiagnosis()`. Owns: selected diagnosis, selected treatment, submission state, result (correct/incorrect, money delta).
- Domain `Inventory` → `InventoryProvider` + `useInventory()`. Owns: owned handbooks/equipment, currently available hints unlocked by owned items.
- Domain `DayNight` → `DayNightProvider` + `useDayNight()`. Owns: current phase (day/night), current day number, money balance, threshold/plotline progress.
- Additional domains (e.g. `Shop`, `Chat`) follow the identical `<Domain>Provider` / `use<Domain>()` naming.

**What is forbidden:**
- Importing another feature's local component or internal hook (anything not exported from that feature's `index.js`) to read its state.
- Prop-drilling cross-cutting/global state (money, current patient, diagnosis result, unlocked inventory) through component trees instead of consuming it via the domain hook where it's needed.
- Reading another component's local `useState`/`useReducer` from outside that component — there is no mechanism for this, and if you find yourself wanting it, that state belongs in a domain provider instead.
- Two providers reaching into each other's internals directly. If domain A's logic needs domain B's data, A's component consumes `useB()` the same way any other consumer would — providers do not get backdoor access to each other's internal state shape.

**What is allowed:**
- Ordinary parent → child prop passing within the same feature's own component subtree, for that child's own rendering concerns (e.g. `<AttentionPoint x={..} y={..} onClick={..} />` inside `patient-scene`). This is not "shared state," it's normal composition and is fine.
- A component consuming multiple domain hooks at once (e.g. the result popup consumes both `useDiagnosis()` and `useDayNight()` to show the result and update money) — that's the intended cross-domain integration point, and it only happens through hooks.
- Providers being composed/nested at the app root (`app/layout.jsx` or a dedicated `providers/AppProviders.jsx`), which is allowed to know about all providers since its only job is composition, not logic.

If a piece of state is only ever used inside one feature and never read by anything outside it, it does **not** need a provider — plain local `useState`/`useReducer` inside that feature is correct and preferred (don't create providers for everything by default).

---

## 6. Component File-Layout Convention

Every component/feature is a **self-contained, co-located unit**. For a feature `diagnosis-panel`:

```
features/diagnosis-panel/
├── index.js                  # barrel: exports ONLY the public surface (component + provider + hook, if any)
├── DiagnosisPanel.jsx         # the component
├── DiagnosisPanel.test.jsx    # its test, co-located, not in a separate /tests tree
├── DiagnosisPanel.module.css  # its styles (CSS Modules), scoped to this component
├── DiagnosisProvider.jsx      # if this feature owns a domain (Section 5)
├── useDiagnosis.js            # the hook pairing with the provider above
└── internal/                  # optional: private helper components/hooks used only inside this feature, never exported
```

Rules:
- `index.js` is the *only* import path anything outside the feature folder is allowed to use (`import { DiagnosisPanel, useDiagnosis } from '@/features/diagnosis-panel'`). Deep-importing `features/diagnosis-panel/DiagnosisPanel.jsx` from outside the folder is forbidden — this is what makes the isolation rule in Section 5 enforceable, not just aspirational.
- Test files sit next to the file they test (`Foo.jsx` + `Foo.test.jsx`), never in a parallel `__tests__` directory that mirrors the source tree.
- Styles are co-located and scoped (CSS Modules) to the component they style. Global styles only live in `src/frontend/styles/` and are limited to resets/design tokens (colors, spacing scale, typography) — never component layout.
- Naming conventions:
  - Components: `PascalCase.jsx` (`AttentionPoint.jsx`)
  - Hooks: `camelCase.js` starting with `use` (`usePatientSession.js`)
  - Providers: `PascalCase.jsx` ending in `Provider` (`PatientSessionProvider.jsx`)
  - Feature folders: `kebab-case` (`patient-documents`)
  - Prisma models: `PascalCase` singular (`Patient`, `CaseDocument`, `DiagnosisAttempt`)
  - Backend route files: `kebab-case` matching resource, plural (`patients.js`, `diagnoses.js`)

---

## 7. CSS/Layout Rule: No `position: absolute`

**Default rule**: `position: absolute` (and `position: fixed` used for layout purposes) is **not allowed** anywhere in frontend styles. Use flexbox and grid for all layout, including seemingly "absolute-shaped" needs like the desk layout, shelf, attention-point hotspots over the 3D canvas, and popups.

- Attention points over the Three.js canvas: position them via the Three.js/DOM overlay projection into a normal flow container (e.g. a grid cell or a wrapper sized to the canvas), not via manually-computed absolute coordinates, unless that computation is itself contained within the one exception mechanism below.
- Popups/modals that visually "float" over content: use the **Overlay Portal exception** below, not ad hoc absolute positioning inline in the feature.

### The one narrow exception: Overlay Portal

If, and only if, a component must render visually detached from normal document flow (e.g. a modal, the settings/phone popup, a tooltip that must escape a clipping ancestor), it must go through a single shared mechanism:

- Location: `src/frontend/lib/overlay-portal/` (a single shared module, not one per feature).
- It is the *only* file in the frontend allowed to declare `position: fixed`/`position: absolute` for the purpose of layering above the page (a React portal rendering into a fixed full-viewport container, itself using flex/grid internally to position its children).
- Any feature that needs an overlay imports and uses this shared portal component/hook — it does not declare its own `position: absolute`.
- Every usage site must include a one-line comment directly above the JSX using it: `{/* overlay-portal: <why this must escape normal flow, e.g. "modal must render above 3D canvas and desk layout"> */}`.
- Any PR introducing a *new* CSS declaration of `position: absolute` or `position: fixed` outside `lib/overlay-portal/` must be rejected in review — this is a lint/review gate, not a style preference. If a genuinely new case is found that the portal doesn't cover, the fix is to extend the shared portal mechanism, not to add a new one-off absolute rule.

---

## 8. TDD Workflow (mandatory for all new logic)

No frontend component/hook and no backend endpoint/service is written without a failing test first. Use the `superpowers:test-driven-development` skill's red-green-refactor discipline; the specifics below are how it maps onto this stack.

### Frontend (Jest + React Testing Library)

1. **Red**: Write `Component.test.jsx` (or `useHook.test.js`) first, asserting the behavior you're about to add (render output, user interaction via `@testing-library/user-event`, hook return values via `@testing-library/react`'s `renderHook`). Run it, confirm it fails for the expected reason (not a typo/import error).
2. **Green**: Write the minimal component/hook code to make that test pass. No extra behavior beyond what's tested.
3. **Refactor**: Clean up implementation and test code with the test suite green throughout. Re-run tests after every change.
4. Domain providers/hooks (Section 5) are tested by rendering a small test consumer component wrapped in the provider — never by reaching into provider internals.
5. Three.js scene logic (attention point hit-testing, coordinate mapping) is isolated into plain, framework-free functions wherever possible specifically so it's unit-testable without a WebGL context; only thin glue code touches the Three.js renderer directly.

### Backend (Jest + supertest + Prisma/Postgres)

1. **Red**: Write a supertest-driven test against the route (e.g. `POST /diagnoses`) asserting status code and response shape for the case being added, run it, confirm it fails.
2. **Green**: Implement the route/service/Prisma query needed to pass. Use a real test database (separate `DATABASE_URL` pointing at a disposable test Postgres instance, migrated via `prisma migrate deploy` in test setup/teardown) for integration-level endpoint tests. Use a mocked/injected Prisma client only for pure unit tests of service-layer logic that don't need real DB behavior (e.g. scoring rules, verification logic).
3. **Refactor**: Clean up service/route code with tests green throughout.
4. Every new Prisma model or migration is accompanied by at least one test exercising a route or service that uses it — a migration with no corresponding test is incomplete work.
5. `src/backend/test/setup/` owns the test-DB bootstrap (create schema, run migrations, truncate between tests) — new tests reuse this, they don't hand-roll their own DB setup.

General rule: a PR that adds logic with no new/updated test is not reviewable — request tests before reviewing functionality.

---

## 9. CI/CD Expectations

`.github/workflows/ci.yml` runs on every PR and must, in order, fail fast on:
1. Install dependencies (`pnpm install --frozen-lockfile`)
2. Lint (both `src/frontend` and `src/backend` — ESLint is what catches unused vars, bad imports, and prop-type violations in the absence of a type checker)
3. Unit + integration tests (`pnpm test` at root, fanning out to both workspaces; backend tests run against a Postgres service container in the workflow)
4. Build (`next build` for frontend; backend has no separate build step beyond install, since it ships plain JS)

`.github/workflows/deploy.yml` runs on merge to `main` and must:
1. Re-run the same checks as `ci.yml` (never deploy unverified code)
2. Build Docker images for frontend and backend (`docker build` using each app's `Dockerfile`)
3. Push images to the registry
4. Deploy (to whatever target environment is configured)
5. **Alive-check**: after deploy, hit the deployed backend's `/health` endpoint (and the deployed frontend's root route) and fail the workflow if either doesn't return a healthy response within a defined timeout/retry budget. A deploy is not "done" until the alive-check passes.

Branch protection on `main` requires: `ci.yml` passing, at least one approving review, no direct pushes (Section 1).

---

## 10. Team Engineering Conventions

- **Commit messages**: Conventional Commits style — `type(scope): summary`, e.g. `feat(diagnosis-panel): add treatment selection UI`, `fix(backend/routes): correct 404 on missing patient case`, `test(patient-scene): add hit-testing unit tests`. Types: `feat`, `fix`, `test`, `refactor`, `docs`, `chore`, `ci`. Scope is the feature/module folder name.
- **Branch naming**: `type/short-description` mirroring commit type, e.g. `feat/shop-purchase-flow`, `fix/attention-point-hitbox`.
- **PR size**: keep PRs reviewable — one feature/fix per PR. If a PR touches both `src/frontend` and `src/backend` for one API contract change, that's fine as one PR, but unrelated changes never get bundled together. If a PR is trending past roughly 400 lines of diff (excluding generated/lockfile changes), split it.
- **No direct pushes to `main`** (restated from Section 1) — everything through PRs.
- **CI must be green before merge.** No merging on red or skipped checks.
- **No `--no-verify`, no disabling pre-commit/CI hooks** to force a merge (Section 1).
- **Code review is mandatory** and should be done using the project's `code-review` skill rather than an ad hoc read-through — run it before requesting/finishing human review, and again after addressing feedback.
- **No TypeScript** (Section 1) — plain JavaScript only; reviewers reject any PR introducing `.ts`/`.tsx` files or a TS toolchain dependency.
- **Naming consistency** (restated from Section 6): PascalCase components/providers, camelCase `use`-prefixed hooks, kebab-case feature folders, PascalCase singular Prisma models, kebab-case plural backend route files.
- **Ownership boundary**: `src/frontend` and `src/backend` are separate ownership domains. A PR changing the API contract between them must update `docs/api/` in the same PR. Frontend code reaches the backend only via the typed API client in `src/frontend/lib/`, never via direct DB/Prisma access or duplicated route logic.
- **Docs discipline**: architecture-affecting decisions (new domain provider, new external service, schema changes with migration implications) get a short note in `docs/architecture/`. This isn't bureaucracy for its own sake — it's what lets a new contributor or a future Claude session understand *why*, not just *what*.

---

## 11. When Unsure

If a task seems to require breaking any Hard Constraint in Section 1, stop and ask rather than proceeding. If an existing pattern in the codebase already conflicts with this file (e.g. legacy code with `position: absolute` predating this document), flag it and propose a fix rather than copying the pattern into new code.
