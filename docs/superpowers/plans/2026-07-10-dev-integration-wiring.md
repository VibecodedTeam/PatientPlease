# Dev-Merge Wiring & Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish wiring the day-phase feature set (3D patient scene, diagnosis result popup, end-of-day statistics popup, night shop) to their real backend data on branch `feat/Setting-up-MainView` — which is mid-merge with `dev` — so the app builds, every provider talks to the backend exclusively through `useApi()` + `ENDPOINTS`, dead/duplicate code from the merge is removed, and the whole thing is safe to merge into `dev` without regressing it.

**Architecture:** No new architecture — this is a wiring/cleanup pass over an already-decided provider layout (`GameSessionProvider > StatisticsProvider > RoundProvider > ResultsProvider > DocumentTableProvider > MainViewContent`, per Section 5's co-located-provider pattern). Each task either (a) fixes a merge-damaged file back to its intended, already-designed shape, (b) closes a `lib/endpointList.js` gap so a provider stops hardcoding paths, (c) deletes a component the merge duplicated but which nothing renders, (d) repairs an isolated, pre-existing test/implementation mismatch, or (e) corrects a genuine pre-existing architecture-rule violation (an HTTP call that bypasses `useApi()`). No provider changes ownership, no new domain is introduced.

**Tech Stack:** React + Vite frontend (`src/frontend`), Fastify + TypeScript + Prisma backend (`src/backend`), Jest + RTL for frontend tests, pnpm workspaces.

## Revision note (this version)

This revises the first draft after a second, broader code-review pass and user correction:

- **`AuthGate`'s missing header/Logout button is *not* a bug.** Commit `8c13c1d "chore: Deleted Auth Header"` deliberately removed it — it looked bad in the UI. The user name + Logout button now live in `Settings.jsx` (behind the gear icon), which already has its own passing test. The actual defect is that `AuthGate.test.jsx` was never updated after that deliberate change. **Task 2 below is rewritten** to fix the test, not the component. (See `[[feedback_check_git_blame_before_regression_claim]]` — lesson learned: check `git log -p` on a file before calling a behavior change a regression.)
- **Task 3 (`ENDPOINTS.shop`/`inventory` + `NightShopProvider` wiring) is already implemented and verified**, per direct instruction. Left in place below as a record, marked done.
- **A second, broader review pass** covered every remaining frontend component/provider and the entire backend (routes, services, Prisma schema, constants, route registration). Backend came back fully clean. Frontend surfaced one real architecture-rule violation (`PatientSceneProvider` builds its own `axios` client instead of using `useApi()`/native `fetch`) and one cosmetic CSS bug — both added as new tasks.
- **Verification (Task 10) now uses the real seed data** (`src/backend/src/db/seed.ts` — 25 diagnoses, 25 treatments, 30 shop items, 25 full patient/case/document records) via `docker compose` + the seed script, instead of a hand-wavy "smoke test," so wiring is checked against real backend responses, not just mocked-`fetch` unit tests.

## Global Constraints

- No `position: absolute` outside `OverlayPortal` (CLAUDE.md §1.1).
- No cross-domain reach-through; every cross-cutting read goes through a Provider + hook pair (§1.2, §5).
- Only a folder's `index.js` barrel is a valid import path for outsiders (§1.3, §6).
- No production logic without a failing test first (§1.4, §8) — applies to every behavior fix below; does **not** apply to straight reverts of accidental duplication or deletions of confirmed-dead code, since no new behavior is being added there.
- `frontend` never imports from `backend`; the only contract is the HTTP API (§1.5).
- Backend is TypeScript-only, frontend is JavaScript-only (§1.6).
- pnpm only (§1.9).
- Every provider that talks to the **backend** uses `useApi()` (built on `lib/Api/httpClient.js`) and paths from `lib/endpointList.js`'s `ENDPOINTS` — never a hardcoded string, never `jest.mock()` on axios/`lib/Api` in its own tests (§8.6) — mock `global.fetch` instead. (Fetching a same-origin static asset — e.g. a 3D model file served from Vite's `public/` — is not "talking to the backend" and doesn't go through `useApi()`; see Task 7.)
- Frontend tests live only in the mirrored `src/frontend/src/tests/` tree (§1.4, §6).

---

## Part A — System Map (read this before touching anything)

This is the "what talks to what, and what do I get back" reference the tasks below assume. It reflects the repo **as of this investigation** (branch `feat/Setting-up-MainView`, mid-merge with `dev`, after the two flagged git conflicts — `AuthProvider.jsx` and `round_data.json` — were already resolved in a prior session).

### A.1 — MainView provider/render tree (intended shape, currently corrupted in the working tree — see Task 1)

```
<GameSessionProvider>              views/MainView/providers/GameSession/GameSessionProvider.jsx
  <StatisticsProvider>             views/MainView/providers/Statistics/StatisticsProvider.jsx
    <RoundProvider>                views/MainView/providers/Round/RoundProvider.jsx
      <ResultsProvider>            views/MainView/providers/Results/ResultsProvider.jsx
        <DocumentTableProvider>    components/Table/providers/DocumentTable/DocumentTableProvider.jsx
          <MainViewContent>        views/MainView/MainView.jsx
            <PatientSceneProvider><PatientScene documents={round.case.documents}/></PatientSceneProvider>
            <Wall/>  <Table/>  <Settings/>  {ResultPopup if isResultOpen}  {StatisticsPopup if isStatisticsOpen}
```

`MainViewContent` is the only place that calls the hooks; `PatientScene`, `ResultPopup`, `StatisticsPopup`, `Settings` are presentational — they receive everything as props, they don't call `use*()` themselves. That split is correct as designed; don't "fix" it by making them call hooks directly.

### A.2 — Backend endpoint contract, field-by-field, with exact frontend landing spot

All paths below are what `lib/endpointList.js`'s `ENDPOINTS` object contains as of Task 3 (already implemented). `docs/api/*.md` was checked against the actual route/service code and **matches exactly** — no drift found. A second full pass over every backend route, service, and Prisma schema file (Task-3-adjacent review) found **no merge damage, no duplicated logic, no schema drift, no dead or double-registered routes** — the backend needs no fixes in this plan.

| Endpoint | Called from | Response shape (exact) | Frontend landing spot |
|---|---|---|---|
| `POST /api/v1/round` (`ENDPOINTS.round.start`) | `RoundProvider.jsx` on mount | `{ gameSession: {id, money, studentLoanThreshold, consecutiveBadDiagnosisCount, status, createdAt, updatedAt}, ownedItems: [{id, shopItem:{...}, purchasePrice, purchasedOnDay, purchasedAt, isEquipped}], case: {id, difficulty, moneyReward, moneyPenalty, patient:{id,name,age,sex,occupation,portraitImageUrl,bodyModelVariant}, documents:[{id,attentionPointRegion,type,title,documentDate,sortOrder,imageUrl,imageWidthPx,imageHeightPx,imageAltText,content}]}, diagnosisOptions:[{id,code,name,category}], treatmentOptions:[{id,code,name,kind}] }` | `RoundProvider` stores the whole body as `round` (`useRound().round`). `MainView.jsx` reads `round.case.documents` → passed into `<PatientScene documents=.../>`. `ResultsProvider` reads `round.case.moneyReward` / `round.case.moneyPenalty` to compute `moneyDelta`. `Table`/`Information_1` etc. read `round.case.patient`, `round.case.documents` via `DocumentTableProvider`, which narrows `useRound().round` (§5's documented relationship). Errors: 409 `{error:'game_completed'|'no_cases_remaining'}` → `useRound().terminalState==='completed'`; 409 `{error:'game_over'}` → `terminalState==='game_over'` (mapped in `RoundProvider.terminalStateFromError`). |
| `POST /api/v1/game/pause` (`ENDPOINTS.game.pause`) | `GameSessionProvider.jsx` | `{ gameSession: {...same shape as above} }` | `GameSessionProvider` sets its own `isPaused` state from this; does not touch `round`. |
| `POST /api/v1/game/reset` | `GameSessionProvider.jsx` | `{ gameSession: null }` (no session) or `{ gameSession: {...status:'GAME_OVER'} }` | Same — `GameSessionProvider` local state only. |
| `POST /api/v1/day/reset` | `GameSessionProvider.jsx` | `{ gameSession: {...} }` | `GameSessionProvider`. |
| `POST /api/v1/day/end` (`ENDPOINTS.day.end`) | `GameSessionProvider.jsx`'s `endDay()` | `{ gameSession: {..., consecutiveBadDiagnosisCount}, dayLog: {id, dayNumber, startingMoney, endingMoney, casesAttempted, casesCorrect, thresholdMet, penaltyApplied, startedAt, endedAt} }` | `GameSessionProvider.endDay()` returns this; `StatisticsProvider` (which calls `useGameSession()`, so it must be mounted **under** `GameSessionProvider`, which it is) reads `dayLog.casesAttempted/casesCorrect/thresholdMet/penaltyApplied` plus `gameSession.consecutiveBadDiagnosisCount`, and derives a made/lost money split from `dayLog.endingMoney - dayLog.startingMoney` via `internal/derivePlaceholderMoneyBreakdown.js` (the backend only returns one net delta, not separate made/lost figures — that derivation is the only "placeholder" part; the underlying numbers are real). `StatisticsPopup` receives the assembled `statistics` object as a prop from `MainViewContent`'s `useStatistics()`. |
| `GET /api/v1/shop` (`ENDPOINTS.shop.list` — **added and wired, Task 3, done**) | `NightShopProvider.jsx` | `{ isNightPhase, upcomingDayNumber, inventoryCapacity, money, items:[{id,sku,name,description,itemType,price,unlockDay,iconImageUrl,owned}] }` | `NightShopProvider` stores as `catalog`; exposes `items`, `money` via `useNightShop()`. `NightView.jsx`'s inline shop UI renders from these — **not** `components/Shop`, which is dead (Task 4). |
| `POST /api/v1/shop/purchase` (`ENDPOINTS.shop.purchase` — done) | `NightShopProvider.jsx` | `{ gameSession: {...}, ownedItem: {id, shopItem:{...}, purchasePrice, purchasedOnDay, purchasedAt, isEquipped:false} }` | `NightShopProvider.buySelected()` re-fetches the catalog after each purchase; doesn't currently surface `ownedItem` separately. |
| `GET /api/v1/inventory` (`ENDPOINTS.inventory.get` — added, no frontend consumer yet) | none yet | `{ isNightPhase, upcomingDayNumber, inventoryCapacity, equippedItemIds, ownedItems:[{...}] }` | Not consumed by any provider today — out of scope for this plan beyond the `ENDPOINTS` entry for future use. |
| `PUT /api/v1/inventory` (`ENDPOINTS.inventory.update`) | none yet | same shape | — |
| `POST /api/v1/examinations` (no `ENDPOINTS` entry yet; no frontend consumer) | none yet | `{ gameSession: {...}, caseExamination:{id, caseId, shopItemId, isSuccessful, orderedAt} }` — the resulting document only appears in the **next** `POST /api/v1/round` call's `case.documents`, not in this response | Not wired to any UI yet — out of scope for this plan; noted for awareness since `PatientScene`/`Table` will eventually need to trigger this. |
| `GET /auth/me`, `POST /auth/google`, `POST /auth/logout` | `AuthProvider.jsx` | `{user:{id,email,name,avatarUrl}}` / 204 | `AuthProvider`'s `status`/`user`; consumed by `AuthGate.jsx` (gates the route) and `Settings.jsx` (renders the name + owns the Logout button — see Task 2). |

### A.3 — Backend-blocked gap you need to decide on (not a wiring bug — a missing endpoint)

**There is no diagnosis/treatment-submission endpoint anywhere in the backend**, on `dev`, on this branch, or on any other branch checked (`feat/game-pause-settings-dev`, `feat/day-statistics`). `ResultsProvider.jsx` (`views/MainView/providers/Results/ResultsProvider.jsx:15`) judges correctness against a hardcoded `PLACEHOLDER_CORRECT_DIAGNOSIS_ID = 'skin-cancer'` instead of asking the server — the file already has a `TODO(backend)` comment saying exactly this. The money delta itself (`round.case.moneyReward`/`moneyPenalty`) is real. Called out again in Task 9 as a decision point, not silently fixed here — designing a real submission endpoint is its own spec/plan (brainstorming-sized), not a wiring task.

### A.4 — Wiring verdicts (full inventory, updated after the second review pass)

| Area | Verdict | Detail |
|---|---|---|
| `MainView.jsx` | **BROKEN in working tree, fine in git index** | See Task 1 — one-line fix. |
| `PatientScene` (3D rendering) | **Wired correctly** to `RoundProvider` via `round.case.documents` prop from `MainView.jsx` (once Task 1 lands). Its `internal/` helpers (bodyRegions, deriveAttentionRegions, closestSurfacePoint, dodajKropke*, pickDot, screenToNdc) are clean — no merge damage. |
| `PatientSceneProvider.jsx` (loads the `.obj` model file) | **Rule violation** — builds its own `axios` client directly instead of going through `useApi()`, and its test `jest.mock()`s axios instead of mocking `global.fetch`. Fix (Task 7). |
| `MelanomaImagePopup` | **Wired correctly** — used by `PatientScene`, correctly routed through `OverlayPortal` with the required comment. |
| `OverlayPortal`, `ConfirmDialog`, `Wall`, `Login` | **OK** — reviewed in full, no bugs, no `position:absolute/fixed` outside `OverlayPortal`. |
| `components/3DModule` (Model3D/Model3DProvider/useModel3D) | **Dead code** — zero non-test imports. Delete (Task 4). |
| `components/Shop` | **Dead code** — `NightView` uses its own inline shop UI + `NightShopProvider`, not this component. Delete (Task 4). |
| `ResultPopup` + `ResultsProvider` | **Wired correctly** (presentational component, hook called in `MainViewContent`) once Task 1 lands. Correctness logic is the known placeholder from A.3. |
| `StatisticsPopup` + `StatisticsProvider` | **Wired correctly** to real `POST /api/v1/day/end` data once Task 1 lands. |
| `GameSessionProvider` vs `RoundProvider` | **No overlap**, complementary domains (timer/money-session vs case/round payload). Both correctly composed once Task 1 lands; `GameSessionProvider` re-read in full — pause/resume/reset/day-end logic is internally consistent, no merge damage. |
| `AuthGate` | **Not a bug — intentional.** `AuthGate.jsx` deliberately dropped its header (commit `8c13c1d`); the Logout control now lives in `Settings.jsx` (already implemented, already tested, already passing). The defect is `AuthGate.test.jsx`, which was never updated after that change. Fix the test (Task 2, rewritten). |
| `httpClient.js` vs its own test | **Test is stale**, not the implementation — `httpClient.js`'s deliberate `{}`-default-body behavior (documented inline, fixes a real 415-rejection bug) contradicts one test assertion. Fix the test (Task 5). |
| `NightShopProvider` | **Fixed** — now uses `ENDPOINTS.shop.list`/`ENDPOINTS.shop.purchase` instead of hardcoded strings (Task 3, done). |
| `NightView.module.css` `.actionButton` | **Cosmetic bug** — `cursor: default` on the enabled Buy button while every other clickable control in the file uses `cursor: pointer`. Fix (Task 8). |
| `RoundProvider.test.jsx` | **Pre-existing bug, unrelated to this merge** — calls an undefined `lastRequest()` helper that a later rewrite of the test dropped. `lastRequest()` is a test-only helper that reads `global.fetch.mock.calls[...][0]` to get the actual `Request` the code under test sent, so the test can assert its real method/URL. Fix (Task 6). |
| Legacy `src/frontend/views/MainView/RoundProvider.jsx` + `useRound.js` (note: **outside** `src/frontend/src/`) | **Dead pre-restructuring leftover**, and itself a §4 folder-structure violation (nothing outside `src/frontend/src/` should exist except top-level tooling config). Delete (Task 4). |
| CI (`ci.yml`) | **Solid** — lint/test/build + a real docker-compose smoke test with seed verification and Playwright e2e. No changes needed. |
| CD (`deploy.yml`) | **Missing entirely** — CLAUDE.md §9 requires one (build images, push, deploy, alive-check on merge to `main`). Flagged as a decision point (Task 9), not built here — it's an infra initiative, not a wiring fix. |
| Backend (routes, services, Prisma schema, `constants.ts`, `app.ts` registration) | **Clean** — full second-pass review found no duplicated logic, no double-registered routes, no schema drift, no unused constants. `pnpm build`/`pnpm lint` both pass with zero errors. |
| Backend tests | **Not run** — no local Postgres reachable (`P1001` on `localhost:5432`); these run for real in CI's Postgres service container. Task 10 covers running them against a real, seeded database. |
| Frontend test suite, `--maxWorkers=1` | 5 suites / 6 tests genuinely fail (Tasks 1, 2, 5, 6 below account for all of them). At default worker concurrency, 11 additional suites intermittently fail with an esbuild transform error (`Unexpected "{"`) that **disappears entirely at `--maxWorkers=1`** — this is Windows/esbuild-service parallelism flakiness in this local environment, not a code defect. Recommend running local frontend tests with `--maxWorkers=1` (or trusting CI, which runs on Linux) rather than chasing it further. |

---

## Part B — Tasks

### Task 1: Restore `MainView.jsx` from its merge-time corruption

**Files:**
- Modify: `src/frontend/src/views/MainView/MainView.jsx` (working tree only — no test changes needed)

**Interfaces:** None — this restores existing, already-tested behavior. No new exports, no signature changes.

**What happened:** The version staged in git's index (`git show :0:src/frontend/src/views/MainView/MainView.jsx`) is the correct, complete file — `GameSessionProvider > StatisticsProvider > RoundProvider > ResultsProvider > DocumentTableProvider > MainViewContent`, with `MainViewContent` rendering `PatientScene`, `Wall`, `Table`, `Settings`, `ResultPopup`, `StatisticsPopup`. The **working tree** has an extra, unstaged edit layered on top that duplicates large chunks of the file (a second `MainViewContent`, a bare `import` statement pasted mid-function-body, and two extra `export function MainView()` blocks after the first). This is why `MainView.test.jsx`, `AppRoutes.test.jsx` (`GameSessionProvider is not defined` at `MainView.jsx:67`), and any test that mounts `MainView` fail.

- [ ] **Step 1: Confirm the index version is the good one**

Run: `git show :0:src/frontend/src/views/MainView/MainView.jsx | tail -15`
Expected: ends with a single, clean `export function MainView() { return <GameSessionProvider>...</GameSessionProvider>; }` — no second/third `export function MainView`.

- [ ] **Step 2: Restore the working tree from the index**

Run: `git restore src/frontend/src/views/MainView/MainView.jsx`

This discards only the unstaged duplication layer; it does not touch the already-staged merge resolution.

- [ ] **Step 3: Confirm the file is now single-copy and lint-clean**

Run: `pnpm --filter frontend lint -- src/views/MainView/MainView.jsx` (or open the file and confirm exactly one `MainViewContent` function and one `export function MainView`).

- [ ] **Step 4: Run the tests this unblocks**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1 --testPathPattern="MainView.test|AppRoutes.test"`
Expected: all pass (previously: `MainView.test.jsx` failed to run at all; `AppRoutes.test.jsx` had a `GameSessionProvider is not defined` crash and a cascading `location` assertion failure).

- [ ] **Step 5: Commit**

```bash
git add src/frontend/src/views/MainView/MainView.jsx
git commit -m "fix(main-view): remove merge-time duplication that broke the provider tree"
```

---

### Task 2: Fix `AuthGate.test.jsx` — it's stale, not `AuthGate.jsx` (rewritten)

**Files:**
- Modify: `src/frontend/src/tests/components/AuthGate/AuthGate.test.jsx`
- **Do not touch** `src/frontend/src/components/AuthGate/AuthGate.jsx` — its current no-header behavior is intentional (commit `8c13c1d "chore: Deleted Auth Header"`).

**Interfaces:** None — test-only change. `AuthGate` keeps its existing `{googleClientId, children}` props and behavior.

**Root cause (corrected from the first draft of this plan):** `AuthGate.jsx` used to render a header with the user's name and a Logout button; that was deliberately deleted for looking bad in the UI. The Logout control moved to `Settings.jsx` (`views/.../Settings.jsx` — already renders `Logged in as {user.name}` + a `Log out` button wired to `logout()`, already covered by a passing `Settings.test.jsx`). `AuthGate.test.jsx` was never updated after the deletion, so it still asserts the old header exists inside `AuthGate` itself. Two tests are affected:
- `'shows the header and children when authenticated'` (asserts `Test User` text + a Logout button inside `AuthGate`) — the extra assertions no longer apply to this component.
- `'returns to Login after clicking Logout'` — same wrong premise, but the underlying behavior it's protecting (AuthGate correctly falls back to `Login` when something downstream calls `logout()`) is real and worth keeping — it should be tested by having a test-only child invoke `logout()`, not by expecting `AuthGate` to render the button itself.

- [ ] **Step 1: Confirm the current failure**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1 --testPathPattern="AuthGate"`
Expected: FAIL — `Unable to find an element with the text: Test User` and `Unable to find an accessible element with the role "button" and name /logout/i`.

- [ ] **Step 2: Simplify the "shows children when authenticated" test**

In `src/frontend/src/tests/components/AuthGate/AuthGate.test.jsx`, replace the test currently named `'shows the header and children when authenticated'` with:

```jsx
it('renders children when authenticated', async () => {
  renderGate(() =>
    Promise.resolve(new Response(JSON.stringify({ user: USER }), { status: 200 })),
  );

  await waitFor(() => expect(screen.getByText('Protected content')).toBeInTheDocument());
});
```

- [ ] **Step 3: Rewrite "returns to Login after clicking Logout" to exercise a child-triggered logout**

Add `useAuth` to this file's imports: `import { useAuth } from '../../../providers/Auth';`. Replace the test body:

```jsx
it('returns to Login when a child calls logout()', async () => {
  const user = userEvent.setup();
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ user: USER }), { status: 200 }))
    .mockResolvedValueOnce(new Response(null, { status: 204 }));

  function ChildWithLogoutButton() {
    const { logout } = useAuth();
    return (
      <div>
        <div>Protected content</div>
        <button type="button" onClick={() => logout()}>
          Logout
        </button>
      </div>
    );
  }

  render(
    <ApiProvider baseUrl="http://api.test">
      <AuthProvider>
        <AuthGate googleClientId="test-client-id">
          <ChildWithLogoutButton />
        </AuthGate>
      </AuthProvider>
    </ApiProvider>,
  );
  await waitFor(() => expect(screen.getByText('Protected content')).toBeInTheDocument());

  await user.click(screen.getByRole('button', { name: /logout/i }));

  await waitFor(() => expect(screen.getByText('Sign in')).toBeInTheDocument());
});
```

This preserves the real thing worth testing — `AuthGate` re-renders `Login` when auth status flips to unauthenticated — without pretending `AuthGate` itself owns a Logout button (it doesn't; `Settings` does, and that's already covered by `Settings.test.jsx`).

- [ ] **Step 4: Run the suite again**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1 --testPathPattern="AuthGate"`
Expected: PASS, all 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/frontend/src/tests/components/AuthGate/AuthGate.test.jsx
git commit -m "test(auth-gate): stop asserting a header AuthGate deliberately no longer renders"
```

---

### Task 3: Add `ENDPOINTS.shop`/`ENDPOINTS.inventory`, wire `NightShopProvider` to them — ✅ DONE

**Files (already modified and verified):**
- `src/frontend/src/lib/endpointList.js` — added `shop: {list, purchase}` and `inventory: {get, update}`.
- `src/frontend/src/tests/lib/endpointList.test.js` — updated the exact-shape assertion to include both.
- `src/frontend/src/views/NightView/providers/NightShop/NightShopProvider.jsx` — now imports `ENDPOINTS` and uses `ENDPOINTS.shop.list`/`ENDPOINTS.shop.purchase` instead of the hardcoded `'/api/v1/shop'`/`'/api/v1/shop/purchase'` strings.

**Verification already run:** `pnpm test -- --maxWorkers=1 --testPathPattern="endpointList|NightShopProvider"` → 2 suites, 8 tests, all passing. Left in this plan as a record; no further action needed here.

---

### Task 4: Delete confirmed-dead code from the merge

**Files:**
- Delete: `src/frontend/src/components/3DModule/` (entire folder: `Model3D.jsx`, `Model3D.module.css`, `Model3DProvider.jsx`, `useModel3D.js`, any `index.js`)
- Delete: `src/frontend/src/tests/components/3DModule/` (entire folder: `Model3D.test.jsx`, `Model3DProvider.test.jsx`)
- Delete: `src/frontend/src/components/Shop/` (entire folder: `Shop.jsx`, `index.js`, any `.module.css`)
- Delete: `src/frontend/src/tests/components/Shop/Shop.test.jsx`
- Delete: `src/frontend/views/MainView/RoundProvider.jsx` and `src/frontend/views/MainView/useRound.js` (note: **outside** `src/frontend/src/` — this is the stray pre-restructuring path, not the live one under `src/frontend/src/views/MainView/providers/Round/`)

**Interfaces:** None removed that anything live depends on — re-verify with the greps below immediately before deleting, since this plan may be executed some time after the investigation that justified it.

- [ ] **Step 1: Re-confirm zero live imports before deleting anything**

Run each of these from the repo root; every one must return **no matches outside a `tests/` folder for its own component**:

```bash
grep -rn "from '.*3DModule'" src/frontend/src --include="*.jsx" --include="*.js" | grep -v "/tests/"
grep -rn "from '.*components/Shop'" src/frontend/src --include="*.jsx" --include="*.js" | grep -v "/tests/"
grep -rln "round_data\|MainView/RoundProvider'" src/frontend --include="*.jsx" --include="*.js"
```
Expected: first two commands print nothing; the third prints only the two legacy files themselves (nothing importing them).

- [ ] **Step 2: Delete the dead folders/files**

```bash
git rm -r src/frontend/src/components/3DModule
git rm -r src/frontend/src/tests/components/3DModule
git rm -r src/frontend/src/components/Shop
git rm src/frontend/src/tests/components/Shop/Shop.test.jsx
git rm src/frontend/views/MainView/RoundProvider.jsx src/frontend/views/MainView/useRound.js
```

- [ ] **Step 3: Run the full frontend suite to confirm nothing else referenced them**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1`
Expected: same pass/fail counts as before this task (deleting dead code shouldn't change any test outcome) minus the deleted suites' own test counts.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove dead 3DModule/Shop components and legacy pre-restructuring RoundProvider"
```

---

### Task 5: Fix the stale `httpClient.test.js` assertion

**Files:**
- Modify: `src/frontend/src/tests/lib/Api/httpClient.test.js`

**Interfaces:** None — test-only change, no implementation change. `createHttpClient(baseUrl, {withCredentials})` keeps its documented signature.

**Root cause:** `httpClient.js:41-52` deliberately defaults `post`/`put`/`patch`'s `body` param to `{}` rather than `undefined`, with an inline comment explaining why: axios's `fetch` adapter otherwise forces `Content-Type: application/x-www-form-urlencoded` on a truly bodyless request, which this backend's Fastify instance has no parser for (415). One test still asserts the pre-fix behavior (`Content-Type` header should be `null`) and now fails because the fix works as intended (`Content-Type` is `"application/json"`).

- [ ] **Step 1: Read the failing assertion**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1 --testPathPattern="httpClient"`
Expected: FAIL on `expect(received).toBeNull()` / `Received: "application/json"`.

- [ ] **Step 2: Update the test to assert the documented, intentional behavior**

Find the test named `'does not declare a JSON content-type on a POST with no body'` in `src/frontend/src/tests/lib/Api/httpClient.test.js`. Change its title and assertion to match what the code is actually supposed to do:

```js
it('declares a JSON content-type on a POST with no explicit body', async () => {
  global.fetch = jest.fn().mockResolvedValue(new Response('{}', { status: 200 }));

  const client = createHttpClient('http://api.test');
  await client.post('/things');

  const request = global.fetch.mock.calls[0][0];
  expect(request.headers.get('content-type')).toBe('application/json');
});
```

(Adjust variable names to match whatever the surrounding test file already uses for reading request headers from `global.fetch.mock.calls`.)

- [ ] **Step 3: Run it again**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1 --testPathPattern="httpClient"`
Expected: PASS, all tests in the file.

- [ ] **Step 4: Commit**

```bash
git add src/frontend/src/tests/lib/Api/httpClient.test.js
git commit -m "test(http-client): assert the intentional default-body Content-Type behavior"
```

---

### Task 6: Fix `RoundProvider.test.jsx`'s undefined `lastRequest()` helper

**Files:**
- Modify: `src/frontend/src/tests/views/MainView/providers/Round/RoundProvider.test.jsx`

**Interfaces:** None — test-only change.

**Root cause:** An earlier rewrite of this test file (adding the `terminalState`/409 tests) dropped a `lastRequest()` helper that a still-present call site (`const request = lastRequest();`) needs. `lastRequest()` is purely a test utility — it returns `global.fetch.mock.calls[global.fetch.mock.calls.length - 1][0]`, i.e. the `Request` object from the most recent mocked `fetch` call, so the test can assert what method/URL the code under test actually sent. Confirmed pre-existing and unrelated to the current merge by diffing against the `dev`-side version of this file, which has both the helper and the call site.

- [ ] **Step 1: Confirm the failure**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1 --testPathPattern="RoundProvider.test"`
Expected: FAIL — `ReferenceError: lastRequest is not defined`.

- [ ] **Step 2: Add the helper back**

In `src/frontend/src/tests/views/MainView/providers/Round/RoundProvider.test.jsx`, immediately above `describe('RoundProvider', () => {`, add:

```js
function lastRequest() {
  return global.fetch.mock.calls[global.fetch.mock.calls.length - 1][0];
}
```

- [ ] **Step 3: Run it again**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1 --testPathPattern="RoundProvider.test"`
Expected: PASS, all tests in the file.

- [ ] **Step 4: Commit**

```bash
git add src/frontend/src/tests/views/MainView/providers/Round/RoundProvider.test.jsx
git commit -m "test(round-provider): restore the lastRequest() helper dropped by an earlier rewrite"
```

---

### Task 7: Stop `PatientSceneProvider` from building its own `axios` client

**Files:**
- Modify: `src/frontend/src/components/PatientScene/PatientSceneProvider.jsx`
- Modify: `src/frontend/src/tests/components/PatientScene/PatientSceneProvider.test.jsx`

**Interfaces:** None changed externally — `PatientSceneProvider({url, children})` keeps its props; `usePatientScene()` keeps returning `{model, status, error}`.

**Root cause:** `PatientSceneProvider.jsx` imports `axios` directly and calls `axios.get(url, {responseType:'text', transformResponse:[...]})` to fetch a `.obj` 3D model file — bypassing `useApi()` entirely. This is a real CLAUDE.md §5 violation ("the Api domain... is the only place frontend code builds an HTTP client directly"). Its test correspondingly does `jest.mock('axios')`, which §8.6 also disallows.

**Important nuance — don't just swap in `useApi()`:** the `.obj` file is a same-origin static asset served from Vite's `public/` folder (e.g. `/3DModels/FinalBaseMesh.obj`), not a backend API resource. `useApi()`'s client is configured with `baseURL` pointed at the **backend** (`http://localhost:4000` by default) — routing this fetch through it would resolve to the wrong origin and break model loading. The correct fix is to drop `axios` for this one call entirely and use the browser's native `fetch`, which builds no "client" at all — one-off, no violation, and correctly stays same-origin.

- [ ] **Step 1: Confirm the current test still uses the disallowed pattern**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1 --testPathPattern="PatientSceneProvider"`
Expected: PASS today (the violation is architectural, not a failing assertion) — this step is just a baseline before the rewrite.

- [ ] **Step 2: Replace `axios` with native `fetch` in the provider**

In `src/frontend/src/components/PatientScene/PatientSceneProvider.jsx`, remove `import axios from 'axios';` and replace `fetchObjModel`:

```js
/**
 * Fetches a raw .obj model file as plain text via the browser's native fetch —
 * this is a same-origin static asset (Vite's public/ folder), not a backend
 * API call, so it deliberately does not go through useApi()/ENDPOINTS.
 * @param {string} url - path to the .obj file (e.g. a Vite public/ asset path)
 * @returns {Promise<string>} raw .obj file contents
 */
function fetchObjModel(url) {
  return fetch(url).then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to load model: ${response.status}`);
    }
    return response.text();
  });
}
```

- [ ] **Step 3: Rewrite the test to mock `global.fetch` instead of `axios`**

In `src/frontend/src/tests/components/PatientScene/PatientSceneProvider.test.jsx`, remove `import axios from 'axios';` and `jest.mock('axios');`. Replace the two `axios.get` mocks:

```js
it('exposes the parsed model on success', async () => {
  global.fetch = jest.fn().mockResolvedValueOnce(new Response('o Cube\nv 0 0 0\n', { status: 200 }));
  const parsedGroup = { isGroup: true };
  OBJLoader.mockImplementation(() => ({
    parse: jest.fn().mockReturnValue(parsedGroup),
  }));

  render(/* unchanged */);

  expect(screen.getByTestId('status').textContent).toBe('loading');

  await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('success'));
  expect(screen.getByTestId('model').textContent).toBe('has-model');
  expect(global.fetch).toHaveBeenCalledWith('/3DModels/FinalBaseMesh.obj');
});

it('exposes an error when the fetch fails', async () => {
  global.fetch = jest.fn().mockResolvedValueOnce(new Response('not found', { status: 404 }));

  render(/* unchanged */);

  await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('error'));
  expect(screen.getByTestId('error').textContent).toBe('Failed to load model: 404');
  expect(screen.getByTestId('model').textContent).toBe('no-model');
});
```

Keep `jest.mock('three/examples/jsm/loaders/OBJLoader.js');` and the `React.createElement` usage (both unrelated to this fix — the file-level comment about `esbuild-jest` JSX hoisting with `jest.mock()` still applies since `OBJLoader` is still mocked).

- [ ] **Step 4: Run the test again**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1 --testPathPattern="PatientSceneProvider"`
Expected: PASS, all 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/frontend/src/components/PatientScene/PatientSceneProvider.jsx src/frontend/src/tests/components/PatientScene/PatientSceneProvider.test.jsx
git commit -m "fix(patient-scene): fetch the .obj model via native fetch instead of a standalone axios client"
```

---

### Task 8: Fix the Buy button's missing pointer cursor

**Files:**
- Modify: `src/frontend/src/views/NightView/NightView.module.css`

**Interfaces:** None — CSS-only.

**Root cause:** `.actionButton { cursor: default; }` while every other clickable control in this file (`.selectDot`, `.corkboard`, `.card`, etc.) uses `cursor: pointer`. When the Buy button is enabled (selection non-empty, affordable), it should look clickable.

- [ ] **Step 1: Confirm current rule**

Read `src/frontend/src/views/NightView/NightView.module.css`'s `.actionButton` rule and its `.actionButton:disabled` (or similar) rule, to confirm the disabled state has its own `cursor: not-allowed`/`default` override — if so, the base rule is the one to fix, not the disabled one.

- [ ] **Step 2: Change the base rule**

Change `.actionButton { cursor: default; ... }` to `.actionButton { cursor: pointer; ... }`. If a `:disabled` variant doesn't already set `cursor: not-allowed`, add it there instead of leaving the base rule non-interactive-looking.

- [ ] **Step 3: Run NightView's tests**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1 --testPathPattern="NightView"`
Expected: PASS (this is a visual-only CSS Modules class change; no test asserts on `cursor`, so this should be a no-op for the suite — confirms nothing else broke).

- [ ] **Step 4: Commit**

```bash
git add src/frontend/src/views/NightView/NightView.module.css
git commit -m "fix(night-view): show a pointer cursor on the enabled Buy button"
```

---

### Task 9: Decisions needed from you before further work (not implementable as-is)

These two are flagged, not fixed, because each is a scope decision, not a code fix:

1. **Diagnosis-submission endpoint (A.3 above).** `ResultsProvider` currently can't know the real correct diagnosis — there's no backend endpoint anywhere for it. Options: (a) design and build `POST /api/v1/diagnoses` (new backend route + service + Prisma write, TDD per §8's backend workflow, then swap `ResultsProvider`'s placeholder for a real call) as its own plan/spec — this is brainstorming-sized, not a task to fold in here; (b) explicitly accept the placeholder for this integration pass and track it as known debt. Recommend (a) as a follow-up plan once this integration lands, so the "wire results" work isn't blocked on a bigger backend design conversation.
2. **Missing `deploy.yml`.** CLAUDE.md §9 requires one (build+push Docker images, deploy, alive-check against `/health` and the frontend root, on merge to `main`). `ci.yml` is solid; there is simply no deploy workflow at all yet. This is an infra initiative (needs a real deploy target decided) — flag for a separate, explicit follow-up rather than guessing at a deploy target here.

---

### Task 10: Full verification before merging into `dev` — against real seeded data, not just mocks

**Files:** none — verification only.

**Why seeded data, not just unit tests:** every task above is verified with Jest against mocked `global.fetch`, which proves the wiring is *structurally* correct but never proves the app behaves right against real backend responses. `src/backend/src/db/seed.ts` already builds exactly that: 25 diagnoses, 25 treatments, 30 shop items (equipment/handbooks/examinations/plot items), and 25 full `Patient`+`Case`+`CaseDocument`(+`CaseHint`) records with real `moneyReward`/`moneyPenalty`, a `SKIN_IMAGE` document, a history document, and an `EXAMINATION_RESULTS` document per case. Running the app against this seeded data is what actually confirms `RoundProvider` → `PatientScene`/`Table`, `NightShopProvider` → the shop UI, and `StatisticsProvider` → `StatisticsPopup` all render *real* values end to end.

- [ ] **Step 1: Full frontend suite green**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1`
Expected: 0 failed suites, 0 failed tests (Tasks 1/2/5/6/7 account for every currently-known failure/violation; Task 4's deletions remove their own suites cleanly; Task 8 is a non-breaking CSS change).

- [ ] **Step 2: Frontend lint clean**

Run: `cd src/frontend && pnpm lint`

- [ ] **Step 3: Backend build + lint clean** (already confirmed clean; re-run after rebasing/merging with `dev` to catch any new drift)

Run: `cd src/backend && pnpm lint && pnpm build`

- [ ] **Step 4: Bring up the real stack and seed it**

```bash
pnpm docker:up
# once Postgres is healthy:
pnpm --filter backend exec prisma migrate deploy
pnpm --filter backend exec tsx src/db/seed.ts --force
```

- [ ] **Step 5: Backend tests against the real, seeded Postgres**

Run: `cd src/backend && pnpm test`
Expected: passes against the live database (this could not be run during the investigation behind this plan — no local Postgres was reachable at the time).

- [ ] **Step 6: Manual smoke of the day/night loop against real seeded data**

With the stack up and seeded, sign in and confirm, using the actual seeded content (real patient names, real diagnosis/treatment codes, real shop SKUs — not placeholder text):
- The 3D patient scene renders and its documents match the seeded case's `documents` (a real lesion photo + a real history doc + a real `EXAMINATION_RESULTS` doc).
- Submitting a diagnosis opens `ResultPopup` with a real money delta drawn from that case's actual `moneyReward`/`moneyPenalty`.
- "End of shift" transitions into `StatisticsPopup` showing real `casesAttempted`/`casesCorrect` numbers that match how many cases were actually attempted this session.
- Closing statistics navigates to `/night`, and the night shop's catalog shows the 30 real seeded `ShopItem` rows (equipment/handbooks/examinations/plot items) with real prices, and a purchase actually debits `money` and persists as an `OwnedItem`.

- [ ] **Step 7: Only after all of the above are green, merge/rebase against `dev`**

This branch's merge-in-progress already resolved its two flagged conflicts (`AuthProvider.jsx`, `round_data.json`) in a prior session; Tasks 1–8 above fix everything else the merge either silently broke or left inconsistent with CLAUDE.md. Re-run this full verification list once more after the merge commit lands, since `dev` may have moved since this plan was written.
