# Biopsy Minigame New-Tab Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the Punch Biopsy examination's "Order" button so it opens the existing `Excisio` excision-biopsy minigame in a **new browser tab** (no day timer, no Settings there), and once that tab reports a score, decide in the original tab whether the examination actually gets ordered (score ≥ 30) or a "Lab Disaster" popup appears instead (score < 30). Opening the new tab naturally backgrounds the original tab, which triggers the existing tab-hidden auto-pause (`GameSessionProvider`'s `visibilitychange` listener + `MainViewContent` auto-opening Settings) exactly the way switching away to any other tab already does today — that's confirmed as the desired behavior here, not something to suppress. What the feature must still guarantee is that this never leaves the day genuinely stuck: no new artificial time (`addElapsedSeconds`) gets added for this exam, the original tab's React tree is never unmounted/remounted by this feature, and the player can always resume and finish the day normally once they're done with the minigame tab.

**Architecture:** `Phone`'s Order button, for the Punch Biopsy exam only, calls `window.open('/game/main/minigame?shopItemId=...&caseId=...', '_blank')` instead of ordering directly. That new tab is a full fresh mount of the same SPA, routed straight to the existing `MinigameView`, which renders bare `Excisio` (now given an optional `onComplete` prop) with no HUD. When the player finishes, `MinigameView` posts `{type, shopItemId, caseId, score}` to `window.opener` and calls `window.close()`. Back in the **original** tab (which was never touched — its `GameSessionProvider` timer kept ticking the whole time because nothing in it ever unmounted), a new `BiopsyMinigameProvider` — co-located under `MainView`, exactly like `Results`/`Statistics` — listens for that `message` event and either calls `Round`'s `orderExamination` (score ≥ 30, skipping `GameSession`'s `addElapsedSeconds` on purpose) or opens a new `LabDisasterPopup` (score < 30, and nothing is ordered, so Phone can be used to try again).

**Tech Stack:** React + react-router-dom v6.27 (`useSearchParams`), Jest + React Testing Library, CSS Modules, existing `OverlayPortal`/`Round`/`GameSession` domains — no backend changes.

## Global Constraints

- No `position: absolute`/`fixed` outside `components/OverlayPortal/` (Section 1/7 of CLAUDE.md). `LabDisasterPopup` must render through `OverlayPortal`, same as `ResultPopup`.
- No cross-domain reach-through: components only read/mutate another domain's state through that domain's Provider + hook pair (Section 5).
- Every provider/component/view file is a self-contained co-located unit; its test lives at the mirrored path under `src/frontend/src/tests/`, never co-located (Section 6).
- Frontend is JavaScript + JSX only, PropTypes on components, JSDoc where the shape isn't obvious (Section 1).
- No production logic without a failing test first (Section 8) — every task below writes the test before the implementation.
- Any test exercising HTTP mocks `global.fetch` directly, never `jest.mock()` on axios/`lib/Api` (Section 8.6). `jest.mock()` on a plain internal dependency (e.g. a component or hook with no HTTP involvement) is fine and already precedented in this codebase (`tests/AppRoutes.test.jsx` and `tests/views/MainView/MainView.test.jsx` both mock `PatientScene` this way) — but any file that both uses JSX and calls `jest.mock()` must use `React.createElement` instead of JSX in that file, because this repo's `esbuild-jest` transform doesn't hoist `jest.mock()` above `import` statements the way Babel's does. Follow the exact pattern already used in those two files.
- `pnpm` only; run the full suite with the root `pnpm test` (per CLAUDE.md Section 9) before considering any task's regression check complete.
- Commit messages: Conventional Commits (`feat(scope): summary`, `test(scope): summary`), scope = the component/provider folder name.

---

## Why a new tab, and why nothing about `GameSessionProvider`/`AppRoutes.jsx` needs to change

Worth stating up front so the rationale doesn't get lost during execution: because `window.open()` loads the minigame in a **completely separate tab** (a fresh mount of the whole SPA), the original tab's React tree — `MainView`, its `GameSessionProvider`, the 3D scene, everything — is never unmounted, remounted, or navigated away from. There is no shared mount lifecycle between the two tabs to accidentally break, which is what keeps this from ever leaving the day stuck. It also means `GameSessionProvider` stays exactly where it already lives (`views/MainView/providers/GameSession/`) — no relocation, no `AppRoutes.jsx` changes, no risk to the extensively-tested pause/day-over logic in `GameSessionProvider.test.jsx`.

The new tab taking focus does make the original tab's `document.hidden` become `true`, which fires the *existing* `visibilitychange` handling: `GameSessionProvider` pauses the timer and `MainViewContent` auto-opens `Settings` with "Game paused because you left the tab." — confirmed as the intended behavior for this flow, identical to switching to any other tab or app today. No new code is needed to make this happen, and none of the tasks below add or change any pause-related logic. Per that same existing, already-tested design, nothing auto-resumes when focus returns to the original tab (Settings simply stays open until the player clicks Resume) — Task 10's manual walkthrough checks this explicitly.

The two tabs share nothing in memory, so they need an explicit bridge back: `window.opener.postMessage(...)`, validated by origin, carrying the `caseId` so a stale/late message for a case the player has since moved on from is ignored rather than misapplied.

---

## Task 1: Expose `sku` from `ExaminationsProvider`'s examination list

Phone needs to know *which* examination is the Punch Biopsy one so it can route it differently. The backend's shop catalog already returns `sku` per item (`src/backend/src/services/shop.ts:172`) and the existing test fixtures in `ExaminationsProvider.test.jsx`/`Phone.test.jsx` already include it — only the provider's own mapping drops it today.

**Files:**
- Modify: `src/frontend/src/components/Phone/providers/Examinations/ExaminationsProvider.jsx`
- Test: `src/frontend/src/tests/components/Phone/providers/Examinations/ExaminationsProvider.test.jsx`

**Interfaces:**
- Produces: each object in `useExaminations().examinations` now additionally has a `sku` string field (was: `id, name, description, price, owned, timeCostMs`).

- [ ] **Step 1: Write the failing assertion**

In `src/frontend/src/tests/components/Phone/providers/Examinations/ExaminationsProvider.test.jsx`, update the `Probe` component's rendered text to include `exam.sku`, and update the existing assertions to match:

```jsx
function Probe() {
  const { examinations, isLoading, error, order, orderingId, orderError } = useExaminations();
  if (isLoading) return <span>loading</span>;
  if (error) return <span>error</span>;
  return (
    <div>
      <ul>
        {examinations.map((exam) => (
          <li key={exam.id}>
            {exam.name} - {exam.sku} - {exam.price} - {exam.timeCostMs} - {exam.owned ? 'owned' : 'not-owned'}
          </li>
        ))}
      </ul>
      <span data-testid="ordering-id">{orderingId ?? 'none'}</span>
      <span data-testid="order-error">{orderError ? 'error' : 'none'}</span>
      <button onClick={() => order('exam-1')}>order-owned</button>
      <button onClick={() => order('exam-2')}>order-unowned</button>
    </div>
  );
}
```

Use `replace_all` to update every occurrence of the two literal assertion strings in this file:
- `'Punch Biopsy - 140 - 90000 - owned'` → `'Punch Biopsy - exam-punch-biopsy - 140 - 90000 - owned'`
- `'Dermoscopy Imaging - 80 - 30000 - not-owned'` → `'Dermoscopy Imaging - exam-dermoscopy - 80 - 30000 - not-owned'`

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm test -- ExaminationsProvider.test.jsx` (from `src/frontend`, or the equivalent root-level filtered command)
Expected: FAIL — the rendered text is missing `- exam-punch-biopsy -` / `- exam-dermoscopy -` because `sku` isn't in the mapped object yet.

- [ ] **Step 3: Add `sku` to the mapping**

In `src/frontend/src/components/Phone/providers/Examinations/ExaminationsProvider.jsx`, change:

```jsx
  const examinations = useMemo(
    () =>
      (shopCatalog?.items ?? [])
        .filter((item) => item.itemType === 'EXAMINATION')
        .map((item) => ({
          id: item.id, name: item.name, description: item.description,
          price: item.price, owned: item.owned, timeCostMs: item.timeCostMs,
        })),
    [shopCatalog],
  );
```

to:

```jsx
  const examinations = useMemo(
    () =>
      (shopCatalog?.items ?? [])
        .filter((item) => item.itemType === 'EXAMINATION')
        .map((item) => ({
          id: item.id, sku: item.sku, name: item.name, description: item.description,
          price: item.price, owned: item.owned, timeCostMs: item.timeCostMs,
        })),
    [shopCatalog],
  );
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm test -- ExaminationsProvider.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/frontend/src/components/Phone/providers/Examinations/ExaminationsProvider.jsx src/frontend/src/tests/components/Phone/providers/Examinations/ExaminationsProvider.test.jsx
git commit -m "feat(examinations-provider): expose sku on each examination"
```

---

## Task 2: Let `Excisio` report its score via an optional `onComplete` prop

`Excisio` currently takes no props and has no way to report its score, or any "I'm done, let me out" affordance — it only has internal Retry/Next-Level buttons. Add an optional `onComplete(score)` prop and, only when it's provided, a third button on the existing result screen that calls it with the just-computed score. This is purely additive: existing bare `<Excisio />` usage and its whole existing test suite (`tests/components/Excisio/Excisio.test.jsx`) are unaffected.

**Files:**
- Modify: `src/frontend/src/components/Excisio/Excisio.jsx`
- Test: `src/frontend/src/tests/components/Excisio/Excisio.onComplete.test.jsx` (new file)

**Interfaces:**
- Produces: `Excisio` accepts `onComplete?: (score: number) => void`. When provided and the result screen is showing, a button labeled `Zakończ i wyślij wynik` calls `onComplete(ui.result.score)`.

- [ ] **Step 1: Write the failing test**

Create `src/frontend/src/tests/components/Excisio/Excisio.onComplete.test.jsx`:

```jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// esbuild-jest doesn't hoist jest.mock() above imports the way Babel does, so
// this file avoids JSX for the mocked import — see the same convention in
// tests/AppRoutes.test.jsx and tests/views/MainView/MainView.test.jsx.
jest.mock('../../../components/Excisio/useExcisio', () => ({
  useExcisio: jest.fn(),
}));

const { useExcisio } = require('../../../components/Excisio/useExcisio');
const { Excisio } = require('../../../components/Excisio');

const h = React.createElement;

function noopHandlers() {
  return new Proxy({}, { get: () => jest.fn() });
}

function noopRefs() {
  return new Proxy({}, { get: () => ({ current: null }) });
}

function buildUi(overrides) {
  return {
    phase: 'disinfect',
    equipped: null,
    deepCount: 0,
    skinCount: 0,
    disinfectPct: 0,
    creamPct: 0,
    injCount: 0,
    screen: 'play',
    level: 1,
    partName: 'Przedramię',
    cash: 0,
    zoom: 1,
    warn: '',
    redFlash: false,
    revealing: false,
    alarm: false,
    alarmText: '',
    showTray: false,
    showCustomDraw: false,
    plasterColor: '#000000',
    drawColor: '#000000',
    drawThickness: 2,
    showResult: false,
    result: null,
    cheer: false,
    ...overrides,
  };
}

function mockCompletedRun() {
  useExcisio.mockReturnValue({
    ui: buildUi({
      showResult: true,
      result: {
        score: 42,
        tone: '#a78bfa',
        title: 'Wynik',
        msg: 'Podsumowanie',
        money: '21,00 zł',
        disinfect: 80,
        inject: 70,
        excise: 60,
        suture: 50,
        wrong: false,
      },
    }),
    refs: noopRefs(),
    DEEP_NEED: 3,
    SKIN_NEED: 5,
    plasterCards: [],
    toolStatus: () => 'locked',
    handlers: noopHandlers(),
  });
}

describe('Excisio onComplete', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="overlay-root"></div>';
  });

  it('renders a Finish button that reports the score once onComplete is provided', () => {
    mockCompletedRun();
    const onComplete = jest.fn();

    render(h(Excisio, { onComplete }));

    fireEvent.click(screen.getByText('Zakończ i wyślij wynik'));

    expect(onComplete).toHaveBeenCalledWith(42);
  });

  it('does not render a Finish button when onComplete is not provided', () => {
    mockCompletedRun();

    render(h(Excisio, {}));

    expect(screen.queryByText('Zakończ i wyślij wynik')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm test -- Excisio.onComplete.test.jsx`
Expected: FAIL — `Excisio` doesn't accept/use `onComplete` yet, so `screen.getByText('Zakończ i wyślij wynik')` isn't found.

- [ ] **Step 3: Add the prop and button**

In `src/frontend/src/components/Excisio/Excisio.jsx`, change the function signature:

```jsx
export function Excisio() {
```
to:
```jsx
export function Excisio({ onComplete }) {
```

Then change the result screen's action row:

```jsx
            <div className={styles.resultActions}>
              <button type="button" className={styles.retryButton} onClick={handlers.retry}>Powtórz poziom</button>
              <button type="button" className={styles.nextButton} onClick={handlers.nextLevel}>Następny poziom →</button>
            </div>
```
to:
```jsx
            <div className={styles.resultActions}>
              <button type="button" className={styles.retryButton} onClick={handlers.retry}>Powtórz poziom</button>
              <button type="button" className={styles.nextButton} onClick={handlers.nextLevel}>Następny poziom →</button>
              {onComplete && (
                <button
                  type="button"
                  className={styles.nextButton}
                  onClick={() => onComplete(ui.result.score)}
                >
                  Zakończ i wyślij wynik
                </button>
              )}
            </div>
```

Finally, add PropTypes right after `BreakdownColumn.propTypes` (near the bottom of the file):

```jsx
Excisio.propTypes = {
  onComplete: PropTypes.func,
};
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm test -- Excisio.onComplete.test.jsx`
Expected: PASS

- [ ] **Step 5: Run the existing Excisio suite to confirm no regression**

Run: `pnpm test -- Excisio.test.jsx`
Expected: PASS (unchanged — bare `<Excisio />` still renders identically since `onComplete` is optional)

- [ ] **Step 6: Commit**

```bash
git add src/frontend/src/components/Excisio/Excisio.jsx src/frontend/src/tests/components/Excisio/Excisio.onComplete.test.jsx
git commit -m "feat(excisio): report the finished score via an optional onComplete prop"
```

---

## Task 3: Create the `LabDisasterPopup` component

A small, presentational, non-dismissable popup shown when the biopsy minigame's score comes back under the pass threshold — styled like `ConfirmDialog` (the warning-badge, danger-bordered, glowing dialog already used for the "back to start of day"/"back to start of game" confirmations in `Settings`), since both are "something went wrong, here's the consequence" moments, not the paper-styled `ResultPopup` look.

**Files:**
- Create: `src/frontend/src/components/LabDisasterPopup/LabDisasterPopup.jsx`
- Create: `src/frontend/src/components/LabDisasterPopup/LabDisasterPopup.module.css`
- Create: `src/frontend/src/components/LabDisasterPopup/index.js`
- Test: `src/frontend/src/tests/components/LabDisasterPopup/LabDisasterPopup.test.jsx`

**Interfaces:**
- Produces: `LabDisasterPopup({ onClose: () => void })`, exported from `components/LabDisasterPopup`'s barrel.

- [ ] **Step 1: Write the failing test**

Create `src/frontend/src/tests/components/LabDisasterPopup/LabDisasterPopup.test.jsx`:

```jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LabDisasterPopup } from '../../../components/LabDisasterPopup';

describe('LabDisasterPopup', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="overlay-root"></div>';
  });

  it('shows the lab disaster message', () => {
    render(<LabDisasterPopup onClose={jest.fn()} />);

    expect(screen.getByText('Lab Disaster')).toBeInTheDocument();
    expect(screen.getByText(/no results are available/i)).toBeInTheDocument();
  });

  it('calls onClose when Continue is clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<LabDisasterPopup onClose={onClose} />);

    await user.click(screen.getByText('Continue'));

    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm test -- LabDisasterPopup.test.jsx`
Expected: FAIL — `components/LabDisasterPopup` doesn't exist yet.

- [ ] **Step 3: Create the component**

Create `src/frontend/src/components/LabDisasterPopup/LabDisasterPopup.jsx`:

```jsx
import React from 'react';
import PropTypes from 'prop-types';
import { OverlayPortal } from '../OverlayPortal';
import styles from './LabDisasterPopup.module.css';

/**
 * Shown instead of the normal examination result when the excision-biopsy
 * minigame (components/Excisio, run in its own browser tab — see
 * views/MinigameView) finishes with a score below the pass threshold. Styled
 * like ConfirmDialog (components/ConfirmDialog) — the same warning-badge,
 * danger-bordered, glowing dialog already used for the "back to start of
 * day"/"back to start of game" confirmations — since both are "something
 * went wrong, here's the consequence" moments. No findings document is
 * ordered for a failed attempt (see views/MainView/providers/BiopsyMinigame),
 * so Phone can be used to try again.
 * @param {{ onClose: () => void }} props
 */
export function LabDisasterPopup({ onClose }) {
  return (
    // overlay-portal: result must render above the day-phase screen and any open
    // Settings popup, matching ConfirmDialog's own stacking; no onDismiss —
    // acknowledging the failed sample is a deliberate action, so it must only happen
    // via the explicit Continue button, never a backdrop click or Escape.
    <OverlayPortal>
      <div className={styles.dialog}>
        <div className={styles.warningBadge} aria-hidden="true">
          ⚠
        </div>
        <h2 className={styles.title}>Lab Disaster</h2>
        <p className={styles.message}>
          The tissue sample was compromised during processing. No results are available for this
          test.
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.button} onClick={onClose}>
            Continue
          </button>
        </div>
      </div>
    </OverlayPortal>
  );
}

LabDisasterPopup.propTypes = {
  onClose: PropTypes.func.isRequired,
};
```

Create `src/frontend/src/components/LabDisasterPopup/LabDisasterPopup.module.css` (mirrors `ConfirmDialog.module.css` — same badge/border/glow — collapsed to a single acknowledge button instead of a Confirm/Cancel pair):

```css
@keyframes disasterEnter {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes disasterGlow {
  0%,
  100% {
    box-shadow: var(--shadow-panel), 0 0 0 rgba(224, 87, 90, 0);
  }
  50% {
    box-shadow: var(--shadow-panel), 0 0 18px rgba(224, 87, 90, 0.55);
  }
}

.dialog {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  max-width: 320px;
  padding: 1.75rem;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-danger);
  border-radius: 0.75rem;
  box-shadow: var(--shadow-panel);
  color: var(--color-text);
  text-align: center;
  animation: disasterEnter 0.16s ease-out, disasterGlow 1.4s ease-in-out 0.16s 2;
}

.warningBadge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 50%;
  border: 1px solid var(--color-danger);
  background: rgba(224, 87, 90, 0.12);
  color: var(--color-danger);
  font-size: 1.2rem;
}

.title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-danger);
}

