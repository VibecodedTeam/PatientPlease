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
10. **No `features/` folder in frontend. A `lib/` folder is allowed, scoped strictly to pure, framework-free, stateless helpers** — e.g. a generic HTTP client factory. Nothing in `lib/` may hold React state, own a domain, or duplicate a provider's job; if it needs either, it belongs in a provider instead. `src/frontend/` holds only its entry point (`src/`), `views/` (exactly `MainView` and `NightView`), `components/`, `lib/`, `tests/`, and `styles/` — **there is no top-level `providers/` folder.** Every provider is co-located with the view/component it belongs to, or, for the small set of app-wide domains composed once at the root, lives next to `src/App.jsx` (Section 4, Section 5, Section 6).
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
| Frontend tests | Jest + React Testing Library for all component/view/provider tests. No Vitest, no Cypress. Tests live in `src/frontend/tests/`, mirroring `src/frontend/`'s own tree exactly — `views/`, `components/`, `lib/`, and `src/` (Section 6). Playwright is permitted, but scoped exclusively to a `src/frontend/e2e/` smoke-test layer that verifies the built app boots and serves — it is not an alternative to, or a replacement for, the Jest/RTL unit-test tree, and no component/view/provider logic is tested through it. |
| Backend runtime | Node.js + Fastify API in `src/backend`, written in TypeScript. |
| ORM / DB | Prisma + PostgreSQL |
| Backend tests | Jest (`ts-jest`) + Fastify's built-in `inject()` (HTTP-level endpoint tests), against a real test Postgres database (preferred) or a mocked Prisma client for pure unit tests. Tests live in `src/backend/test/`. |
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
├── docker/
│   └── docker-compose.yml        # frontend + backend + postgres services
├── docs/
│   ├── architecture/              # ADRs, diagrams, provider/domain map
│   ├── game-design/                # case data design notes, medical content sourcing/review notes
│   └── api/                        # REST API contract docs (endpoints, request/response shapes)
├── .github/
│   └── workflows/
│       ├── ci.yml                  # lint, test, build (runs on every PR)
│       └── deploy.yml              # build docker images, push, deploy, alive-check (runs on main)
├── src/
│   ├── frontend/
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   ├── vite.config.js
│   │   ├── index.html
│   │   ├── jest.config.js
│   │   ├── src/
│   │   │   ├── main.jsx            # Vite/React entry point
│   │   │   ├── App.jsx             # React Router route table — composition-only, wires views to routes, no view logic
│   │   │   └── providers/          # the only providers/ folder in the tree: app-wide domains composed once, here, at the root
│   │   │       ├── Api/             # axios-backed client (built on lib/Api), exposed via useApi()
│   │   │       └── Auth/
│   │   ├── views/                  # exactly two: MainView (day phase), NightView (night/shop phase)
│   │   │   ├── MainView/
│   │   │   │   ├── index.js
│   │   │   │   ├── MainView.jsx
│   │   │   │   ├── MainView.module.css
│   │   │   │   └── providers/         # domains consumed only inside MainView's own subtree
│   │   │   │       └── Round/
│   │   │   └── NightView/
│   │   │       ├── index.js
│   │   │       ├── NightView.jsx
│   │   │       └── NightView.module.css
│   │   ├── components/             # every reusable/domain UI unit, flat, one PascalCase folder per component
│   │   │   ├── PatientScene/        # Three.js figure + attention points
│   │   │   ├── PatientDocuments/    # multi-frame document viewer
│   │   │   ├── DiagnosisPanel/
│   │   │   ├── ChatDialogue/
│   │   │   ├── Shop/                 # night phase purchase UI
│   │   │   ├── Inventory/            # shelf of owned books/equipment
│   │   │   ├── ResultPopup/
│   │   │   ├── InfoBoard/
│   │   │   └── OverlayPortal/         # the one component allowed to declare position:fixed/absolute (Section 7)
│   │   ├── lib/                     # pure, framework-free, stateless helpers only (Section 1, Section 6)
│   │   │   └── Api/                  # axios client factory: createHttpClient(baseUrl, { withCredentials })
│   │   ├── styles/                  # global tokens/reset only — never component-specific layout
│   │   └── tests/                   # every frontend test, mirroring src/frontend/'s own tree exactly
│   │       ├── views/
│   │       │   ├── MainView/MainView.test.jsx
│   │       │   └── NightView/NightView.test.jsx
│   │       ├── components/
│   │       │   └── OverlayPortal/OverlayPortal.test.jsx
│   │       ├── lib/
│   │       │   └── Api/httpClient.test.js
│   │       └── src/
│   │           └── providers/
│   │               └── Api/ApiProvider.test.jsx
│   └── backend/
│       ├── package.json             # jest config lives inline here, not in a separate jest.config.js
│       ├── Dockerfile
│       ├── tsconfig.json
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/
│       ├── src/
│       │   ├── routes/             # one file per resource (patients.ts, cases.ts, diagnoses.ts, images.ts, logs.ts)
│       │   ├── services/           # business logic, called by routes, testable in isolation
│       │   ├── db/                 # Prisma client instance, seed scripts
│       │   ├── plugins/            # Fastify plugin registration
│       │   ├── app.ts              # Fastify instance: plugin/route wiring, no server bootstrap
│       │   └── server.ts           # app entrypoint, includes /health for alive-check
│       └── test/
│           └── setup/              # test-db bootstrap/teardown helpers
```

Rules tied to this structure:
- `src/frontend` and `src/backend` are **owned modules**. Frontend code never imports anything from `src/backend/**` and vice versa. The only contract is the HTTP API described in `docs/api/`.
- `src/frontend/src/App.jsx` is composition-only: it wires `views/` to routes via `react-router-dom`, it does not contain view business logic or its own state. It also composes the small set of app-wide providers (`Api`, `Auth`) — those live next to it, in `src/frontend/src/providers/`.
- `src/frontend/lib/` is allowed but scoped to pure, framework-free, stateless helpers only (Section 1, constraint 10) — currently just `lib/Api/`, the shared axios client factory every provider that talks HTTP builds its client from.
- There is no top-level `providers/` folder. A provider used only within one view's or component's own subtree lives co-located inside that folder, in its own `providers/<Domain>/` subfolder (e.g. `views/MainView/providers/Round/`, `components/Table/providers/DocumentTable/`) — see Section 5 for the full rule.
- `src/frontend/views/` holds exactly two entries, `MainView` and `NightView`. Every other screen element (patient scene, documents, diagnosis panel, chat, shop, inventory, popups, info board) is a `components/` entry composed inside one of those two views — not its own view and not a `features/` folder.

---

## 5. State Management & Provider Isolation Contract

**Rule**: Every cross-cutting domain of state gets **exactly one Provider + exactly one custom hook**, and that pair is the *only* legal way for anything outside that domain to read or mutate its state. **Where a domain's provider lives depends on its reach, not a fixed top-level folder:**

- A domain consumed only within one view's or component's own subtree lives **co-located inside that owning folder**, in its own `providers/<Domain>/` subfolder — e.g. `views/MainView/providers/Round/`, `components/Table/providers/DocumentTable/`.
- A domain composed once at the app root and consumed across multiple, otherwise-unrelated views (currently `Api` and `Auth`) lives next to `src/frontend/src/App.jsx`, in `src/frontend/src/providers/<Domain>/` — co-located with the one file that composes it.
- Either way the pattern inside the `<Domain>/` folder is identical (naming is mandatory, not a suggestion): `<Domain>Provider.jsx` (component) + `use<Domain>.js` (hook) + `index.js` (barrel exporting only the public Provider + hook). Nesting a provider inside a view/component folder does not make it "internal" to that folder — it still gets its own barrel and is importable by anything that legitimately needs that domain, the same as a top-level provider would be.

Current domains:

- `Round` → `views/MainView/providers/Round/RoundProvider.jsx` + `useRound.js`. Owns: the full round payload (game session, owned items, active case, diagnosis/treatment catalogs). Consumed only within `MainView`.
- `DocumentTable` → `components/Table/providers/DocumentTable/DocumentTableProvider.jsx` + `useDocumentTable.js`. Owns: the desk documents narrowed from `Round`'s payload. Consumed only within `Table`.
- `Api` → `src/providers/Api/ApiProvider.jsx` + `useApi.js`. Owns: the HTTP client to the backend API (base URL, credentials, JSON parsing, error normalization), built via `lib/Api`'s `createHttpClient`. This is the only place frontend code builds an HTTP client directly — every other provider/component that needs the backend consumes `useApi()`.
- `Auth` → `src/providers/Auth/AuthProvider.jsx` + `useAuth.js`. Owns: the signed-in user, auth status, login/logout. Consumes `useApi()` like any other domain would.
- Future domains (`PatientSession`, `Diagnosis`, `Inventory`, `DayNight`, `Chat`, etc.) follow the identical `<Domain>Provider.jsx` + `use<Domain>.js` + `index.js` naming; whether each ends up co-located or app-root depends on its actual reach once it's built, not decided in advance here.

**What is forbidden:**
- Importing another component's or view's internal file or internal hook (anything not exported from that folder's `index.js`) to read its state.
- Prop-drilling cross-cutting/global state (money, current patient, diagnosis result, unlocked inventory) through component trees instead of consuming it via the domain hook where it's needed.
- Reading another component's local `useState`/`useReducer` from outside that component — there is no mechanism for this, and if you find yourself wanting it, that state belongs in a domain provider instead.
- Two providers reaching into each other's internals directly. If domain A's logic needs domain B's data, A's component consumes `useB()` the same way any other consumer would — providers do not get backdoor access to each other's internal state shape.

**What is allowed:**
- Ordinary parent → child prop passing within the same component's own subtree, for that child's own rendering concerns (e.g. `<AttentionPoint x={..} y={..} onClick={..} />` inside `PatientScene`). This is not "shared state," it's normal composition and is fine.
- A component consuming multiple domain hooks at once (e.g. `ResultPopup` consumes both `useDiagnosis()` and `useDayNight()` to show the result and update money) — that's the intended cross-domain integration point, and it only happens through hooks.
- Providers being composed/nested at the app root (`src/frontend/src/App.jsx`, or a dedicated `providers/AppProviders/AppProviders.jsx`), which is allowed to know about all providers since its only job is composition, not logic.

If a piece of state is only ever used inside one component and never read by anything outside it, it does **not** need a provider — plain local `useState`/`useReducer` inside that component is correct and preferred (don't create providers for everything by default).

---

## 6. Component / View / Provider File-Layout Convention

Every view, component, and provider is a **self-contained, co-located unit for its source files** — but its test lives separately, in the mirrored `tests/` tree, never next to the source.

For a component `DiagnosisPanel`:

```
components/DiagnosisPanel/
├── index.js                  # barrel: exports ONLY the public surface (component + provider + hook, if any)
├── DiagnosisPanel.jsx         # the component
├── DiagnosisPanel.module.css  # its styles (CSS Modules), scoped to this component
└── internal/                  # optional: private helper components/hooks used only inside this component, never exported
```

Its test lives at the mirrored path, rooted under `src/frontend/tests/`:

```
tests/components/DiagnosisPanel/
└── DiagnosisPanel.test.jsx
```

The identical pattern applies to `views/<ViewName>/` (e.g. `views/MainView/` ↔ `tests/views/MainView/`), to any provider regardless of where it's co-located (e.g. `components/Table/providers/DocumentTable/DocumentTableProvider.jsx` ↔ `tests/components/Table/providers/DocumentTable/DocumentTableProvider.test.jsx`, or `src/providers/Auth/AuthProvider.jsx` ↔ `tests/src/providers/Auth/AuthProvider.test.jsx`), and to `lib/` (e.g. `lib/Api/httpClient.js` ↔ `tests/lib/Api/httpClient.test.js`). In every case, `tests/` mirrors the exact path of the file being tested, rooted at `src/frontend/` itself — not a fixed shortlist of top-level folders.

Rules:
- `index.js` is the *only* import path anything **outside** the folder is allowed to use (`import { DiagnosisPanel } from '@/components/DiagnosisPanel'`). Deep-importing `components/DiagnosisPanel/DiagnosisPanel.jsx` from another component/view/provider is forbidden — this is what makes the isolation rule in Section 5 enforceable, not just aspirational.
- A unit's own test is not an "outsider": a test may import that unit's non-barrel files (including `internal/` helpers) directly, since verifying a unit's internals is not the same as another domain reaching through it. A test still imports the public component/hook itself via the barrel (`import { DiagnosisPanel } from '../../../components/DiagnosisPanel'`) unless it's specifically exercising an internal helper.
- Tests are never co-located and there is no per-folder `__tests__` directory. `src/frontend/tests/` is the single frontend test tree, and its internal structure exactly mirrors `views/`, `components/`, and `providers/`.
- Styles are co-located and scoped (CSS Modules) to the view/component they style. Global styles only live in `src/frontend/styles/globals.css` — the only file in that folder — and are limited to a CSS reset plus `:root` design tokens (colors, spacing scale, typography); never component-specific layout or one-off overrides.
- Naming conventions:
  - Views: `PascalCase` folder + file, exactly `MainView` and `NightView` — no other view may be added without updating this document.
  - Components: `PascalCase.jsx` (`PatientScene.jsx`), folder name matches exactly (`components/PatientScene/`).
  - Providers: `PascalCase` domain folder (`providers/Diagnosis/`) containing `PascalCase` + `Provider` suffix (`DiagnosisProvider.jsx`) and its `camelCase` `use`-prefixed hook (`useDiagnosis.js`).
  - Hooks: `camelCase.js` starting with `use` (`usePatientSession.js`).
  - Backend: TypeScript files (`.ts`). Route files `kebab-case` matching resource, plural (`patients.ts`, `diagnoses.ts`). Prisma models `PascalCase` singular (`Patient`, `CaseDocument`, `DiagnosisAttempt`).

---

## 7. CSS/Layout Rule: No `position: absolute`

**Default rule**: `position: absolute` (and `position: fixed` used for layout purposes) is **not allowed** anywhere in frontend styles. Use flexbox and grid for all layout, including seemingly "absolute-shaped" needs like the desk layout, shelf, attention-point hotspots over the 3D canvas, and popups.

- Attention points over the Three.js canvas: position them via the Three.js/DOM overlay projection into a normal flow container (e.g. a grid cell or a wrapper sized to the canvas), not via manually-computed absolute coordinates, unless that computation is itself contained within the one exception mechanism below.
- Popups/modals that visually "float" over content: use the **OverlayPortal component exception** below, not ad hoc absolute positioning inline in the component.

### The one narrow exception: the `OverlayPortal` component

If, and only if, a component must render visually detached from normal document flow (e.g. a modal, the settings/phone popup, a tooltip that must escape a clipping ancestor), it must go through a single shared mechanism:

- Location: `src/frontend/components/OverlayPortal/` (a single shared component, not one per feature).
- It is the *only* folder in the frontend allowed to declare `position: fixed`/`position: absolute` for the purpose of layering above the page (a React portal rendering into the `#overlay-root` element declared in `index.html`, itself using flex/grid internally to position its children).
- Any component that needs an overlay imports `OverlayPortal` from its `index.js` barrel (`import { OverlayPortal } from '@/components/OverlayPortal'`) — it does not declare its own `position: absolute`.
- Every usage site must include a one-line comment directly above the JSX using it: `{/* overlay-portal: <why this must escape normal flow, e.g. "modal must render above 3D canvas and desk layout"> */}`.
- Any PR introducing a *new* CSS declaration of `position: absolute` or `position: fixed` outside `components/OverlayPortal/` must be rejected in review — this is a lint/review gate, not a style preference. If a genuinely new case is found that the portal doesn't cover, the fix is to extend `OverlayPortal`, not to add a new one-off absolute rule.

---

## 8. TDD Workflow (mandatory for all new logic)

No frontend component/hook and no backend endpoint/service is written without a failing test first. Use the `superpowers:test-driven-development` skill's red-green-refactor discipline; the specifics below are how it maps onto this stack.

### Frontend (Jest + React Testing Library)

1. **Red**: Write the test first, in the mirrored `tests/` path (`tests/views/<Name>/<Name>.test.jsx`, `tests/components/<Name>/<Name>.test.jsx`, or `tests/providers/<Domain>/<Domain>Provider.test.jsx`), asserting the behavior you're about to add (render output, user interaction via `@testing-library/user-event`, hook return values via `@testing-library/react`'s `renderHook`). Import the unit under test via its `index.js` barrel. Run it, confirm it fails for the expected reason (not a typo/import error).
2. **Green**: Write the minimal view/component/hook code, in its own `views/`, `components/`, or `providers/` folder, to make that test pass. No extra behavior beyond what's tested.
3. **Refactor**: Clean up implementation and test code with the test suite green throughout. Re-run tests after every change.
4. Domain providers/hooks (Section 5) are tested by rendering a small test consumer component wrapped in the provider — never by reaching into provider internals.
5. Three.js scene logic (attention point hit-testing, coordinate mapping) is isolated into plain, framework-free functions inside that component's own `internal/` folder wherever possible, specifically so it's unit-testable without a WebGL context; only thin glue code touches the Three.js renderer directly. Its test lives at the mirrored path (e.g. `tests/components/PatientScene/internal/hitTesting.test.js`), which is allowed to import the `internal/` file directly (Section 6).
6. Any test exercising code that talks HTTP mocks `global.fetch` directly — never `jest.mock()` on `axios` or on `lib/Api` itself. This repo's frontend Jest transform (`esbuild-jest`) does not guarantee `jest.mock()` calls are hoisted above `import` statements the way Babel's transform does, so intercepting a module import is unreliable here. `lib/Api`'s client is deliberately configured with axios's `fetch` adapter (Section 5) so that mocking the real `global.fetch` global — which needs no hoisting, since it isn't an import — reliably intercepts every HTTP call regardless of transform behavior. A provider that merely re-exposes `lib/Api`'s client (rather than talking HTTP itself) may still use `jest.mock()` on its own direct dependencies if the mock factory closes only over `jest.fn()` values created at module-evaluation time, not on anything import-order-sensitive.

### Backend (Jest + ts-jest + Fastify `inject()` + Prisma/Postgres)

1. **Red**: Write a test against the route using Fastify's `app.inject()` (e.g. `POST /diagnoses`) in `src/backend/test/routes/diagnoses.test.ts`, asserting status code and response shape for the case being added, run it, confirm it fails.
2. **Green**: Implement the route/service/Prisma query needed to pass, as TypeScript (`src/backend/src/routes/diagnoses.ts`, etc.). Use a real test database (separate `DATABASE_URL` pointing at a disposable test Postgres instance, migrated via `prisma migrate deploy` in test setup/teardown) for integration-level endpoint tests. Use a mocked/injected Prisma client only for pure unit tests of service-layer logic that don't need real DB behavior (e.g. scoring rules, verification logic).
3. **Refactor**: Clean up service/route code with tests green throughout.
4. Every new Prisma model or migration is accompanied by at least one test exercising a route or service that uses it — a migration with no corresponding test is incomplete work.
5. `src/backend/test/setup/` owns the test-DB bootstrap (create schema, run migrations, truncate between tests) — new tests reuse this, they don't hand-roll their own DB setup.

General rule: a PR that adds logic with no new/updated test is not reviewable — request tests before reviewing functionality.

---

## 9. CI/CD Expectations

`.github/workflows/ci.yml` runs on every PR and must, in order, fail fast on:
1. Install dependencies (`pnpm install --frozen-lockfile`)
2. Lint (both `src/frontend` and `src/backend` — ESLint is what catches unused vars and bad imports in the absence of a type checker on the frontend; on the backend, the TypeScript compiler itself catches type errors)
3. Unit + integration tests (`pnpm test` at root, fanning out to both workspaces; backend tests run against a Postgres service container in the workflow)
4. Build (`vite build` for frontend; `tsc` compiles backend TypeScript to `src/backend/dist/`)

`.github/workflows/deploy.yml` runs on merge to `main` and must:
1. Re-run the same checks as `ci.yml` (never deploy unverified code)
2. Build Docker images for frontend and backend (`docker build` using each app's `Dockerfile`)
3. Push images to the registry
4. Deploy (to whatever target environment is configured)
5. **Alive-check**: after deploy, hit the deployed backend's `/health` endpoint (and the deployed frontend's root route) and fail the workflow if either doesn't return a healthy response within a defined timeout/retry budget. A deploy is not "done" until the alive-check passes.

Branch protection on `main` requires: `ci.yml` passing, at least one approving review, no direct pushes (Section 1).

---

## 10. Team Engineering Conventions

- **Commit messages**: Conventional Commits style — `type(scope): summary`, e.g. `feat(diagnosis-panel): add treatment selection UI`, `fix(backend/routes): correct 404 on missing patient case`, `test(patient-scene): add hit-testing unit tests`. Types: `feat`, `fix`, `test`, `refactor`, `docs`, `chore`, `ci`. Scope is the component/provider/view folder name (lower-cased in the commit scope is fine even though the folder itself is PascalCase — be consistent within a PR).
- **Branch naming**: `type/short-description` mirroring commit type, e.g. `feat/shop-purchase-flow`, `fix/attention-point-hitbox`.
- **PR size**: keep PRs reviewable — one feature/fix per PR. If a PR touches both `src/frontend` and `src/backend` for one API contract change, that's fine as one PR, but unrelated changes never get bundled together. If a PR is trending past roughly 400 lines of diff (excluding generated/lockfile changes), split it.
- **No direct pushes to `main`** (restated from Section 1) — everything through PRs.
- **CI must be green before merge.** No merging on red or skipped checks.
- **No `--no-verify`, no disabling pre-commit/CI hooks** to force a merge (Section 1).
- **Code review is mandatory** and should be done using the project's `code-review` skill rather than an ad hoc read-through — run it before requesting/finishing human review, and again after addressing feedback.
- **TypeScript is mandatory in `src/backend` and forbidden in `src/frontend`** (Section 1) — reviewers reject any `.ts`/`.tsx` file inside `src/frontend`, and reject any `.js` file (other than tooling config like `vite.config.js` or `jest.config.js`) inside `src/backend/src`.
- **Naming consistency** (restated from Section 6): `PascalCase` view/component folders, `PascalCase` + `Provider` suffix for provider files, `camelCase` `use`-prefixed hooks, `PascalCase` singular Prisma models, `kebab-case` plural backend route files.
- **Ownership boundary**: `src/frontend` and `src/backend` are separate ownership domains. A PR changing the API contract between them must update `docs/api/` in the same PR. Frontend code reaches the backend only via `useApi()` from `src/frontend/src/providers/Api/`, never via direct DB/Prisma access or duplicated route logic.
- **Docs discipline**: architecture-affecting decisions (new domain provider, new external service, schema changes with migration implications) get a short note in `docs/architecture/`. This isn't bureaucracy for its own sake — it's what lets a new contributor or a future Claude session understand *why*, not just *what*.

---

## 11. When Unsure

If a task seems to require breaking any Hard Constraint in Section 1, stop and ask rather than proceeding. If an existing pattern in the codebase already conflicts with this file (e.g. legacy code with `position: absolute` predating this document), flag it and propose a fix rather than copying the pattern into new code.