.message {
  margin: 0;
  line-height: 1.4;
}

.actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

.button {
  padding: 0.55rem 1.1rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-danger);
  background: var(--color-danger);
  color: #1a1220;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.9rem;
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.1s ease;
}

.button:hover {
  background: var(--color-danger-hover);
}

.button:active {
  transform: scale(0.97);
}
```

Create `src/frontend/src/components/LabDisasterPopup/index.js`:

```js
export { LabDisasterPopup } from './LabDisasterPopup';
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm test -- LabDisasterPopup.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/frontend/src/components/LabDisasterPopup src/frontend/src/tests/components/LabDisasterPopup
git commit -m "feat(lab-disaster-popup): add popup shown when a biopsy minigame attempt fails"
```

---

## Task 4: Create the `BiopsyMinigame` domain provider

Owns whether the Lab Disaster popup is open, and is the one place that listens for the `postMessage` the minigame tab sends back, deciding what happens with the result. Co-located under `MainView` (same pattern as `Results`/`Statistics`/`GameSession`) since it's consumed only there.

**Files:**
- Create: `src/frontend/src/views/MainView/providers/BiopsyMinigame/BiopsyMinigameProvider.jsx`
- Create: `src/frontend/src/views/MainView/providers/BiopsyMinigame/useBiopsyMinigame.js`
- Create: `src/frontend/src/views/MainView/providers/BiopsyMinigame/index.js`
- Test: `src/frontend/src/tests/views/MainView/providers/BiopsyMinigame/BiopsyMinigameProvider.test.jsx`

**Interfaces:**
- Consumes: `useRound()` → `round`, `orderExamination(caseId, shopItemId)`, `refreshRound()`.
- Produces: `useBiopsyMinigame()` → `{ isLabDisasterOpen: boolean, closeLabDisaster: () => void }`, exported from `views/MainView/providers/BiopsyMinigame`'s barrel. Internally reacts to `window` `message` events shaped `{ type: 'biopsy-minigame-result', shopItemId, caseId, score }`.

- [ ] **Step 1: Write the failing test**

Create `src/frontend/src/tests/views/MainView/providers/BiopsyMinigame/BiopsyMinigameProvider.test.jsx`:

```jsx
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiProvider } from '../../../../../providers/Api';
import { RoundProvider } from '../../../../../providers/Round';
import {
  BiopsyMinigameProvider,
  useBiopsyMinigame,
} from '../../../../../views/MainView/providers/BiopsyMinigame';

const ROUND = {
  gameSession: { id: 'gs1', money: 100, status: 'ACTIVE' },
  ownedItems: [],
  case: { id: 'case-1', patient: { id: 'p1' }, documents: [] },
  diagnosisOptions: [],
  treatmentOptions: [],
};

function Probe() {
  const { isLabDisasterOpen, closeLabDisaster } = useBiopsyMinigame();
  return (
    <div>
      <span data-testid="lab-disaster">{String(isLabDisasterOpen)}</span>
      <button onClick={closeLabDisaster}>close</button>
    </div>
  );
}

function postResult(payload, origin = window.location.origin) {
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { origin, data: payload }));
  });
}

function mockRoundAndExamFetch(examinationResponseFactory) {
  return jest.fn().mockImplementation((request) => {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/api/v1/round') {
      return Promise.resolve(new Response(JSON.stringify(ROUND), { status: 200 }));
    }
    if (pathname === '/api/v1/examinations') {
      return examinationResponseFactory(request);
    }
    return Promise.resolve(new Response('{}', { status: 200 }));
  });
}

function renderProvider() {
  return render(
    <ApiProvider baseUrl="http://api.test">
      <RoundProvider>
        <BiopsyMinigameProvider>
          <Probe />
        </BiopsyMinigameProvider>
      </RoundProvider>
    </ApiProvider>,
  );
}

describe('BiopsyMinigameProvider', () => {
  it('opens the lab disaster flag on a score below 30, without calling the examinations endpoint', async () => {
    global.fetch = mockRoundAndExamFetch(() =>
      Promise.resolve(new Response(JSON.stringify({ gameSession: {} }), { status: 200 })),
    );
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('lab-disaster').textContent).toBe('false'));

    postResult({ type: 'biopsy-minigame-result', shopItemId: 'exam-1', caseId: 'case-1', score: 10 });

    expect(screen.getByTestId('lab-disaster').textContent).toBe('true');
    const examinationRequest = global.fetch.mock.calls
      .map(([request]) => request)
      .find((request) => new URL(request.url).pathname === '/api/v1/examinations');
    expect(examinationRequest).toBeUndefined();
  });

  it('orders the examination on a score of 30 or above, without opening the lab disaster flag', async () => {
    global.fetch = mockRoundAndExamFetch(() =>
      Promise.resolve(
        new Response(JSON.stringify({ gameSession: {}, caseExamination: { id: 'ce1' } }), {
          status: 200,
        }),
      ),
    );
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('lab-disaster').textContent).toBe('false'));

    postResult({ type: 'biopsy-minigame-result', shopItemId: 'exam-1', caseId: 'case-1', score: 80 });

    await waitFor(() => {
      const examinationRequest = global.fetch.mock.calls
        .map(([request]) => request)
        .find((request) => new URL(request.url).pathname === '/api/v1/examinations');
      expect(examinationRequest).toBeDefined();
    });
    const examinationRequest = global.fetch.mock.calls
      .map(([request]) => request)
      .find((request) => new URL(request.url).pathname === '/api/v1/examinations');
    expect(await examinationRequest.clone().json()).toEqual({ caseId: 'case-1', shopItemId: 'exam-1' });
    expect(screen.getByTestId('lab-disaster').textContent).toBe('false');
  });

  it('ignores a result for a case that is no longer the active one', async () => {
    global.fetch = mockRoundAndExamFetch(() =>
      Promise.resolve(new Response(JSON.stringify({ gameSession: {} }), { status: 200 })),
    );
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('lab-disaster').textContent).toBe('false'));

    postResult({ type: 'biopsy-minigame-result', shopItemId: 'exam-1', caseId: 'some-other-case', score: 5 });

    expect(screen.getByTestId('lab-disaster').textContent).toBe('false');
  });

  it('ignores messages from another origin', async () => {
    global.fetch = mockRoundAndExamFetch(() =>
      Promise.resolve(new Response(JSON.stringify({ gameSession: {} }), { status: 200 })),
    );
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('lab-disaster').textContent).toBe('false'));

    postResult(
      { type: 'biopsy-minigame-result', shopItemId: 'exam-1', caseId: 'case-1', score: 5 },
      'https://evil.example.com',
    );

    expect(screen.getByTestId('lab-disaster').textContent).toBe('false');
  });

  it('closeLabDisaster resets the flag', async () => {
    const user = userEvent.setup();
    global.fetch = mockRoundAndExamFetch(() =>
      Promise.resolve(new Response(JSON.stringify({ gameSession: {} }), { status: 200 })),
    );
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('lab-disaster').textContent).toBe('false'));

    postResult({ type: 'biopsy-minigame-result', shopItemId: 'exam-1', caseId: 'case-1', score: 10 });
    expect(screen.getByTestId('lab-disaster').textContent).toBe('true');

    await user.click(screen.getByText('close'));
    expect(screen.getByTestId('lab-disaster').textContent).toBe('false');
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm test -- BiopsyMinigameProvider.test.jsx`
Expected: FAIL — `views/MainView/providers/BiopsyMinigame` doesn't exist yet.

- [ ] **Step 3: Create the provider**

Create `src/frontend/src/views/MainView/providers/BiopsyMinigame/BiopsyMinigameProvider.jsx`:

```jsx
import React, { createContext, useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useRound } from '../../../../providers/Round';

export const BiopsyMinigameContext = createContext(null);

const RESULT_MESSAGE_TYPE = 'biopsy-minigame-result';
const LAB_DISASTER_SCORE_THRESHOLD = 30;

/**
 * Receives the excision-biopsy minigame's result from the separate browser
 * tab Phone opens for the Punch Biopsy examination (see components/Phone and
 * views/MinigameView) via `postMessage`, and decides what the player sees for
 * it. Ordering this exam never goes through GameSession's addElapsedSeconds
 * the way other examinations do (see ExaminationsProvider.order) — this tab's
 * own day timer never stopped running while the minigame tab was open, so no
 * artificial time bump is needed. The real examination is only submitted
 * (Round's orderExamination) once the player finishes with a passing score; a
 * failed attempt costs nothing, so Phone can be used to try again.
 */
export function BiopsyMinigameProvider({ children }) {
  const { round, orderExamination, refreshRound } = useRound();
  const [isLabDisasterOpen, setIsLabDisasterOpen] = useState(false);

  useEffect(() => {
    function handleMessage(event) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== RESULT_MESSAGE_TYPE) return;
      const { shopItemId, caseId, score } = event.data;
      // A stale/late result for a case that's no longer active (e.g. the
      // player finished the current case and moved on while the minigame tab
      // was still open) is ignored rather than misapplied to the new case.
      if (caseId !== round?.case?.id) return;

      if (score < LAB_DISASTER_SCORE_THRESHOLD) {
        setIsLabDisasterOpen(true);
        return;
      }
      // Tolerates an "already ordered" rejection (e.g. two minigame tabs
      // finishing in quick succession) the same way ExaminationsProvider.order
      // already does — there's no UI surface here to show that error on.
      orderExamination(caseId, shopItemId)
        .then(() => refreshRound())
        .catch(() => {});
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [round, orderExamination, refreshRound]);

  const closeLabDisaster = useCallback(() => {
    setIsLabDisasterOpen(false);
  }, []);

  const value = { isLabDisasterOpen, closeLabDisaster };

  return <BiopsyMinigameContext.Provider value={value}>{children}</BiopsyMinigameContext.Provider>;
}

BiopsyMinigameProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
```

Create `src/frontend/src/views/MainView/providers/BiopsyMinigame/useBiopsyMinigame.js`:

```js
import { useContext } from 'react';
import { BiopsyMinigameContext } from './BiopsyMinigameProvider';

export function useBiopsyMinigame() {
  const context = useContext(BiopsyMinigameContext);
  if (!context) {
    throw new Error('useBiopsyMinigame must be used within a BiopsyMinigameProvider');
  }
  return context;
}
```

Create `src/frontend/src/views/MainView/providers/BiopsyMinigame/index.js`:

```js
export { BiopsyMinigameProvider } from './BiopsyMinigameProvider';
export { useBiopsyMinigame } from './useBiopsyMinigame';
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm test -- BiopsyMinigameProvider.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/frontend/src/views/MainView/providers/BiopsyMinigame src/frontend/src/tests/views/MainView/providers/BiopsyMinigame
git commit -m "feat(biopsy-minigame): add provider that resolves the minigame tab's postMessage result"
```

---

## Task 5: Update `MinigameView` to read the exam from the URL and report back via `postMessage`

Today `MinigameView` is a one-line wrapper around bare `<Excisio />`. It needs to read `shopItemId`/`caseId` from its own URL's query string (since it's a fresh tab with no shared React state) and, once `Excisio` reports a score, tell whichever tab opened it and close itself. No day timer, no Settings — this tab renders nothing but `Excisio`.

**Files:**
- Modify: `src/frontend/src/views/MinigameView/MinigameView.jsx`
- Modify: `src/frontend/src/tests/views/MinigameView/MinigameView.test.jsx`
- Test: `src/frontend/src/tests/views/MinigameView/MinigameView.result.test.jsx` (new file)

**Interfaces:**
- Consumes: `Excisio`'s `onComplete` prop (Task 2).
- Produces: on completion, posts `window.opener.postMessage({ type: 'biopsy-minigame-result', shopItemId, caseId, score }, window.location.origin)` and calls `window.close()`. This message shape is exactly what `BiopsyMinigameProvider` (Task 4) listens for.

- [ ] **Step 1: Update the existing render test (it now needs a Router)**

`MinigameView` will call `useSearchParams()`, which requires a Router ancestor. Replace `src/frontend/src/tests/views/MinigameView/MinigameView.test.jsx` with:

```jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { MinigameView } from '../../../views/MinigameView';

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/game/main/minigame" element={<MinigameView />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MinigameView', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div><div id="overlay-root"></div>';
  });

  it('renders the Excisio minigame', () => {
    renderAt('/game/main/minigame?shopItemId=exam-1&caseId=case-1');

    expect(screen.getByRole('heading', { name: /technika biopsji wycinającej/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Write the failing result-reporting test**

Create `src/frontend/src/tests/views/MinigameView/MinigameView.result.test.jsx`:

```jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// esbuild-jest doesn't hoist jest.mock() above imports the way Babel does —
// this file avoids JSX for the mocked import, matching the same workaround in
// tests/AppRoutes.test.jsx and tests/views/MainView/MainView.test.jsx.
jest.mock('../../../components/Excisio', () => ({
  Excisio: ({ onComplete }) =>
    require('react').createElement('button', { onClick: () => onComplete(80) }, 'fake-finish'),
}));

const { MinigameView } = require('../../../views/MinigameView');

const h = React.createElement;

describe('MinigameView result reporting', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div><div id="overlay-root"></div>';
    window.close = jest.fn();
    Object.defineProperty(window, 'opener', {
      configurable: true,
      value: { postMessage: jest.fn() },
    });
  });

  it('posts the score to window.opener and closes the tab once Excisio completes', async () => {
    const user = userEvent.setup();
    render(
      h(
        MemoryRouter,
        { initialEntries: ['/game/main/minigame?shopItemId=exam-1&caseId=case-1'] },
        h(Routes, null, h(Route, { path: '/game/main/minigame', element: h(MinigameView) })),
      ),
    );

    await user.click(screen.getByText('fake-finish'));

    expect(window.opener.postMessage).toHaveBeenCalledWith(
      { type: 'biopsy-minigame-result', shopItemId: 'exam-1', caseId: 'case-1', score: 80 },
      window.location.origin,
    );
    expect(window.close).toHaveBeenCalled();
  });

  it('does not throw when there is no window.opener (e.g. direct navigation)', async () => {
    Object.defineProperty(window, 'opener', { configurable: true, value: null });
    const user = userEvent.setup();
    render(
      h(
        MemoryRouter,
        { initialEntries: ['/game/main/minigame?shopItemId=exam-1&caseId=case-1'] },
        h(Routes, null, h(Route, { path: '/game/main/minigame', element: h(MinigameView) })),
      ),
    );

    await user.click(screen.getByText('fake-finish'));

    expect(window.close).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run both new/updated tests and confirm they fail**

Run: `pnpm test -- MinigameView.test.jsx MinigameView.result.test.jsx`
Expected: FAIL — `MinigameView` doesn't read query params, doesn't accept/wire `onComplete`, doesn't call `postMessage`/`close`.

- [ ] **Step 4: Update `MinigameView`**

Replace `src/frontend/src/views/MinigameView/MinigameView.jsx` with:

```jsx
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Excisio } from '../../components/Excisio';

const RESULT_MESSAGE_TYPE = 'biopsy-minigame-result';

/**
 * Full-screen route for the excision-biopsy minigame, reached at
 * /game/main/minigame in a NEW browser tab opened by Phone's Punch Biopsy
 * Order button (see components/Phone) — deliberately a separate tab, not an
 * in-app navigation, so the day timer and the rest of MainView keep running
 * completely untouched in the original tab while this one plays out. No day
 * timer or Settings render here; this tab's only job is to run Excisio and
 * report the result back to whichever tab opened it (see
 * views/MainView/providers/BiopsyMinigame, which listens for it).
 */
export function MinigameView() {
  const [searchParams] = useSearchParams();
  const shopItemId = searchParams.get('shopItemId');
  const caseId = searchParams.get('caseId');

  function handleComplete(score) {
    if (window.opener) {
      window.opener.postMessage(
        { type: RESULT_MESSAGE_TYPE, shopItemId, caseId, score },
        window.location.origin,
      );
    }
    window.close();
  }

  return <Excisio onComplete={handleComplete} />;
}
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `pnpm test -- MinigameView.test.jsx MinigameView.result.test.jsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/frontend/src/views/MinigameView src/frontend/src/tests/views/MinigameView
git commit -m "feat(minigame-view): read the pending exam from the URL and report the score back via postMessage"
```

---

## Task 6: Update `Phone` to open the biopsy minigame in a new tab

Phone's Order button currently always calls `order(exam.id)` immediately. For the Punch Biopsy exam specifically, it should instead open the minigame tab (carrying `shopItemId`/`caseId` in the URL) and close its own popup. Every other examination keeps its existing immediate-order behavior untouched.

**Files:**
- Modify: `src/frontend/src/components/Phone/Phone.jsx`
- Modify: `src/frontend/src/tests/components/Phone/Phone.test.jsx`

**Interfaces:**
- Consumes: `exam.sku` (Task 1), `useRound().round.case.id`, the global `window.open`.
- Produces: for `exam.sku === 'exam-punch-biopsy'`, clicking "Order" calls `window.open('/game/main/minigame?shopItemId=<id>&caseId=<caseId>', '_blank')` and, if that succeeded, `onCancel()` — it does **not** call `order(exam.id)`.

- [ ] **Step 1: Write the failing tests and update fixtures**

Replace `src/frontend/src/tests/components/Phone/Phone.test.jsx` with:

```jsx
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiProvider } from '../../../providers/Api';
import { RoundProvider } from '../../../providers/Round';
import { GameSessionProvider } from '../../../views/MainView/providers/GameSession';
import { ExaminationsProvider } from '../../../components/Phone/providers/Examinations';
import { Phone } from '../../../components/Phone';

const CATALOG = {
  money: 100,
  items: [
    {
      id: 'exam-1',
      sku: 'exam-punch-biopsy',
      name: 'Punch Biopsy',
      description: 'A small tissue sample sent to pathology for a definitive histological read.',
      itemType: 'EXAMINATION',
      price: 140,
      timeCostMs: 90000,
      unlockDay: null,
      iconImageUrl: null,
      owned: true,
    },
    {
      id: 'exam-2',
      sku: 'exam-dermoscopy',
      name: 'Dermoscopy Imaging',
      description: 'Magnified, polarized imaging.',
      itemType: 'EXAMINATION',
      price: 80,
      timeCostMs: 30000,
      unlockDay: null,
      iconImageUrl: null,
      owned: false,
    },
    {
      id: 'exam-3',
      sku: 'exam-skin-swab',
      name: 'Skin Swab Culture',
      description: 'A surface swab cultured to check for a bacterial or fungal cause.',
      itemType: 'EXAMINATION',
      price: 60,
      timeCostMs: 20000,
      unlockDay: null,
      iconImageUrl: null,
      owned: true,
    },
  ],
};

const ROUND = {
  gameSession: { id: 'gs1', money: 100, status: 'ACTIVE' },
  ownedItems: [],
  case: { id: 'case-1', patient: { id: 'p1', name: 'Jordan Ellis', age: 52 }, documents: [] },
  diagnosisOptions: [],
  treatmentOptions: [],
};

function mockRoundAndShopFetch(otherResponseFactory) {
  return jest.fn().mockImplementation((request) => {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/api/v1/round') {
      return Promise.resolve(new Response(JSON.stringify(ROUND), { status: 200 }));
    }
    if (pathname === '/api/v1/shop') {
      return Promise.resolve(new Response(JSON.stringify(CATALOG), { status: 200 }));
    }
    return otherResponseFactory(request);
  });
}

function renderPhone(onCancel = jest.fn()) {
  return render(
    <ApiProvider baseUrl="http://api.test">
      <RoundProvider>
        <GameSessionProvider>
          <ExaminationsProvider>
            <Phone onCancel={onCancel} />
          </ExaminationsProvider>
        </GameSessionProvider>
      </RoundProvider>
    </ApiProvider>,
  );
}

function rowFor(text) {
  return screen.getByText(text).closest('div');
}

describe('Phone', () => {
  beforeEach(() => {
    window.open = jest.fn(() => ({}));
    global.fetch = mockRoundAndShopFetch(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            gameSession: { money: 100 },
            caseExamination: { id: 'ce1' },
            timeCostMs: 90000,
          }),
          { status: 200 },
        ),
      ),
    );
  });

  it('renders English copy with the real patient, not the old Polish/hardcoded copy', async () => {
    renderPhone();

    expect(screen.getByRole('heading', { name: 'Order laboratory tests' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Punch Biopsy')).toBeInTheDocument());
    expect(screen.getByText('Jordan Ellis', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('52', { exact: false })).toBeInTheDocument();

    expect(screen.queryByText('Zleć badania')).not.toBeInTheDocument();
    expect(screen.queryByText(/Anna Kowalska/)).not.toBeInTheDocument();
  });

  it('shows the time cost (not price) as the emphasized action cost for an owned examination', async () => {
    renderPhone();
    await waitFor(() => screen.getByText('Punch Biopsy'));

    expect(screen.getByText('+90s')).toBeInTheDocument();
  });

  it('disables an unowned examination with an English "buy at night" hint', async () => {
    renderPhone();
    await waitFor(() => screen.getByText('Dermoscopy Imaging'));

    expect(screen.getByText(/buy at the night shop to unlock/i)).toBeInTheDocument();
    // Two owned rows (Punch Biopsy, Skin Swab Culture) each expose an Order button.
    const orderButtons = screen.getAllByRole('button', { name: 'Order' });
    expect(orderButtons).toHaveLength(2);
  });

  it('clicking Order on a non-biopsy owned examination still calls the examinations endpoint directly', async () => {
    const user = userEvent.setup();
    renderPhone();
    await waitFor(() => screen.getByText('Skin Swab Culture'));

    await user.click(within(rowFor('Skin Swab Culture')).getByRole('button', { name: 'Order' }));

    await waitFor(() => {
      const examinationRequest = global.fetch.mock.calls
        .map(([request]) => request)
        .find((request) => new URL(request.url).pathname === '/api/v1/examinations');
      expect(examinationRequest).toBeDefined();
    });
    expect(window.open).not.toHaveBeenCalled();
    // Let the full order() chain (addElapsedSeconds + refreshRound) settle
    // before the test ends, so no state update lands after unmount.
    await waitFor(() =>
      expect(within(rowFor('Skin Swab Culture')).getByRole('button', { name: 'Order' })).toBeEnabled(),
    );
  });

  it('shows a pending state on the row being ordered directly', async () => {
    let resolveOrder;
    global.fetch = mockRoundAndShopFetch(
      () =>
        new Promise((resolve) => {
          resolveOrder = () =>
            resolve(
              new Response(
                JSON.stringify({
                  gameSession: { money: 100 },
                  caseExamination: { id: 'ce1' },
                  timeCostMs: 20000,
                }),
                { status: 200 },
              ),
            );
        }),
    );
    const user = userEvent.setup();
    renderPhone();
    await waitFor(() => screen.getByText('Skin Swab Culture'));

    await user.click(within(rowFor('Skin Swab Culture')).getByRole('button', { name: 'Order' }));

    await waitFor(() =>
      expect(within(rowFor('Skin Swab Culture')).getByRole('button', { name: 'Ordering…' })).toBeDisabled(),
    );
    resolveOrder();
    await waitFor(() =>
      expect(within(rowFor('Skin Swab Culture')).getByRole('button', { name: 'Order' })).toBeEnabled(),
    );
  });

  it('clicking Order on Punch Biopsy opens the minigame in a new tab and closes Phone, without ordering directly', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    renderPhone(onCancel);
    await waitFor(() => screen.getByText('Punch Biopsy'));

    await user.click(within(rowFor('Punch Biopsy')).getByRole('button', { name: 'Order' }));

    expect(window.open).toHaveBeenCalledWith(
      '/game/main/minigame?shopItemId=exam-1&caseId=case-1',
      '_blank',
    );
    expect(onCancel).toHaveBeenCalled();
    const examinationRequest = global.fetch.mock.calls
      .map(([request]) => request)
      .find((request) => new URL(request.url).pathname === '/api/v1/examinations');
    expect(examinationRequest).toBeUndefined();
  });

  it('calls onCancel when the close (X) button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    renderPhone(onCancel);
    await waitFor(() => screen.getByText('Punch Biopsy'));

    await user.click(screen.getByRole('button', { name: /^close$/i }));

    expect(onCancel).toHaveBeenCalled();
  });

  it('renders a neutral header when there is no active-case patient', async () => {
    global.fetch = jest.fn().mockImplementation((request) => {
      const pathname = new URL(request.url).pathname;
      if (pathname === '/api/v1/round') {
        return Promise.resolve(
          new Response(JSON.stringify({ gameSession: { money: 100 }, case: null }), { status: 200 }),
        );
      }
      return Promise.resolve(new Response(JSON.stringify(CATALOG), { status: 200 }));
    });
    renderPhone();

    expect(screen.getByRole('heading', { name: 'Order laboratory tests' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Punch Biopsy')).toBeInTheDocument());
    expect(screen.queryByText(/Patient:/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests and confirm the new/changed ones fail**

Run: `pnpm test -- Phone.test.jsx`
Expected: FAIL — `window.open` is never called yet, and the "disables an unowned examination" row-count assertion doesn't match the old behavior either (Phone hasn't branched on sku yet, so clicking Punch Biopsy's Order still hits the endpoint directly and `window.open` is never called).

- [ ] **Step 3: Update `Phone.jsx`**

Replace `src/frontend/src/components/Phone/Phone.jsx` with:

```jsx
import React from 'react';
import PropTypes from 'prop-types';
import styles from './Phone.module.css';
import { useExaminations } from './providers/Examinations';
import { useRound } from '../../providers/Round';

const PUNCH_BIOPSY_SKU = 'exam-punch-biopsy';

export function Phone({ onCancel }) {
  const { examinations, isLoading, error, order, orderingId, orderError } = useExaminations();
  const { round } = useRound();
  const patient = round?.case?.patient;

  function handleOrder(exam) {
    if (exam.sku === PUNCH_BIOPSY_SKU) {
      const params = new URLSearchParams({ shopItemId: exam.id, caseId: round?.case?.id ?? '' });
      const opened = window.open(`/game/main/minigame?${params.toString()}`, '_blank');
      if (opened) onCancel();
      return;
    }
    order(exam.id);
  }

  return (
    <div className={styles.phone}>
      <div className={styles.header}>
        <div className={styles.headerIcon} aria-hidden="true">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.2-3.2" />
            <circle cx="11" cy="11" r="2.6" />
          </svg>
        </div>
        <div className={styles.headerText}>
          <h3 className={styles.title}>Order laboratory tests</h3>
          {patient && (
            <p className={styles.patientLine}>
              Patient: <strong>{patient.name}</strong> · {patient.age}
            </p>
          )}
        </div>
        <button type="button" className={styles.closeButton} aria-label="Close" onClick={onCancel}>
          ✕
        </button>
      </div>

      {isLoading && <p className={styles.patientLine}>Loading examinations…</p>}
      {error && <p className={styles.patientLine}>Could not load the examinations list.</p>}

      {!isLoading && !error && (
        <>
          <div className={styles.testList}>
            {examinations.map((exam) => {
              const unavailable = !exam.owned;
              const isOrdering = orderingId === exam.id;
              return (
                <div
                  key={exam.id}
                  className={`${styles.row}${unavailable ? ` ${styles.rowUnavailable}` : ''}`}
                >
                  <span className={styles.rowBody}>
                    <span className={styles.rowNameLine}>
                      <span className={`${styles.rowName}${unavailable ? ` ${styles.rowNameUnavailable}` : ''}`}>
                        {exam.name}
                      </span>
                      {unavailable && <span className={styles.unavailableBadge}>Unavailable</span>}
                    </span>
                    <span className={`${styles.rowDesc}${unavailable ? ` ${styles.rowDescUnavailable}` : ''}`}>
                      {exam.description}
                    </span>
                    {unavailable ? (
                      <span className={styles.rowHint}>Buy at the night shop to unlock</span>
                    ) : (
                      <span className={styles.rowPrice}>${exam.price}</span>
                    )}
                  </span>

                  <span className={styles.rowActions}>
                    {!unavailable && (
                      <span className={styles.rowDuration}>
                        +{Math.round(exam.timeCostMs / 1000)}s
                      </span>
                    )}
                    {!unavailable && (
                      <button
                        type="button"
                        className={styles.orderButton}
                        disabled={isOrdering}
                        onClick={() => handleOrder(exam)}
                      >
                        {isOrdering ? 'Ordering…' : 'Order'}
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          {orderError && (
            <p className={styles.errorText}>Could not order this test. It may already be ordered.</p>
          )}
        </>
      )}
    </div>
  );
}

Phone.propTypes = {
  onCancel: PropTypes.func.isRequired,
};
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `pnpm test -- Phone.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/frontend/src/components/Phone/Phone.jsx src/frontend/src/tests/components/Phone/Phone.test.jsx
git commit -m "feat(phone): open the biopsy minigame in a new tab instead of ordering directly"
```

---

## Task 7: Compose `BiopsyMinigameProvider` in `MainView` and render `LabDisasterPopup`

Wires the new domain into the day-phase screen: `MainView` composes the provider (same level as `Results`/`Statistics`) and renders the popup whenever `isLabDisasterOpen` is true.

**Files:**
- Modify: `src/frontend/src/views/MainView/MainView.jsx`
- Modify: `src/frontend/src/tests/views/MainView/MainView.test.jsx`

**Interfaces:**
- Consumes: `useBiopsyMinigame()` (Task 4), `LabDisasterPopup` (Task 3).

- [ ] **Step 1: Write the failing test**

In `src/frontend/src/tests/views/MainView/MainView.test.jsx`, add this test inside the existing `describe('MainView', ...)` block (it can go anywhere after the other `it(...)` blocks — `act` is already imported at the top of this file):

```jsx
  it('shows the Lab Disaster popup when the biopsy minigame tab reports a failing score', async () => {
    await renderMainView();
    await waitFor(() => expect(screen.getByText('Diagnosis')).toBeInTheDocument());

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: window.location.origin,
          data: { type: 'biopsy-minigame-result', shopItemId: 'exam-1', caseId: 'case-uuid', score: 10 },
        }),
      );
    });

    expect(screen.getByText('Lab Disaster')).toBeInTheDocument();
  });
```

(`'case-uuid'` matches `DEFAULT_ROUTES['/api/v1/round']`'s fixture `case.id` already in this file.)

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm test -- MainView.test.jsx -t "Lab Disaster"`
Expected: FAIL — `MainView` doesn't compose `BiopsyMinigameProvider` or render `LabDisasterPopup` yet.

- [ ] **Step 3: Wire it into `MainView.jsx`**

Add imports near the top of `src/frontend/src/views/MainView/MainView.jsx`:

```jsx
import { LabDisasterPopup } from '../../components/LabDisasterPopup';
```
and
```jsx
import { BiopsyMinigameProvider, useBiopsyMinigame } from './providers/BiopsyMinigame';
```

In `MainViewContent`, add alongside the other domain-hook calls near the top of the function:

```jsx
  const { isLabDisasterOpen, closeLabDisaster } = useBiopsyMinigame();
```

Add the popup render, right after the `StatisticsPopup` block:

```jsx
      {/* Deferred while a ResultPopup is open, so the player always sees
          their diagnosis result before the day-end popup can cover it. */}
      {isStatisticsOpen && statistics && !isResultOpen && (
        <StatisticsPopup statistics={statistics} onClose={handleCloseStatistics} />
      )}
      {isLabDisasterOpen && !isResultOpen && (
        <LabDisasterPopup onClose={closeLabDisaster} />
      )}
    </div>
  );
}
```

Finally, change the `MainView()` export to compose the new provider (alongside `Results`, since both are "popup driven by domain state"):

```jsx
export function MainView() {
  return (
    <GameSessionProvider>
      <StatisticsProvider>
        <ResultsProvider>
          <BiopsyMinigameProvider>
            <DocumentTableProvider>
              <MainViewContent />
            </DocumentTableProvider>
          </BiopsyMinigameProvider>
        </ResultsProvider>
      </StatisticsProvider>
    </GameSessionProvider>
  );
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm test -- MainView.test.jsx -t "Lab Disaster"`
Expected: PASS

- [ ] **Step 5: Run the full `MainView.test.jsx` suite to confirm no regression**

Run: `pnpm test -- MainView.test.jsx`
Expected: PASS (all existing tests, including the pause/day-over sequencing ones, unaffected — `GameSessionProvider`'s composition and position didn't change)

- [ ] **Step 6: Commit**

```bash
git add src/frontend/src/views/MainView/MainView.jsx src/frontend/src/tests/views/MainView/MainView.test.jsx
git commit -m "feat(main-view): show the Lab Disaster popup when a biopsy minigame attempt fails"
```

---

## Task 8: Full regression pass

Nothing so far should have touched `AppRoutes.jsx`, `GameSessionProvider`'s location, or any routing structure — this task is the final check that holds across every workspace test, including the ones this plan never directly edited (`AppRoutes.test.jsx`, `NightView` tests, `GameSessionProvider.test.jsx`, `ResultsProvider.test.jsx`, `StatisticsProvider.test.jsx`).

**Files:** none (verification only).

- [ ] **Step 1: Run the full frontend suite**

Run: `pnpm test` (root script, per CLAUDE.md Section 9 — fans out to both workspaces)
Expected: PASS, with zero unexpected failures outside the files this plan touched.

- [ ] **Step 2: If anything unrelated failed, investigate before proceeding**

In particular double-check `tests/AppRoutes.test.jsx`'s two minigame tests still pass unmodified — they should, since `/game/main/minigame` is still the same sibling route it always was; this plan never changed `AppRoutes.jsx`.

- [ ] **Step 3: Lint**

Run: `pnpm lint` (or the frontend-scoped equivalent per CLAUDE.md Section 9)
Expected: PASS — no unused imports (e.g. confirm `Phone.jsx` no longer imports anything it doesn't use, and `MinigameView.jsx` doesn't import `PropTypes`/anything unused).

- [ ] **Step 4: Commit** (only if any fixups were needed in this step; otherwise skip — there's nothing to commit for a clean verification pass)

---

## Task 9: Update CLAUDE.md's domain documentation

Per CLAUDE.md Section 10 ("Docs discipline"): a new domain provider gets a note. `GameSession` itself didn't move, so only one addition is needed.

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add the new domain to Section 5's "Current domains" list**

In `CLAUDE.md`, in Section 5, immediately after the existing `DocumentTable` bullet (or in whatever position keeps the list in the same order the domains are introduced), add:

```markdown
- `BiopsyMinigame` → `views/MainView/providers/BiopsyMinigame/BiopsyMinigameProvider.jsx` + `useBiopsyMinigame.js`. Owns: whether the Lab Disaster popup is open. Listens for a `postMessage` from the separate browser tab Phone opens for the Punch Biopsy examination's excision minigame (`views/MinigameView`, rendered in that new tab) and decides what happens with the result: a passing score submits the real examination order (`Round`'s `orderExamination`) — skipping `GameSession`'s `addElapsedSeconds`, since the day timer in this tab never stopped running while the minigame tab was open — a failing score opens the Lab Disaster popup instead, without ordering anything, so Phone can be used to try again. Consumed only within `MainView`.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document the BiopsyMinigame provider domain"
```

---

## Task 10: Manual browser verification

**Note (added after Tasks 11-12 were written): perform this task LAST, after Tasks 11 and 12 below have also landed** — this plan grew two more tasks reworking `Excisio` itself and hiding the punch-biopsy time-cost indicator, and the walkthrough below should exercise the final combined behavior, not the intermediate state. Tasks 11-12 do not change anything about the pause-on-tab-hidden behavior this task's steps describe; they add: a randomized starting level with no money shown anywhere in Excisio's UI, no Retry/Next-Level buttons, an automatic 5-second-after-result close (in addition to the existing manual button), and no "+Xs" time-cost text next to Punch Biopsy in either Phone or the night Shop.

Per CLAUDE.md's UI-testing expectation: automated tests verify correctness, not the felt experience — drive this for real before calling it done.

**Files:** none.

- [ ] **Step 1: Start the dev stack**

Run whatever this repo's documented dev command is (root `pnpm dev`, or `docker compose -f docker/docker-compose.yml up`, per README/CLAUDE.md) so frontend + backend + Postgres are all up.

- [ ] **Step 2: Walk the happy path**

Sign in, reach a case whose case data uses `exam-punch-biopsy`. Open Phone (the wall's "order tests" button). Confirm the Punch Biopsy row shows no "+Xs" duration text (Task 12) — other, non-biopsy owned exams still show theirs. Click **Order** on Punch Biopsy. Confirm:
- A new browser tab opens showing only the Excisio tutorial/game screen — no day timer, no Settings gear in that tab.
- Switching back to the original tab: `Settings` has auto-opened there with "Game paused because you left the tab.", and the HUD shows `Status: Paused` — this is the existing tab-hidden behavior firing as expected, not a bug.
- Switch back to the minigame tab: the header shows a level number and a body part, but no cash/"Zarobek" figure anywhere (Task 11). Start the operation and play (or rush) the excision to the result screen. Confirm there is no "Powtórz poziom"/"Następny poziom" button, only the score/breakdown and the "Zakończ i wyślij wynik" button, and confirm the result panel shows no money figure either.
- Either click **Zakończ i wyślij wynik**, or simply wait 5 seconds without clicking anything — either way, the minigame tab closes itself, returning focus to the original tab. (Try both across two separate attempts if you have time, to confirm the automatic path genuinely fires on its own.)
- The original tab is still showing `Settings` open/paused (confirming nothing auto-resumes just from regaining focus, matching existing behavior) — click **Resume**.
- If the score was ≥ 30, no popup appears — check the Notebook's Examinations page a moment later and confirm the findings document is now there. If the score was < 30, the **Lab Disaster** popup appears; click **Continue** and confirm Phone can be reopened and Punch Biopsy can be ordered again (still shows "Order", not "Unavailable").
- Separately, visit the night Shop for a case with an owned Punch Biopsy examination and confirm its price shows with no "+Xs" suffix either, while a different examination item (if any is owned) still shows its own time cost normally.

- [ ] **Step 3: Confirm the day can still end normally**

After clicking Resume in the step above, let the day timer run out (or otherwise trigger day-end) and confirm Daily Statistics still opens and the day transition to night still works — this is the concrete "did we get the day stuck" check: the pause from opening the minigame tab must be a completely ordinary, recoverable pause, not one that leaves the session unable to progress.

- [ ] **Step 4: Report findings**

If anything above doesn't match, fix it before considering this plan complete — do not report success without having actually watched all of the above happen in a real browser.

---

## Task 11: Rework Excisio into a single-random-level "simulator" for the biopsy minigame — no money, no Retry/Next-Level, auto-reports after 5s

`Excisio` was originally built as a standalone arcade-style minigame with level progression and cash rewards (Retry/Next Level buttons, a running "Zarobek" balance in the header and in each result). For its actual use here — the biopsy exam's one-shot minigame, run once per visit to `/game/main/minigame` — that framing doesn't fit: every visit should play exactly one randomly-chosen level, show no money anywhere, and report its score back automatically 5 seconds after the result appears (the existing "Zakończ i wyślij wynik" button, added in Task 2, becomes an early-exit shortcut that fires the same reporting logic immediately instead of waiting).

**Files:**
- Modify: `src/frontend/src/components/Excisio/useExcisio.js`
- Modify: `src/frontend/src/components/Excisio/Excisio.jsx`
- Modify: `src/frontend/src/tests/components/Excisio/Excisio.test.jsx`
- Modify: `src/frontend/src/tests/components/Excisio/Excisio.onComplete.test.jsx`

**Interfaces:**
- No change to `Excisio`'s public prop (`onComplete?: (score: number) => void`) — same contract `MinigameView` (Task 5) already depends on.

- [ ] **Step 1: Write the failing tests**

In `src/frontend/src/tests/components/Excisio/Excisio.test.jsx`, replace the last test (`'shows level 1 and a starting balance of 0,00 zł in the header'`) with:

```jsx
  it('shows a level number in the header, with no money/earnings figure anywhere', async () => {
    render(<Excisio />);

    expect(screen.getByText('Poziom')).toBeInTheDocument();
    expect(screen.getByText(/^\d+ · .+/)).toBeInTheDocument();
    expect(screen.queryByText('Zarobek')).not.toBeInTheDocument();
    expect(screen.queryByText(/zł/)).not.toBeInTheDocument();
  });
```

In `src/frontend/src/tests/components/Excisio/Excisio.onComplete.test.jsx`, add a new `describe` block after the existing one (same file, same `mockCompletedRun()`/`h`/`buildUi` helpers already defined above — do not redefine them):

```jsx
describe('Excisio onComplete auto-timer', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="overlay-root"></div>';
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('automatically calls onComplete 5 seconds after the result is shown, even without clicking Finish', () => {
    mockCompletedRun();
    const onComplete = jest.fn();

    render(h(Excisio, { onComplete }));

    expect(onComplete).not.toHaveBeenCalled();
    jest.advanceTimersByTime(5000);

    expect(onComplete).toHaveBeenCalledWith(42);
  });

  it('clicking Finish before the 5s timer elapses fires immediately and does not double-fire', () => {
    mockCompletedRun();
    const onComplete = jest.fn();

    render(h(Excisio, { onComplete }));
    fireEvent.click(screen.getByText('Zakończ i wyślij wynik'));

    expect(onComplete).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(5000);

    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `pnpm test -- Excisio.test.jsx Excisio.onComplete.test.jsx`
Expected: FAIL — the header still shows "Zarobek"/a money figure, and `Excisio` doesn't auto-fire `onComplete` on a timer yet.

- [ ] **Step 3: Randomize the starting level in `useExcisio.js`**

Add, right after the `BODY_PARTS` array definition near the top of the file:

```js
const MAX_STARTING_LEVEL = 8;

function pickRandomLevel() {
  return 1 + Math.floor(Math.random() * MAX_STARTING_LEVEL);
}
```

In `useExcisio()`, change:

```js
  const engine = useRef(null);
  if (!engine.current) engine.current = createEngine();

  const [ui, setUi] = useState(INITIAL_UI);
```

to:

```js
  const engine = useRef(null);
  if (!engine.current) engine.current = createEngine();
  const startingLevelRef = useRef(null);
  if (startingLevelRef.current === null) startingLevelRef.current = pickRandomLevel();

  const [ui, setUi] = useState(() => ({
    ...INITIAL_UI,
    level: startingLevelRef.current,
    partName: computeDifficulty(startingLevelRef.current, BODY_PARTS).part,
  }));
```

(mirrors this file's own existing `if (!engine.current) engine.current = createEngine();` one-time-per-instance idiom, and pre-computes the matching `partName` so there's no one-frame mismatch flash before `setupLevel` runs.)

Then change the mount effect's `setupLevel(1);` call to `setupLevel(startingLevelRef.current);` (same effect, same `[]` deps — only the argument changes):

```js
  useEffect(() => {
    setupLevel(startingLevelRef.current);
    const view = viewRef.current;
```

Do not touch `retry`/`nextLevel` (or any other function) in this file — they become unused once Step 4 removes the buttons that call them, but leaving them defined is a deliberately minimal-risk choice for this large, fragile file; do not delete them as part of this task.

- [ ] **Step 4: Update `Excisio.jsx`**

Change the import line from:

```jsx
import React from 'react';
import PropTypes from 'prop-types';
import { OverlayPortal } from '../OverlayPortal';
import { useExcisio } from './useExcisio';
import { formatZloty } from './internal/geometry';
import { DRAW_COLORS, DRAW_THICKNESSES } from './internal/plasterMotifs';
import styles from './Excisio.module.css';
```

to (adds `useEffect, useRef`, drops the now-fully-unused `formatZloty`):

```jsx
import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { OverlayPortal } from '../OverlayPortal';
import { useExcisio } from './useExcisio';
import { DRAW_COLORS, DRAW_THICKNESSES } from './internal/plasterMotifs';
import styles from './Excisio.module.css';
```

Change the top of the component function from:

```jsx
export function Excisio({ onComplete }) {
  const { ui, refs, DEEP_NEED, SKIN_NEED, plasterCards, toolStatus, handlers } = useExcisio();
  const phase = phaseHint(ui.phase, ui.equipped, ui.deepCount, ui.skinCount, ui.disinfectPct, ui.creamPct, ui.injCount, DEEP_NEED, SKIN_NEED);
```

to:

```jsx
export function Excisio({ onComplete }) {
  const { ui, refs, DEEP_NEED, SKIN_NEED, plasterCards, toolStatus, handlers } = useExcisio();
  const completionTimerRef = useRef(null);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    if (!onComplete || !ui.showResult || !ui.result) return undefined;
    if (hasCompletedRef.current) return undefined;
    completionTimerRef.current = setTimeout(() => {
      hasCompletedRef.current = true;
      onComplete(ui.result.score);
    }, 5000);
    return () => clearTimeout(completionTimerRef.current);
  }, [onComplete, ui.showResult, ui.result]);

  function handleManualComplete() {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    clearTimeout(completionTimerRef.current);
    onComplete(ui.result.score);
  }

  const phase = phaseHint(ui.phase, ui.equipped, ui.deepCount, ui.skinCount, ui.disinfectPct, ui.creamPct, ui.injCount, DEEP_NEED, SKIN_NEED);
```

Change the header stats block from:

```jsx
        <div className={styles.headerStats}>
          <div className={styles.statBlock}>
            <div className={styles.statLabel}>Poziom</div>
            <div className={styles.statValue}>{ui.level} · {ui.partName}</div>
          </div>
          <div className={styles.divider} />
          <div className={styles.statBlock}>
            <div className={styles.statLabel}>Zarobek</div>
            <div className={styles.statValueAccent}>{formatZloty(ui.cash)}</div>
          </div>
          <button type="button" className={styles.tutorialButton} onClick={handlers.openTutorial}>
            <PoradnikIcon />
            Poradnik
          </button>
        </div>
```

to:

```jsx
        <div className={styles.headerStats}>
          <div className={styles.statBlock}>
            <div className={styles.statLabel}>Poziom</div>
            <div className={styles.statValue}>{ui.level} · {ui.partName}</div>
          </div>
          <button type="button" className={styles.tutorialButton} onClick={handlers.openTutorial}>
            <PoradnikIcon />
            Poradnik
          </button>
        </div>
```

Change the result panel's score block from:

```jsx
              <div className={styles.resultScoreBlock}>
                <div className={styles.resultScoreValue}>
                  {ui.result.score}
                  <span className={styles.resultScorePercent}>%</span>
                </div>
                <div className={styles.resultMoney}>+{ui.result.money}</div>
              </div>
```

to:

```jsx
              <div className={styles.resultScoreBlock}>
                <div className={styles.resultScoreValue}>
                  {ui.result.score}
                  <span className={styles.resultScorePercent}>%</span>
                </div>
              </div>
```

Change the result actions row from:

```jsx
            <div className={styles.resultActions}>
              <button type="button" className={styles.retryButton} onClick={handlers.retry}>Powtórz poziom</button>
              <button type="button" className={styles.nextButton} onClick={handlers.nextLevel}>Następny poziom →</button>
              {onComplete && (
                <button type="button" className={styles.nextButton} onClick={() => onComplete(ui.result.score)}>
                  Zakończ i wyślij wynik
                </button>
              )}
            </div>
```

to:

```jsx
            <div className={styles.resultActions}>
              {onComplete && (
                <button type="button" className={styles.nextButton} onClick={handleManualComplete}>
                  Zakończ i wyślij wynik
                </button>
              )}
            </div>
```

Do not touch any other part of the file (the breakdown grid, the summary box, the tool trays, the tutorial/alarm/cheer overlays — none of that changes).

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `pnpm test -- Excisio.test.jsx Excisio.onComplete.test.jsx`
Expected: PASS (all tests in both files, including the 2 new auto-timer tests and the updated header test)

- [ ] **Step 6: Run the rest of the Excisio suite and the MinigameView suites to confirm no regression**

Run: `pnpm test -- MinigameView.test.jsx MinigameView.result.test.jsx`
Expected: PASS — `MinigameView.result.test.jsx` mocks `Excisio` entirely so it's unaffected by this task; `MinigameView.test.jsx` renders the real (bare) `Excisio` and only asserts the tutorial heading, which this task didn't touch.

- [ ] **Step 7: Commit** — SKIP. Do not run `git commit`. Leave all changes as uncommitted working-tree modifications (per the project's current instruction: the user commits everything themselves at the end).

---

## Task 12: Hide the "+Xs" time-cost indicator for Punch Biopsy in Phone and the night Shop

Both `Phone` (day view) and `NightView` (night shop) currently show a "+Xs" duration next to any owned/priced examination, sourced from `timeCostMs`. For Punch Biopsy specifically that number no longer describes anything real — no artificial time gets added for it anymore (Task 4), and its actual "cost" is whatever real time the minigame takes. Hide the suffix for that one sku in both places; every other examination keeps showing it exactly as today.

**Files:**
- Modify: `src/frontend/src/components/Phone/Phone.jsx`
- Modify: `src/frontend/src/tests/components/Phone/Phone.test.jsx`
- Modify: `src/frontend/src/views/NightView/NightView.jsx`
- Modify: `src/frontend/src/tests/views/NightView/NightView.test.jsx`

**Interfaces:**
- No new props/exports — both are presentational-only changes gated on `sku === 'exam-punch-biopsy'`, a value both files already have on hand (`Phone.jsx` already reads `exam.sku` per Task 6; `NightView.jsx`'s `item` objects pass straight through `RoundProvider`'s `shopCatalog.items`, which already includes `sku` per the backend response — no provider change needed for either file).

- [ ] **Step 1: Write the failing tests**

In `src/frontend/src/tests/components/Phone/Phone.test.jsx`, replace:

```jsx
  it('shows the time cost (not price) as the emphasized action cost for an owned examination', async () => {
    renderPhone();
    await waitFor(() => screen.getByText('Punch Biopsy'));

    expect(screen.getByText('+90s')).toBeInTheDocument();
  });
```

with:

```jsx
  it('shows the time cost (not price) as the emphasized action cost for a non-biopsy owned examination', async () => {
    renderPhone();
    await waitFor(() => screen.getByText('Skin Swab Culture'));

    expect(screen.getByText('+20s')).toBeInTheDocument();
  });

  it('does not show a time-cost duration next to Punch Biopsy, since its real cost is the minigame itself', async () => {
    renderPhone();
    await waitFor(() => screen.getByText('Punch Biopsy'));

    expect(within(rowFor('Punch Biopsy')).queryByText(/^\+\d+s$/)).not.toBeInTheDocument();
  });
```

(`within` and `rowFor` are already defined/imported in this file from Task 6 — do not redefine them.)

In `src/frontend/src/tests/views/NightView/NightView.test.jsx`, add two EXAMINATION items to the `SHOP_BEFORE_BUY.items` array (after the existing `i2`/"Dermatoscope" entry, before the closing `],`):

```js
    {
      id: 'i3',
      sku: 'exam-punch-biopsy',
      name: 'Punch Biopsy',
      description: 'A small tissue sample sent to pathology for a definitive histological read.',
      itemType: 'EXAMINATION',
      price: 140,
      owned: true,
      timeCostMs: 90000,
    },
    {
      id: 'i4',
      sku: 'exam-dermoscopy',
      name: 'Dermoscopy Imaging',
      description: 'Magnified, polarized imaging.',
      itemType: 'EXAMINATION',
      price: 80,
      owned: true,
      timeCostMs: 30000,
    },
```

(Leave `SHOP_AFTER_BUY`'s derivation from `SHOP_BEFORE_BUY` as-is — it spreads/maps the same `items` array, so the two new entries carry through automatically; no change needed there.)

Then add a new test, using the file's existing `renderNightView()`/`mockFetch()` helpers (do not redefine them):

```jsx
  it('hides the time-cost suffix for Punch Biopsy but still shows it for other examinations', async () => {
    mockFetch();
    renderNightView();

    await waitFor(() => expect(screen.getByText('Punch Biopsy')).toBeInTheDocument());
    expect(screen.getByText('$140')).toBeInTheDocument();
    expect(screen.getByText('$80 +30s')).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `pnpm test -- Phone.test.jsx NightView.test.jsx`
Expected: FAIL — `Phone.jsx` still shows "+90s" for Punch Biopsy, and `NightView.jsx` doesn't exist in a state where the new fixture items are excluded from the suffix yet (the new NightView test should fail because the Punch Biopsy row currently DOES show "+90s", so the combined `'$140'`-with-no-suffix text won't be found as an exact match).

- [ ] **Step 3: Update `Phone.jsx`**

Add the guard to the existing duration span. Change:

```jsx
                    {!unavailable && (
                      <span className={styles.rowDuration}>
                        +{Math.round(exam.timeCostMs / 1000)}s
                      </span>
                    )}
```

to:

```jsx
                    {!unavailable && exam.sku !== PUNCH_BIOPSY_SKU && (
                      <span className={styles.rowDuration}>
                        +{Math.round(exam.timeCostMs / 1000)}s
                      </span>
                    )}
```

(`PUNCH_BIOPSY_SKU` is already defined at module scope in this file from Task 6 — do not redefine it.)

- [ ] **Step 4: Update `NightView.jsx`**

Add a local constant right after the `ITEM_TYPE_LABELS` object:

```jsx
const PUNCH_BIOPSY_SKU = 'exam-punch-biopsy';
```

Change the price span's conditional suffix from:

```jsx
                <span className={styles.cardPrice}>
                  ${item.price}
                  {item.itemType === 'EXAMINATION' && typeof item.timeCostMs === 'number'
                    ? ` +${Math.round(item.timeCostMs / 1000)}s`
                    : null}
                </span>
```

to:

```jsx
                <span className={styles.cardPrice}>
                  ${item.price}
                  {item.itemType === 'EXAMINATION' &&
                  item.sku !== PUNCH_BIOPSY_SKU &&
                  typeof item.timeCostMs === 'number'
                    ? ` +${Math.round(item.timeCostMs / 1000)}s`
                    : null}
                </span>
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `pnpm test -- Phone.test.jsx NightView.test.jsx`
Expected: PASS (all tests in both files)

- [ ] **Step 6: Commit** — SKIP. Do not run `git commit`. Leave all changes as uncommitted working-tree modifications.

---

## Self-Review

**Spec coverage:**
- "clicking the biopsy button opens the minigame as a new tab, no time/settings there" → Task 5, Task 6.
- "doesn't add time to the timer, but you have to complete the minigame to get results" → Task 4 (`orderExamination` only called on completion, never `addElapsedSeconds`), Task 6 (Phone no longer calls `order()` for this exam up front).
- "don't reintroduce previously-fixed bugs" / "don't get the day stuck" → addressed structurally (see the rationale note before Task 1) plus Task 8's full regression pass and Task 10 Step 3's explicit day-end check.
- "under 30% → Lab Disaster popup, results not available; above → results show normally" → Task 4's `LAB_DISASTER_SCORE_THRESHOLD` branch, Task 3's popup, and the deliberate choice that a passing score just lets the existing Notebook/document flow show the result with no extra popup.

**Placeholder scan:** no TODOs, no "add error handling" hand-waves — the one deliberately swallowed error (`orderExamination(...).catch(() => {})` in Task 4) is explained inline, matching the existing `pauseGame().catch(() => {})` precedent in `GameSessionProvider`.

**Type/shape consistency:** the `{ type: 'biopsy-minigame-result', shopItemId, caseId, score }` message shape is identical across Task 4 (listener) and Task 5 (sender) — checked field-by-field. `Excisio`'s `onComplete(score)` signature (Task 2) matches what `MinigameView.handleComplete` (Task 5) and the `Excisio.onComplete.test.jsx` mock (Task 2) both expect.
