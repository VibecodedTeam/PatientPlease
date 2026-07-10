# RoundProvider Centralization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `RoundProvider` the single provider in `src/frontend/src` that talks to the backend for gameplay data — every `/api/v1/*` call (round, game pause/reset, day reset/end, shop list/purchase) lives in one place, and every other gameplay provider (`GameSessionProvider`, `NightShopProvider`, `StatisticsProvider`, `ResultsProvider`) gets its specific data/actions from `useRound()` instead of calling `useApi()` itself — so every popup (`ResultPopup`, `StatisticsPopup`) and the night shop are provably wired to the correct endpoints through one auditable path.

**Architecture:** `RoundProvider` is promoted from a `MainView`-local provider to an app-root domain (`src/frontend/src/providers/Round/`), composed in `AppRoutes.jsx` inside `AuthGate` (round data requires an authenticated session) but wrapping both the `MainView` and `NightView` routes (both now need it). It grows six action methods (`pauseGame`, `resetDay`, `resetGame`, `endDay`, `loadShopCatalog`, `purchaseShopItem`), each a thin `useApi()` call that also syncs `round.gameSession` from the response. `GameSessionProvider` and `NightShopProvider` keep their exact current public hook shapes (`useGameSession()`, `useNightShop()`) — zero change for their own consumers — but internally delegate to `useRound()`'s new actions instead of importing `useApi()`/`ENDPOINTS` themselves. `StatisticsProvider` and `ResultsProvider` need no changes at all — they already only consume other providers, never `useApi()` directly.

**Tech Stack:** React + Vite frontend (`src/frontend`), Jest + RTL, pnpm workspaces. No backend changes — every endpoint this plan touches already exists and is already contract-verified (see the prior plan's Part A.2).

## Prerequisites — do not start this plan until both are true

1. **`docs/superpowers/plans/2026-07-10-dev-integration-wiring.md`'s Task 1 has landed** (restores `MainView.jsx` from its merge-time duplication). This plan removes `RoundProvider` from `MainView.jsx`'s own composition — editing a file that's still triplicated/broken is not safe.
2. **`src/frontend/src/tests/views/MainView/MainView.test.jsx` must be de-duplicated first.** This is a *new* finding from this plan's own investigation, not yet in the other plan: unlike `MainView.jsx` (whose corruption was only in the *unstaged* working tree), this test file's duplication is already **committed to `HEAD`** — running `pnpm test -- --testPathPattern="MainView.test"` in isolation fails with `SyntaxError: Identifier 'renderMainView' has already been declared. (123:15)`, confirmed independent of any merge-in-progress state. The file contains two full copies of its own setup (one `require()`-based with a trivial `renderMainView`, one `import`-based with the real `AuthProvider`/`MemoryRouter`/`mockFetchRoutes` harness) pasted back-to-back, plus at least two `it('renders the wall with the pinned board', ...)` test bodies nested inside each other without a closing brace between them. Fix: delete the first, simpler copy (lines 1–24 of the current file: the `require()` imports, the trivial `renderMainView`, and the stray unclosed `it(...)` opener at the old line 163) and keep only the second, complete copy (starting at the `import { render, screen, waitFor, act }` line through the end) as the file's sole content. Verify with `cd src/frontend && pnpm test -- --maxWorkers=1 --testPathPattern="MainView.test"` — expect a clean parse and the full existing test suite passing before touching anything in this plan.

Do this second prerequisite as its own tiny task (write the de-duplicated file, run the test, commit `fix(main-view-test): remove committed duplicate-declaration corruption`) before Task 1 below.

## Global Constraints

- No `position: absolute` outside `OverlayPortal` (CLAUDE.md §1.1) — not touched by this plan, no CSS changes.
- No cross-domain reach-through; every cross-cutting read goes through a Provider + hook pair (§1.2, §5).
- Only a folder's `index.js` barrel is a valid import path for outsiders (§1.3, §6).
- **New rule this plan establishes and must leave true on exit:** only `src/frontend/src/providers/Round/RoundProvider.jsx` and `src/frontend/src/providers/Auth/AuthProvider.jsx` call `useApi()` anywhere in `src/frontend/src` (excluding `tests/`). Every other provider that needs gameplay data/actions consumes `useRound()`.
- `frontend` never imports from `backend` (§1.5) — not touched.
- pnpm only (§1.9).
- No production logic without a failing test first (§1.4, §8) — see the note under Task 4/5 about what "red" legitimately means for a behavior-preserving internal migration vs. genuinely new methods (Task 2).
- Frontend tests live only in the mirrored `src/frontend/src/tests/` tree (§1.4, §6) — `RoundProvider`'s test moves with it.

---

## Part A — What's moving where (read before starting)

### A.1 — Provider tree, before → after

**Before** (current, `RoundProvider` is `MainView`-local):
```
AppRoutes.jsx: <AuthGate> <Routes> main→<MainView/> night→<NightView/> </Routes> </AuthGate>

MainView.jsx:  <GameSessionProvider><StatisticsProvider><RoundProvider><ResultsProvider>
                 <DocumentTableProvider><MainViewContent/></DocumentTableProvider>
               </ResultsProvider></RoundProvider></StatisticsProvider></GameSessionProvider>

NightView.jsx: <NightShopProvider><NightShopScreen/></NightShopProvider>   (no RoundProvider anywhere)
```

**After** (`RoundProvider` promoted to app-root, wraps both routes):
```
AppRoutes.jsx: <AuthGate><RoundProvider><Routes> main→<MainView/> night→<NightView/> </Routes></RoundProvider></AuthGate>

MainView.jsx:  <GameSessionProvider><StatisticsProvider><ResultsProvider>
                 <DocumentTableProvider><MainViewContent/></DocumentTableProvider>
               </ResultsProvider></StatisticsProvider></GameSessionProvider>

NightView.jsx: <NightShopProvider><NightShopScreen/></NightShopProvider>   (unchanged — RoundProvider is now an ancestor already)
```

### A.2 — RoundProvider's new surface (single hook, `useRound()`)

| Field/method | Backing endpoint | Notes |
|---|---|---|
| `round`, `isLoading`, `error`, `terminalState` | `POST /api/v1/round` (on mount) | Unchanged from today. |
| `pauseGame()` | `POST /api/v1/game/pause` | New. Updates `round.gameSession` from the response. Caller decides fire-and-forget vs. await (today's `pauseTimer` fire-and-forgets). |
| `resetDay()` | `POST /api/v1/day/reset` | New. Same update pattern. |
| `resetGame()` | `POST /api/v1/game/reset` | New. Response `gameSession` may be `null` — only updates `round` if both `round` and `data.gameSession` are non-null. |
| `endDay()` | `POST /api/v1/day/end` | New. Awaited by the caller (needs the real `dayLog`). Returns `{gameSession, dayLog}` unchanged, same as today's `GameSessionProvider.endDay()`. |
| `shopCatalog`, `isShopLoading`, `shopError` | — | New state, populated only when `loadShopCatalog()` is called (not fetched automatically on `RoundProvider` mount — only `NightShopProvider`'s own mount triggers it, same lazy-load timing as today). |
| `loadShopCatalog()` | `GET /api/v1/shop` | New. |
| `purchaseShopItem(shopItemId)` | `POST /api/v1/shop/purchase` | New. Updates `round.gameSession` from the response; returns `{gameSession, ownedItem}` unchanged. |

### A.3 — Every file this plan touches, and why

| File | Change |
|---|---|
| `src/frontend/src/views/MainView/providers/Round/*` → `src/frontend/src/providers/Round/*` | **Move** the whole folder (`RoundProvider.jsx`, `useRound.js`, `index.js`); add the 6 new action methods to `RoundProvider.jsx`; fix its own internal imports for the new depth. |
| `src/frontend/src/tests/views/MainView/providers/Round/RoundProvider.test.jsx` → `src/frontend/src/tests/providers/Round/RoundProvider.test.jsx` | **Move** (mirrors source); add new tests for the 6 new action methods; fix internal import depths. |
| `src/frontend/src/AppRoutes.jsx` | Import `RoundProvider`, wrap the nested `<Routes>` in it (inside `<AuthGate>`). |
| `src/frontend/src/views/MainView/MainView.jsx` | Remove the `<RoundProvider>` wrapper and its import; `useRound` now imports from the new location. |
| `src/frontend/src/views/MainView/index.js` | Remove the two `RoundProvider`/`useRound` re-export lines (no longer `MainView`'s domain). |
| `src/frontend/src/views/MainView/providers/GameSession/GameSessionProvider.jsx` | Stop importing `useApi`/`ENDPOINTS`; import `useRound`; delegate `pauseTimer`/`resetDay`/`resetGame`/`endDay`'s HTTP calls to `useRound()`'s new actions. Public `useGameSession()` shape unchanged. |
| `src/frontend/src/views/NightView/providers/NightShop/NightShopProvider.jsx` | Stop importing `useApi`/`ENDPOINTS`; import `useRound`; read `shopCatalog`/`isShopLoading`/`shopError` and call `loadShopCatalog`/`purchaseShopItem` instead of owning local catalog state. Public `useNightShop()` shape unchanged. |
| `src/frontend/src/views/MainView/providers/Results/ResultsProvider.jsx` | Import path fix only (`useRound` now comes from `providers/Round`, not `../Round`). No behavior change — already compliant. |
| `src/frontend/src/components/Table/providers/DocumentTable/DocumentTableProvider.jsx` | Import path fix only (was reaching into `views/MainView`'s barrel for `useRound` — now imports the proper domain barrel directly, which is also a §6 cleanliness improvement). |
| `src/frontend/src/views/MainView/providers/Statistics/StatisticsProvider.jsx` | **No change** — already only consumes `useGameSession()`, never `useApi()`. |
| Test files needing a `RoundProvider` import + wrapper-tree addition: `GameSessionProvider.test.jsx`, `StatisticsProvider.test.jsx`, `NightShopProvider.test.jsx`, `NightView.test.jsx`, `MainView.test.jsx` (its own bespoke harness, since it doesn't render through `AppRoutes`) | See Tasks 4–6 for exact per-file diffs. |
| Test files needing only an import-path swap (already correctly wrapping `RoundProvider`, just from the old location): `ResultsProvider.test.jsx`, `DocumentTableProvider.test.jsx`, **`Table.test.jsx`** | `Table.test.jsx` is a gap the first draft of this plan missed — caught by adversarial verification: it imports `RoundProvider` directly from `'../../../views/MainView/providers/Round'` and wraps its own render tree in it, independent of `DocumentTableProvider`. |
| `CLAUDE.md` §4, §5 | Add the app-root-domain-via-`AppRoutes.jsx` clause (exact text in Task 9). |
| `docs/architecture/0008-round-provider-app-root-promotion.md` | New ADR note, required by §10's docs-discipline rule (exact content in Task 9). |

---

## Part B — Tasks

### Task 1: Move `RoundProvider` to `providers/Round/` and add its 6 new actions (TDD)

**Files:**
- Move: `src/frontend/src/views/MainView/providers/Round/RoundProvider.jsx` → `src/frontend/src/providers/Round/RoundProvider.jsx`
- Move: `src/frontend/src/views/MainView/providers/Round/useRound.js` → `src/frontend/src/providers/Round/useRound.js`
- Move: `src/frontend/src/views/MainView/providers/Round/index.js` → `src/frontend/src/providers/Round/index.js`
- Move: `src/frontend/src/tests/views/MainView/providers/Round/RoundProvider.test.jsx` → `src/frontend/src/tests/providers/Round/RoundProvider.test.jsx`

**Interfaces:**
- Produces: `useRound()` returning `{round, isLoading, error, terminalState, pauseGame, resetDay, resetGame, endDay, shopCatalog, isShopLoading, shopError, loadShopCatalog, purchaseShopItem}`.

- [ ] **Step 1: Move the four files with git, preserving history**

```bash
mkdir -p src/frontend/src/providers/Round
git mv src/frontend/src/views/MainView/providers/Round/RoundProvider.jsx src/frontend/src/providers/Round/RoundProvider.jsx
git mv src/frontend/src/views/MainView/providers/Round/useRound.js src/frontend/src/providers/Round/useRound.js
git mv src/frontend/src/views/MainView/providers/Round/index.js src/frontend/src/providers/Round/index.js
mkdir -p src/frontend/src/tests/providers/Round
git mv src/frontend/src/tests/views/MainView/providers/Round/RoundProvider.test.jsx src/frontend/src/tests/providers/Round/RoundProvider.test.jsx
```

- [ ] **Step 2: Fix `RoundProvider.jsx`'s own internal imports for its new depth**

It's now 1 level deep (`providers/Round/`) instead of 4 (`views/MainView/providers/Round/`). Change:
```js
import { useApi } from '../../../../providers/Api';
import { ENDPOINTS } from '../../../../lib/endpointList';
```
to:
```js
import { useApi } from '../Api';
import { ENDPOINTS } from '../../lib/endpointList';
```

- [ ] **Step 3: Fix the moved test file's imports for its new depth**

`RoundProvider.test.jsx` is now at `tests/providers/Round/` (3 deep) instead of `tests/views/MainView/providers/Round/` (5 deep). Change:
```js
import { ApiProvider } from '../../../../../providers/Api';
import { RoundProvider, useRound } from '../../../../../views/MainView/providers/Round';
```
to:
```js
import { ApiProvider } from '../../../providers/Api';
import { RoundProvider, useRound } from '../../../providers/Round';
```

- [ ] **Step 4: Run the moved test to confirm it's still green after the move alone**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1 --testPathPattern="providers/Round/RoundProvider.test"`
Expected: PASS, same tests as before (the move + `lastRequest()` fix from the other plan should already be in place — if not, apply that fix now too, since this file is otherwise unusable).

- [ ] **Step 5: Write the failing tests for the 6 new action methods**

Add to `src/frontend/src/tests/providers/Round/RoundProvider.test.jsx`, inside the existing `describe('RoundProvider', ...)` block:

```jsx
  it('pauseGame POSTs /api/v1/game/pause and updates round.gameSession', async () => {
    global.fetch = jest.fn().mockImplementation((request) => {
      const pathname = new URL(request.url).pathname;
      if (pathname === '/api/v1/round') {
        return Promise.resolve(
          new Response(JSON.stringify({ gameSession: { money: 100 } }), { status: 200 }),
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ gameSession: { money: 100, status: 'PAUSED' } }), {
          status: 200,
        }),
      );
    });

    function Probe() {
      const { round, pauseGame } = useRound();
      return (
        <div>
          <span data-testid="status">{round?.gameSession?.status ?? 'none'}</span>
          <button onClick={() => pauseGame()}>pause</button>
        </div>
      );
    }

    render(
      <ApiProvider baseUrl="http://api.test">
        <RoundProvider>
          <Probe />
        </RoundProvider>
      </ApiProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('none'));

    await userEvent.setup().click(screen.getByText('pause'));

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('PAUSED'));
    const request = lastRequest();
    expect(request.method).toBe('POST');
    expect(request.url).toBe('http://api.test/api/v1/game/pause');
  });

  it('resetDay POSTs /api/v1/day/reset and updates round.gameSession', async () => {
    global.fetch = jest.fn().mockImplementation((request) => {
      const pathname = new URL(request.url).pathname;
      if (pathname === '/api/v1/round') {
        return Promise.resolve(new Response(JSON.stringify({ gameSession: { money: 100 } }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({ gameSession: { money: 100 } }), { status: 200 }));
    });

    function Probe() {
      const { resetDay } = useRound();
      return <button onClick={() => resetDay()}>reset-day</button>;
    }

    render(
      <ApiProvider baseUrl="http://api.test">
        <RoundProvider>
          <Probe />
        </RoundProvider>
      </ApiProvider>,
    );
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    await userEvent.setup().click(screen.getByText('reset-day'));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    const request = lastRequest();
    expect(request.method).toBe('POST');
    expect(request.url).toBe('http://api.test/api/v1/day/reset');
  });

  it('resetGame POSTs /api/v1/game/reset and tolerates a null gameSession response', async () => {
    global.fetch = jest.fn().mockImplementation((request) => {
      const pathname = new URL(request.url).pathname;
      if (pathname === '/api/v1/round') {
        return Promise.resolve(new Response(JSON.stringify({ gameSession: { money: 100 } }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({ gameSession: null }), { status: 200 }));
    });

    function Probe() {
      const { resetGame } = useRound();
      return <button onClick={() => resetGame()}>reset-game</button>;
    }

    render(
      <ApiProvider baseUrl="http://api.test">
        <RoundProvider>
          <Probe />
        </RoundProvider>
      </ApiProvider>,
    );
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    await expect(userEvent.setup().click(screen.getByText('reset-game'))).resolves.not.toThrow();

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    const request = lastRequest();
    expect(request.url).toBe('http://api.test/api/v1/game/reset');
  });

  it('endDay POSTs /api/v1/day/end, returns the dayLog, and updates round.gameSession', async () => {
    const dayEndResponse = {
      gameSession: { money: 130, consecutiveBadDiagnosisCount: 0 },
      dayLog: { dayNumber: 3, startingMoney: 100, endingMoney: 130, casesAttempted: 2, casesCorrect: 2 },
    };
    global.fetch = jest.fn().mockImplementation((request) => {
      const pathname = new URL(request.url).pathname;
      if (pathname === '/api/v1/round') {
        return Promise.resolve(new Response(JSON.stringify({ gameSession: { money: 100 } }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify(dayEndResponse), { status: 200 }));
    });

    function Probe() {
      const { round, endDay } = useRound();
      const [dayLog, setDayLog] = React.useState(null);
      return (
        <div>
          <span data-testid="money">{round?.gameSession?.money ?? 'none'}</span>
          <span data-testid="day-log">{dayLog ? JSON.stringify(dayLog) : 'none'}</span>
          <button onClick={() => endDay().then((data) => setDayLog(data.dayLog))}>end-day</button>
        </div>
      );
    }

    render(
      <ApiProvider baseUrl="http://api.test">
        <RoundProvider>
          <Probe />
        </RoundProvider>
      </ApiProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('money').textContent).toBe('100'));

    await userEvent.setup().click(screen.getByText('end-day'));

    await waitFor(() => expect(screen.getByTestId('money').textContent).toBe('130'));
    expect(screen.getByTestId('day-log').textContent).toBe(JSON.stringify(dayEndResponse.dayLog));
    const request = lastRequest();
    expect(request.method).toBe('POST');
    expect(request.url).toBe('http://api.test/api/v1/day/end');
  });

  it('loadShopCatalog GETs /api/v1/shop and exposes the catalog via shopCatalog', async () => {
    const catalog = { money: 100, items: [{ id: 'a', name: 'Atlas', price: 40 }] };
    global.fetch = jest.fn().mockImplementation((request) => {
      const pathname = new URL(request.url).pathname;
      if (pathname === '/api/v1/round') {
        return Promise.resolve(new Response(JSON.stringify({ gameSession: { money: 100 } }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify(catalog), { status: 200 }));
    });

    function Probe() {
      const { shopCatalog, isShopLoading, loadShopCatalog } = useRound();
      return (
        <div>
          <span data-testid="shop-loading">{String(isShopLoading)}</span>
          <span data-testid="shop-money">{shopCatalog ? shopCatalog.money : 'none'}</span>
          <button onClick={() => loadShopCatalog()}>load-shop</button>
        </div>
      );
    }

    render(
      <ApiProvider baseUrl="http://api.test">
        <RoundProvider>
          <Probe />
        </RoundProvider>
      </ApiProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('shop-money').textContent).toBe('none'));

    await userEvent.setup().click(screen.getByText('load-shop'));

    await waitFor(() => expect(screen.getByTestId('shop-money').textContent).toBe('100'));
    expect(screen.getByTestId('shop-loading').textContent).toBe('false');
    const request = lastRequest();
    expect(request.method).toBe('GET');
    expect(request.url).toBe('http://api.test/api/v1/shop');
  });

  it('purchaseShopItem POSTs /api/v1/shop/purchase with the item id and updates round.gameSession', async () => {
    global.fetch = jest.fn().mockImplementation((request) => {
      const pathname = new URL(request.url).pathname;
      if (pathname === '/api/v1/round') {
        return Promise.resolve(new Response(JSON.stringify({ gameSession: { money: 100 } }), { status: 200 }));
      }
      return Promise.resolve(
        new Response(JSON.stringify({ gameSession: { money: 60 }, ownedItem: { id: 'x' } }), { status: 200 }),
      );
    });

    function Probe() {
      const { round, purchaseShopItem } = useRound();
      return (
        <div>
          <span data-testid="money">{round?.gameSession?.money ?? 'none'}</span>
          <button onClick={() => purchaseShopItem('shop-item-1')}>buy</button>
        </div>
      );
    }

    render(
      <ApiProvider baseUrl="http://api.test">
        <RoundProvider>
          <Probe />
        </RoundProvider>
      </ApiProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('money').textContent).toBe('100'));

    await userEvent.setup().click(screen.getByText('buy'));

    await waitFor(() => expect(screen.getByTestId('money').textContent).toBe('60'));
    const request = lastRequest();
    expect(request.method).toBe('POST');
    expect(request.url).toBe('http://api.test/api/v1/shop/purchase');
    expect(await request.clone().json()).toEqual({ shopItemId: 'shop-item-1' });
  });
```

Also add `import userEvent from '@testing-library/user-event';` and `import { render, screen, waitFor } from '@testing-library/react';` (extend the existing RTL import) at the top of the file if not already present from the existing tests.

- [ ] **Step 6: Run the tests to confirm they fail for the right reason**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1 --testPathPattern="providers/Round/RoundProvider.test"`
Expected: FAIL — `pauseGame`/`resetDay`/`resetGame`/`endDay`/`loadShopCatalog`/`purchaseShopItem` are all `undefined` on the value returned by `useRound()` (the new methods don't exist yet).

- [ ] **Step 7: Implement the 6 new action methods in `RoundProvider.jsx`**

Replace the full contents of `src/frontend/src/providers/Round/RoundProvider.jsx` with:

```jsx
import React, { createContext, useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useApi } from '../Api';
import { ENDPOINTS } from '../../lib/endpointList';

export const RoundContext = createContext(null);

/**
 * Maps a failed `POST /api/v1/round` to a terminal game state, or `null` if the
 * failure is an ordinary error the caller should surface as such. The backend
 * returns 409 for a game that can no longer produce a round: `game_completed` /
 * `no_cases_remaining` mean the player finished every case, `game_over` means
 * they lost — both are dead-ends the day view renders a message for rather than
 * an empty desk.
 *
 * @param {*} err - The rejected value from the API client (an axios error).
 * @returns {'completed' | 'game_over' | null}
 */
function terminalStateFromError(err) {
  if (err?.response?.status !== 409) return null;
  switch (err.response.data?.error) {
    case 'game_completed':
    case 'no_cases_remaining':
      return 'completed';
    case 'game_over':
      return 'game_over';
    default:
      return null;
  }
}

/**
 * The single provider that talks to the backend for gameplay data. Owns the
 * round payload (game session, owned items, active case, diagnosis/treatment
 * catalogs) from POST /api/v1/round, plus every action that mutates game
 * session state — pause/reset/day-end/shop — so no other frontend provider
 * needs its own useApi() call for gameplay data (see CLAUDE.md's Provider
 * Isolation Contract). Every action updates round.gameSession from its
 * response so any consumer reading round.gameSession stays in sync regardless
 * of which provider triggered the mutation.
 */
export function RoundProvider({ children }) {
  const api = useApi();
  const [round, setRound] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [terminalState, setTerminalState] = useState(null);
  const [shopCatalog, setShopCatalog] = useState(null);
  const [isShopLoading, setIsShopLoading] = useState(false);
  const [shopError, setShopError] = useState(null);

  useEffect(() => {
    let isCancelled = false;

    api
      .post(ENDPOINTS.round.start)
      .then((data) => {
        if (!isCancelled) setRound(data);
      })
      .catch((err) => {
        if (isCancelled) return;
        const terminal = terminalStateFromError(err);
        if (terminal) {
          setTerminalState(terminal);
        } else {
          setError(err);
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [api]);

  const pauseGame = useCallback(async () => {
    const data = await api.post(ENDPOINTS.game.pause);
    setRound((current) => (current ? { ...current, gameSession: data.gameSession } : current));
    return data;
  }, [api]);

  const resetDay = useCallback(async () => {
    const data = await api.post(ENDPOINTS.day.reset);
    setRound((current) => (current ? { ...current, gameSession: data.gameSession } : current));
    return data;
  }, [api]);

  const resetGame = useCallback(async () => {
    const data = await api.post(ENDPOINTS.game.reset);
    setRound((current) =>
      current && data.gameSession ? { ...current, gameSession: data.gameSession } : current,
    );
    return data;
  }, [api]);

  const endDay = useCallback(async () => {
    const data = await api.post(ENDPOINTS.day.end);
    setRound((current) => (current ? { ...current, gameSession: data.gameSession } : current));
    return data;
  }, [api]);

  const loadShopCatalog = useCallback(async () => {
    setIsShopLoading(true);
    try {
      const data = await api.get(ENDPOINTS.shop.list);
      setShopCatalog(data);
      setShopError(null);
      return data;
    } catch (err) {
      setShopError(err);
      return null;
    } finally {
      setIsShopLoading(false);
    }
  }, [api]);

  const purchaseShopItem = useCallback(
    async (shopItemId) => {
      const data = await api.post(ENDPOINTS.shop.purchase, { shopItemId });
      setRound((current) => (current ? { ...current, gameSession: data.gameSession } : current));
      return data;
    },
    [api],
  );

  const value = {
    round,
    isLoading,
    error,
    terminalState,
    pauseGame,
    resetDay,
    resetGame,
    endDay,
    shopCatalog,
    isShopLoading,
    shopError,
    loadShopCatalog,
    purchaseShopItem,
  };

  return <RoundContext.Provider value={value}>{children}</RoundContext.Provider>;
}

RoundProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
```

- [ ] **Step 8: Run the tests again**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1 --testPathPattern="providers/Round/RoundProvider.test"`
Expected: PASS, all tests (existing + 6 new ones).

- [ ] **Step 9: Commit**

```bash
git add src/frontend/src/providers/Round src/frontend/src/tests/providers/Round
git commit -m "feat(round-provider): promote to app-root domain, add pauseGame/resetDay/resetGame/endDay/loadShopCatalog/purchaseShopItem"
```

---

### Task 2: Compose `RoundProvider` in `AppRoutes.jsx`

**Files:**
- Modify: `src/frontend/src/AppRoutes.jsx`

**Interfaces:**
- Consumes: `RoundProvider` from `./providers/Round`.

- [ ] **Step 1: Update the import and route composition**

```jsx
import React from 'react';
import PropTypes from 'prop-types';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthGate } from './components/AuthGate';
import { RoundProvider } from './providers/Round';
import { MainView } from './views/MainView';
import { NightView } from './views/NightView';
import { StartView } from './views/StartView';

export function AppRoutes({ googleClientId }) {
  return (
    <Routes>
      <Route path="/" element={<StartView />} />
      <Route
        path="/game/*"
        element={
          <AuthGate googleClientId={googleClientId}>
            <RoundProvider>
              <Routes>
                <Route index element={<Navigate to="main" replace />} />
                <Route path="main" element={<MainView />} />
                <Route path="night" element={<NightView />} />
              </Routes>
            </RoundProvider>
          </AuthGate>
        }
      />
    </Routes>
  );
}

AppRoutes.propTypes = {
  googleClientId: PropTypes.string.isRequired,
};
```

- [ ] **Step 2: Run `AppRoutes.test.jsx` to confirm it's still green**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1 --testPathPattern="AppRoutes.test"`
Expected: PASS, unchanged — verified by adversarial review that `mockAuth()`'s blanket fetch mock also answers the now-also-firing round-start call on `/game/night`, and no assertion in this file reads round data.

- [ ] **Step 3: Commit**

```bash
git add src/frontend/src/AppRoutes.jsx
git commit -m "feat(app-routes): compose RoundProvider once, inside AuthGate, wrapping both game routes"
```

---

### Task 3: Remove `RoundProvider` from `MainView.jsx`, fix its `useRound` import, clean up the barrel

**Files:**
- Modify: `src/frontend/src/views/MainView/MainView.jsx`
- Modify: `src/frontend/src/views/MainView/index.js`

**Interfaces:** `MainView()` keeps its zero-prop signature; `useRound` is no longer re-exported from `views/MainView`'s barrel — every consumer now imports it from `providers/Round` directly (Tasks 4–6).

- [ ] **Step 1: Update `MainView.jsx`'s import and composition**

Change:
```jsx
import { RoundProvider, useRound } from './providers/Round';
```
to:
```jsx
import { useRound } from '../../providers/Round';
```

Change the `export function MainView()` body from:
```jsx
export function MainView() {
  return (
    <GameSessionProvider>
      <StatisticsProvider>
        <RoundProvider>
          <ResultsProvider>
            <DocumentTableProvider>
              <MainViewContent />
            </DocumentTableProvider>
          </ResultsProvider>
        </RoundProvider>
      </StatisticsProvider>
    </GameSessionProvider>
  );
}
```
to:
```jsx
export function MainView() {
  return (
    <GameSessionProvider>
      <StatisticsProvider>
        <ResultsProvider>
          <DocumentTableProvider>
            <MainViewContent />
          </DocumentTableProvider>
        </ResultsProvider>
      </StatisticsProvider>
    </GameSessionProvider>
  );
}
```

- [ ] **Step 2: Remove the re-export from `views/MainView/index.js`**

Change:
```js
export { MainView } from './MainView';
export { RoundProvider } from './providers/Round';
export { useRound } from './providers/Round';
```
to:
```js
export { MainView } from './MainView';
```

- [ ] **Step 3: Update `MainView.test.jsx`'s own render harness**

This file renders `MainView` directly (not through `AppRoutes`), so it must supply `RoundProvider` itself now. Add the import:
```jsx
import { RoundProvider } from '../../../providers/Round';
```
and wrap the existing `renderMainView()` helper's tree — insert `<RoundProvider>` directly inside `<AuthenticatedGate>` and outside the `<MemoryRouter>`:
```jsx
React.createElement(
  AuthenticatedGate,
  null,
  React.createElement(
    RoundProvider,
    null,
    React.createElement(
      MemoryRouter,
      { initialEntries: ['/'] },
      /* ...unchanged Routes/Route tree... */
    ),
  ),
),
```
(This is a `React.createElement` file per its existing `jest.mock()` constraint — do not convert to JSX.)

- [ ] **Step 4: Run the affected tests**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1 --testPathPattern="MainView.test|AppRoutes.test"`
Expected: PASS — this depends on the Prerequisites section's de-duplication of `MainView.test.jsx` already being done; if you're following this plan in order and haven't done that yet, stop and do it first.

- [ ] **Step 5: Commit**

```bash
git add src/frontend/src/views/MainView/MainView.jsx src/frontend/src/views/MainView/index.js src/frontend/src/tests/views/MainView/MainView.test.jsx
git commit -m "refactor(main-view): stop composing RoundProvider locally, it's now an app-root ancestor"
```

---

### Task 4: Migrate `GameSessionProvider` off `useApi()` onto `useRound()`

**Files:**
- Modify: `src/frontend/src/views/MainView/providers/GameSession/GameSessionProvider.jsx`
- Modify: `src/frontend/src/tests/views/MainView/providers/GameSession/GameSessionProvider.test.jsx`

**Interfaces:** `useGameSession()` keeps its exact current shape — `{elapsedSeconds, isPaused, isDayOver, pauseTimer, resumeTimer, resetDay, resetGame, endDay}`. No consumer of `useGameSession()` (`Settings.jsx`, `MainView.jsx`, `StatisticsProvider.jsx`) needs any change.

**A note on TDD here:** this is a behavior-preserving internal migration, not new behavior — the *meaningful* red/green cycle is "implement the migration → the test crashes because `RoundProvider` isn't mounted yet → add the wrapper and fix the now-stale call-count assertions → green." A test can't distinguish "GameSessionProvider called `api.post` itself" from "GameSessionProvider called `useRound().pauseGame()`, which called `api.post`" by call count alone — both produce the same network traffic. The proof this migration actually happened is the diff removing `useApi`/`ENDPOINTS` imports from this file, not a runtime assertion.

- [ ] **Step 1: Confirm the current baseline passes**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1 --testPathPattern="GameSession/GameSessionProvider.test"`
Expected: PASS (11 tests, current implementation).

- [ ] **Step 2: Migrate `GameSessionProvider.jsx`**

Replace the full contents of `src/frontend/src/views/MainView/providers/GameSession/GameSessionProvider.jsx` with:

```jsx
import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useRound } from '../../../../providers/Round';

export const GameSessionContext = createContext(null);

// How long a day runs before it auto-ends and the Daily Statistics popup
// appears (see views/MainView/providers/Statistics).
export const DAY_DURATION_SECONDS = 600;

export function GameSessionProvider({ children }) {
  const { pauseGame, resetDay: roundResetDay, resetGame: roundResetGame, endDay: roundEndDay } =
    useRound();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;
  const isDayOver = elapsedSeconds >= DAY_DURATION_SECONDS;
  const isDayOverRef = useRef(isDayOver);
  isDayOverRef.current = isDayOver;

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!isPausedRef.current) {
        setElapsedSeconds((seconds) => {
          const next = seconds + 1;
          // Freezes the timer the instant the day is over, so it doesn't
          // keep ticking past DAY_DURATION_SECONDS while the real
          // POST /api/v1/day/end call (triggered by Statistics watching
          // isDayOver) is in flight or its popup is showing.
          if (next >= DAY_DURATION_SECONDS) {
            setIsPaused(true);
          }
          return next;
        });
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const pauseTimer = useCallback(() => {
    if (isPausedRef.current) {
      return;
    }
    setIsPaused(true);
    // Fire-and-forget: a 401 (shouldn't happen behind AuthGate) or a 409
    // (no active session/open day yet — e.g. pausing before Round's own
    // POST /api/v1/round call resolves, or on an already-paused/completed
    // session) must not block the local pause state from taking effect.
    pauseGame().catch(() => {});
  }, [pauseGame]);

  // Real resume has no dedicated endpoint — per docs/api/game.md, a PAUSED
  // session flips back to ACTIVE the next time POST /api/v1/round is called
  // (e.g. on the next page load), not by resumeTimer itself, so this only
  // updates local timer state. No-ops once the day is over: that freeze is
  // permanent until endDay() actually resets elapsedSeconds, not something
  // an unrelated resume (e.g. closing Settings) should be able to undo.
  const resumeTimer = useCallback(() => {
    if (isDayOverRef.current) {
      return;
    }
    setIsPaused(false);
  }, []);

  const resetDay = useCallback(() => {
    setElapsedSeconds(0);
    roundResetDay().catch(() => {});
  }, [roundResetDay]);

  const resetGame = useCallback(() => {
    setElapsedSeconds(0);
    roundResetGame().catch(() => {});
  }, [roundResetGame]);

  // Unlike resetDay/resetGame, the caller needs the real dayLog payload (for
  // the Statistics popup), so this awaits the request and lets a failure
  // propagate rather than swallowing it fire-and-forget.
  const endDay = useCallback(async () => {
    const data = await roundEndDay();
    setElapsedSeconds(0);
    return data;
  }, [roundEndDay]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) {
        pauseTimer();
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [pauseTimer]);

  const value = {
    elapsedSeconds,
    isPaused,
    isDayOver,
    pauseTimer,
    resumeTimer,
    resetDay,
    resetGame,
    endDay,
  };

  return <GameSessionContext.Provider value={value}>{children}</GameSessionContext.Provider>;
}

GameSessionProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
```

- [ ] **Step 3: Run the test — confirm it now fails for the right reason**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1 --testPathPattern="GameSession/GameSessionProvider.test"`
Expected: FAIL — `Error: useRound must be used within a RoundProvider` (the test's `renderWithProviders()` doesn't wrap in `RoundProvider` yet).

- [ ] **Step 4: Fix the test — add the `RoundProvider` wrapper and the 10 stale call-count assertions**

Add the import:
```jsx
import { RoundProvider } from '../../../../../providers/Round';
```

Change `renderWithProviders()`:
```jsx
function renderWithProviders() {
  return render(
    <ApiProvider baseUrl="http://api.test">
      <RoundProvider>
        <GameSessionProvider>
          <TestConsumer />
        </GameSessionProvider>
      </RoundProvider>
    </ApiProvider>,
  );
}
```

`RoundProvider`'s own mount-time `POST /api/v1/round` call is now the *first* fetch in every test in this file, before any user action. The existing `beforeEach`'s blanket mock (`jest.fn().mockResolvedValue(new Response('{}', {status:200}))`) answers it harmlessly (`GameSessionProvider` never reads `round` data), but every count-based assertion must shift by exactly one. Fix each of these 10 sites (all in this one file):

| Line (current) | Test | Change |
|---|---|---|
| 83 | `stops counting and POSTs /api/v1/game/pause when paused` | `toHaveBeenCalledTimes(1)` → `toHaveBeenCalledTimes(2)` |
| 103 | `does not throw when the pause request fails...` | `toHaveBeenCalledTimes(1)` → `toHaveBeenCalledTimes(2)` |
| 111 | `resumes counting locally after resumeTimer is called...` | `toHaveBeenCalledTimes(1)` → `toHaveBeenCalledTimes(2)` |
| 122 | same test, second assertion (bare, sync) | `toHaveBeenCalledTimes(1)` → `toHaveBeenCalledTimes(2)` |
| 136 | `resetDay zeroes the elapsed timer and POSTs /api/v1/day/reset` | `toHaveBeenCalledTimes(1)` → `toHaveBeenCalledTimes(2)` |
| 153 | `resetGame zeroes the elapsed timer and POSTs /api/v1/game/reset` | `toHaveBeenCalledTimes(1)` → `toHaveBeenCalledTimes(2)` |
| 169 | `auto-pauses and calls the pause endpoint...` | `toHaveBeenCalledTimes(1)` → `toHaveBeenCalledTimes(2)` |
| 184 | `does not send a duplicate pause request if the tab is hidden more than once...` (bare, sync) | `toHaveBeenCalledTimes(1)` → `toHaveBeenCalledTimes(2)` |
| 193 | `does not send a duplicate pause request when auto-paused after an explicit pauseTimer call`, first assertion | `toHaveBeenCalledTimes(1)` → `toHaveBeenCalledTimes(2)` — **without this fix, the `waitFor` never settles and the test times out**, since the call count is already 2 (mount + explicit pause) and will never again equal 1. |
| 198 | same test, second assertion (bare, sync) | `toHaveBeenCalledTimes(1)` → `toHaveBeenCalledTimes(2)` (proves the auto-pause-while-already-paused path adds no 3rd call) |

None of the `lastRequest()`-based URL/method assertions (lines 84–86, 137–139, 154–156, 253–255) need any change — they read the *last* call, which is unaffected by an earlier mount call.

- [ ] **Step 5: Run the test again**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1 --testPathPattern="GameSession/GameSessionProvider.test"`
Expected: PASS, all 11 tests.

- [ ] **Step 6: Run `StatisticsProvider.test.jsx` too** (it wraps `GameSessionProvider`, so it's affected by this migration even though it needs no code change of its own beyond a wrapper)

First add the same `RoundProvider` import/wrapper to `src/frontend/src/tests/views/MainView/providers/Statistics/StatisticsProvider.test.jsx`:
```jsx
import { RoundProvider } from '../../../../../providers/Round';
```
```jsx
function renderWithProviders() {
  return render(
    <ApiProvider baseUrl="http://api.test">
      <RoundProvider>
        <GameSessionProvider>
          <StatisticsProvider>
            <StatisticsConsumer />
          </StatisticsProvider>
        </GameSessionProvider>
      </RoundProvider>
    </ApiProvider>,
  );
}
```
No assertion changes needed in this file — verified by adversarial review: it has no `toHaveBeenCalledTimes` assertions, only `mock.calls[length-1]` (last-call) checks, which an earlier mount call doesn't affect.

Run: `cd src/frontend && pnpm test -- --maxWorkers=1 --testPathPattern="Statistics/StatisticsProvider.test"`
Expected: PASS, all 4 tests.

- [ ] **Step 7: Commit**

```bash
git add src/frontend/src/views/MainView/providers/GameSession/GameSessionProvider.jsx src/frontend/src/tests/views/MainView/providers/GameSession/GameSessionProvider.test.jsx src/frontend/src/tests/views/MainView/providers/Statistics/StatisticsProvider.test.jsx
git commit -m "refactor(game-session): delegate pause/reset/day-end HTTP calls to RoundProvider"
```

---

### Task 5: Migrate `NightShopProvider` off `useApi()` onto `useRound()`

**Files:**
- Modify: `src/frontend/src/views/NightView/providers/NightShop/NightShopProvider.jsx`
- Modify: `src/frontend/src/tests/views/NightView/providers/NightShop/NightShopProvider.test.jsx`
- Modify: `src/frontend/src/tests/views/NightView/NightView.test.jsx`

**Interfaces:** `useNightShop()` keeps its exact current shape. No consumer (`NightView.jsx`) needs any change.

- [ ] **Step 1: Confirm the current baseline passes**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1 --testPathPattern="NightShop/NightShopProvider.test|NightView.test"`
Expected: PASS (5 + 3 tests).

- [ ] **Step 2: Migrate `NightShopProvider.jsx`**

Replace the full contents of `src/frontend/src/views/NightView/providers/NightShop/NightShopProvider.jsx` with:

```jsx
import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useRound } from '../../../../providers/Round';

export const NightShopContext = createContext(null);

/**
 * Owns the night-shop domain's UI-selection state: a budget-aware cart built
 * on top of RoundProvider's shopCatalog/loadShopCatalog/purchaseShopItem
 * (the only place that talks to GET/POST /api/v1/shop*).
 *
 * Budget invariants: an item can only be selected while its price fits in the
 * remaining balance, so `selectedTotal` never exceeds `money` and `remaining`
 * never goes negative. The backend independently rejects `insufficient_funds`.
 */
export function NightShopProvider({ children }) {
  const { shopCatalog, isShopLoading, shopError, loadShopCatalog, purchaseShopItem } = useRound();
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [isBuying, setIsBuying] = useState(false);
  const [buyError, setBuyError] = useState(null);

  useEffect(() => {
    loadShopCatalog();
  }, [loadShopCatalog]);

  const items = useMemo(() => shopCatalog?.items ?? [], [shopCatalog]);
  const money = shopCatalog?.money ?? 0;

  const selectedTotal = useMemo(
    () =>
      items
        .filter((item) => selectedIds.has(item.id))
        .reduce((sum, item) => sum + item.price, 0),
    [items, selectedIds],
  );
  const remaining = money - selectedTotal;

  const isSelected = useCallback((id) => selectedIds.has(id), [selectedIds]);

  const canToggle = useCallback(
    (item) => !item.owned && (selectedIds.has(item.id) || item.price <= remaining),
    [selectedIds, remaining],
  );

  const toggleItem = useCallback(
    (item) => {
      if (!canToggle(item)) return;
      setSelectedIds((previous) => {
        const next = new Set(previous);
        if (next.has(item.id)) {
          next.delete(item.id);
        } else {
          next.add(item.id);
        }
        return next;
      });
    },
    [canToggle],
  );

  const buySelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setIsBuying(true);
    setBuyError(null);
    try {
      for (const shopItemId of selectedIds) {
        // Sequential: the backend debits money per purchase, so ordering matters.
        // eslint-disable-next-line no-await-in-loop
        await purchaseShopItem(shopItemId);
      }
      setSelectedIds(new Set());
      await loadShopCatalog();
    } catch (err) {
      setBuyError(err);
      // Resync from the server so money/owned reflect any partial success, then
      // drop from the selection any item that is now owned or no longer present
      // — otherwise already-purchased items stay "selected", double-counting the
      // cart total and getting re-POSTed (item_already_owned) on the next Buy.
      const latest = await loadShopCatalog();
      if (latest) {
        const selectable = new Set(
          (latest.items ?? []).filter((item) => !item.owned).map((item) => item.id),
        );
        setSelectedIds((previous) => new Set([...previous].filter((id) => selectable.has(id))));
      }
    } finally {
      setIsBuying(false);
    }
  }, [selectedIds, purchaseShopItem, loadShopCatalog]);

  const value = useMemo(
    () => ({
      items,
      money,
      isLoading: isShopLoading,
      error: shopError,
      selectedIds,
      selectedTotal,
      remaining,
      isSelected,
      canToggle,
      toggleItem,
      buySelected,
      isBuying,
      buyError,
    }),
    [
      items,
      money,
      isShopLoading,
      shopError,
      selectedIds,
      selectedTotal,
      remaining,
      isSelected,
      canToggle,
      toggleItem,
      buySelected,
      isBuying,
      buyError,
    ],
  );

  return <NightShopContext.Provider value={value}>{children}</NightShopContext.Provider>;
}

NightShopProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
```

- [ ] **Step 3: Run the tests — confirm they now fail for the right reason**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1 --testPathPattern="NightShop/NightShopProvider.test|NightView.test"`
Expected: FAIL — `Error: useRound must be used within a RoundProvider`.

- [ ] **Step 4: Fix `NightShopProvider.test.jsx` — add the wrapper (no assertion changes needed)**

Add the import:
```jsx
import { RoundProvider } from '../../../../../providers/Round';
```
Change `renderProvider()`:
```jsx
function renderProvider() {
  return render(
    <ApiProvider baseUrl="http://api.test">
      <RoundProvider>
        <NightShopProvider>
          <Probe />
        </NightShopProvider>
      </RoundProvider>
    </ApiProvider>,
  );
}
```
Also update the one test that renders inline instead of via `renderProvider()` (the "reconciles selection..." test, which builds its own `render(...)` call directly) with the same `<RoundProvider>` wrapper.

Verified by adversarial review: no `toHaveBeenCalledTimes` assertions exist in this file; the `purchases`/`calls` arrays are populated only inside URL-matched branches, unaffected by the extra round-start call.

- [ ] **Step 5: Fix `NightView.test.jsx` — add the wrapper (no assertion changes needed)**

Add the import:
```jsx
import { RoundProvider } from '../../../providers/Round';
```
Change `renderNightView()`:
```jsx
function renderNightView() {
  return render(
    <ApiProvider baseUrl="http://api.test">
      <RoundProvider>
        <NightView />
      </RoundProvider>
    </ApiProvider>,
  );
}
```

- [ ] **Step 6: Run both test files again**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1 --testPathPattern="NightShop/NightShopProvider.test|NightView.test"`
Expected: PASS, all 8 tests.

- [ ] **Step 7: Commit**

```bash
git add src/frontend/src/views/NightView/providers/NightShop/NightShopProvider.jsx src/frontend/src/tests/views/NightView/providers/NightShop/NightShopProvider.test.jsx src/frontend/src/tests/views/NightView/NightView.test.jsx
git commit -m "refactor(night-shop): delegate shop list/purchase HTTP calls to RoundProvider"
```

---

### Task 6: Fix the remaining import-path-only consumers

**Files:**
- Modify: `src/frontend/src/views/MainView/providers/Results/ResultsProvider.jsx`
- Modify: `src/frontend/src/tests/views/MainView/providers/Results/ResultsProvider.test.jsx`
- Modify: `src/frontend/src/components/Table/providers/DocumentTable/DocumentTableProvider.jsx`
- Modify: `src/frontend/src/tests/components/Table/providers/DocumentTable/DocumentTableProvider.test.jsx`
- Modify: `src/frontend/src/tests/components/Table/Table.test.jsx`

**Interfaces:** No behavior change anywhere in this task — every file here already correctly consumes `useRound()`/wraps `RoundProvider`; only the import source changes.

- [ ] **Step 1: `ResultsProvider.jsx`**

Change:
```js
import { useRound } from '../Round';
```
to:
```js
import { useRound } from '../../../../providers/Round';
```

- [ ] **Step 2: `ResultsProvider.test.jsx`**

Change:
```jsx
import { RoundProvider } from '../../../../../views/MainView/providers/Round';
```
to:
```jsx
import { RoundProvider } from '../../../../../providers/Round';
```

- [ ] **Step 3: `DocumentTableProvider.jsx`**

Change:
```js
import { useRound } from '../../../../views/MainView';
```
to:
```js
import { useRound } from '../../../../providers/Round';
```
Also update the doc comment above it (currently says "Leaf components consume this provider, not useRound() directly — RoundProvider itself is only ever read here" — still true, no wording change needed).

- [ ] **Step 4: `DocumentTableProvider.test.jsx`**

Change:
```jsx
import { RoundProvider } from '../../../../../views/MainView';
```
to:
```jsx
import { RoundProvider } from '../../../../../providers/Round';
```

- [ ] **Step 5: `Table.test.jsx`** (the gap adversarial review caught — this file wraps its own render tree in `RoundProvider` independently of `DocumentTableProvider`)

Change:
```jsx
import { RoundProvider } from '../../../views/MainView/providers/Round';
```
to:
```jsx
import { RoundProvider } from '../../../providers/Round';
```

- [ ] **Step 6: Run all five affected suites**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1 --testPathPattern="ResultsProvider.test|DocumentTableProvider.test|components/Table/Table.test"`
Expected: PASS, no assertion changes needed anywhere in this task — purely import-path fixes.

- [ ] **Step 7: Commit**

```bash
git add src/frontend/src/views/MainView/providers/Results/ResultsProvider.jsx src/frontend/src/tests/views/MainView/providers/Results/ResultsProvider.test.jsx src/frontend/src/components/Table/providers/DocumentTable/DocumentTableProvider.jsx src/frontend/src/tests/components/Table/providers/DocumentTable/DocumentTableProvider.test.jsx src/frontend/src/tests/components/Table/Table.test.jsx
git commit -m "refactor: point remaining useRound()/RoundProvider imports at the new providers/Round location"
```

---

### Task 7: Full-suite verification that centralization is complete and nothing else calls `useApi()` for gameplay data

**Files:** none — verification only.

- [ ] **Step 1: Grep-confirm the new invariant holds**

Run:
```bash
grep -rln "useApi()" src/frontend/src --include="*.jsx" | grep -v /tests/
```
Expected output: exactly two files —
```
src/frontend/src/providers/Auth/AuthProvider.jsx
src/frontend/src/providers/Round/RoundProvider.jsx
```
If anything else appears, a consumer was missed — find it and migrate it before continuing.

- [ ] **Step 2: Grep-confirm no dangling references to the old Round location remain**

Run:
```bash
grep -rn "views/MainView/providers/Round\|views/MainView'" src/frontend/src --include="*.jsx" --include="*.js"
```
Expected: no output (the barrel re-export was removed in Task 3, and every consumer was repointed in Tasks 3–6).

- [ ] **Step 3: Full frontend suite green**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1`
Expected: 0 failed suites, 0 failed tests.

- [ ] **Step 4: Frontend lint clean**

Run: `cd src/frontend && pnpm lint`

- [ ] **Step 5: Manual smoke against real seeded data** (same approach as the other plan's Task 10 — bring up `docker compose`, run the seed script, sign in)

Confirm specifically, now that everything routes through one provider:
- Entering `/game/main` fires exactly one `POST /api/v1/round`.
- Opening Settings → "Back to start of day"/"Back to start of game" still works (still has the pre-existing stale-round display issue described in Task 8 below, unless that task is also done).
- Navigating to `/game/night` does **not** trigger a second, redundant round fetch beyond the one from entering `/game/main` earlier in the session (since `RoundProvider` now persists across the route switch instead of remounting).
- The night shop still loads its catalog and completes a purchase.
- Ending a day still shows `StatisticsPopup` with real numbers.

- [ ] **Step 6: Commit nothing here — this is a checkpoint, not a code change**

---

### Task 8 (optional, separable — a bug found while designing this, not required to close out the centralization itself): refetch `round` after `resetDay`/`resetGame`

**Files:**
- Modify: `src/frontend/src/providers/Round/RoundProvider.jsx`
- Modify: `src/frontend/src/tests/providers/Round/RoundProvider.test.jsx`

**The bug:** today (and unchanged by Tasks 1–7), calling `resetDay()`/`resetGame()` updates `round.gameSession` but never refetches the actual case/documents/diagnosis-options — so after confirming a reset in Settings, the desk keeps showing the *old* case indefinitely, since nothing else in the app remounts `RoundProvider`. This predates this plan; centralizing the state into one provider is what makes fixing it in one place possible.

- [ ] **Step 1: Write the failing test**

Add to `RoundProvider.test.jsx`:
```jsx
  it('resetDay refetches the round so a new case replaces the old one', async () => {
    let roundCallCount = 0;
    global.fetch = jest.fn().mockImplementation((request) => {
      const pathname = new URL(request.url).pathname;
      if (pathname === '/api/v1/round') {
        roundCallCount += 1;
        const caseId = roundCallCount === 1 ? 'case-old' : 'case-new';
        return Promise.resolve(
          new Response(JSON.stringify({ gameSession: { money: 100 }, case: { id: caseId } }), {
            status: 200,
          }),
        );
      }
      return Promise.resolve(new Response(JSON.stringify({ gameSession: { money: 100 } }), { status: 200 }));
    });

    function Probe() {
      const { round, resetDay } = useRound();
      return (
        <div>
          <span data-testid="case-id">{round?.case?.id ?? 'none'}</span>
          <button onClick={() => resetDay()}>reset-day</button>
        </div>
      );
    }

    render(
      <ApiProvider baseUrl="http://api.test">
        <RoundProvider>
          <Probe />
        </RoundProvider>
      </ApiProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('case-id').textContent).toBe('case-old'));

    await userEvent.setup().click(screen.getByText('reset-day'));

    await waitFor(() => expect(screen.getByTestId('case-id').textContent).toBe('case-new'));
  });
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1 --testPathPattern="providers/Round/RoundProvider.test"`
Expected: FAIL — `case-id` stays `case-old` after `resetDay`.

- [ ] **Step 3: Extract the mount-fetch into a reusable function and call it from `resetDay`/`resetGame`**

In `RoundProvider.jsx`, replace the mount `useEffect` and the `resetDay`/`resetGame` callbacks with:

```jsx
  const fetchRound = useCallback(async () => {
    try {
      const data = await api.post(ENDPOINTS.round.start);
      setRound(data);
      setError(null);
      setTerminalState(null);
    } catch (err) {
      const terminal = terminalStateFromError(err);
      if (terminal) {
        setTerminalState(terminal);
      } else {
        setError(err);
      }
    }
  }, [api]);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    fetchRound().finally(() => {
      if (!isCancelled) setIsLoading(false);
    });
    return () => {
      isCancelled = true;
    };
  }, [fetchRound]);

  const resetDay = useCallback(async () => {
    const data = await api.post(ENDPOINTS.day.reset);
    await fetchRound();
    return data;
  }, [api, fetchRound]);

  const resetGame = useCallback(async () => {
    const data = await api.post(ENDPOINTS.game.reset);
    await fetchRound();
    return data;
  }, [api, fetchRound]);
```

Note: this changes `resetDay`/`resetGame` from "update `gameSession` in place" to "refetch the whole round" — which supersedes the earlier partial `gameSession`-merge update for these two specific actions (the merge-update pattern stays for `pauseGame`/`endDay`/`purchaseShopItem`, which don't need a new case). Double-check the Task 1 test for `resetGame`'s null-`gameSession` tolerance still makes sense under this new behavior — a full refetch naturally handles the null case too, since `fetchRound()` doesn't depend on the reset response's `gameSession` at all.

- [ ] **Step 4: Run the tests again**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1 --testPathPattern="providers/Round/RoundProvider.test"`
Expected: PASS, including the new test and all existing ones (re-verify the Task 1 `resetGame` test still passes given the behavior change — it should, since it only asserted the request was sent, not the resulting `round` shape).

- [ ] **Step 5: Run the full suite once more** (this changes shared behavior other tests might incidentally depend on)

Run: `cd src/frontend && pnpm test -- --maxWorkers=1`

- [ ] **Step 6: Commit**

```bash
git add src/frontend/src/providers/Round/RoundProvider.jsx src/frontend/src/tests/providers/Round/RoundProvider.test.jsx
git commit -m "fix(round-provider): refetch the round after resetDay/resetGame so the next case actually loads"
```

---

### Task 9: Update CLAUDE.md and add the architecture note

**Files:**
- Modify: `CLAUDE.md`
- Create: `docs/architecture/0008-round-provider-app-root-promotion.md`

- [ ] **Step 1: Edit CLAUDE.md §4**

Find this sentence (in the `App.jsx` bullet):
> "It also composes the small set of app-wide providers (`Api`, `Auth`) — those live next to it, in `src/frontend/src/providers/`."

Append:
> " An app-root domain that depends on another app-root domain's state already being resolved (e.g. an auth-gated session) is instead composed in `AppRoutes.jsx`, not `App.jsx`, but still lives in `src/frontend/src/providers/<Domain>/`."

- [ ] **Step 2: Edit CLAUDE.md §5**

Find this sentence:
> "A domain composed once at the app root and consumed across multiple, otherwise-unrelated views (currently `Api` and `Auth`) lives next to `src/frontend/src/App.jsx`, in `src/frontend/src/providers/<Domain>/` — co-located with the one file that composes it."

Append:
> " If composing the domain at `App.jsx` would require a dependency `App.jsx` can't express (e.g. requiring an authenticated session), it is composed in `AppRoutes.jsx` instead — still in `src/frontend/src/providers/<Domain>/`, just wired one level down, inside the relevant auth gate."

Also update the "Current domains" list's `Round` entry (currently describes it as `views/MainView/providers/Round/` consumed only within `MainView`) to:
> "`Round` → `providers/Round/RoundProvider.jsx` + `useRound.js`. Owns: the full round payload (game session, owned items, active case, diagnosis/treatment catalogs) plus every gameplay action that mutates it (`pauseGame`, `resetDay`, `resetGame`, `endDay`, `loadShopCatalog`, `purchaseShopItem`) — the only provider besides `Auth` that calls `useApi()`. Composed once in `AppRoutes.jsx` inside `AuthGate`; consumed by `MainView` and `NightView`."

- [ ] **Step 3: Create the architecture note**

Write `docs/architecture/0008-round-provider-app-root-promotion.md`:

```markdown
# 0008: Promote RoundProvider to an app-root domain

`RoundProvider` is promoted from a `MainView`-local provider to an app-root
domain (`providers/Round/`) because `NightView` now needs it too, and — since
`Round` depends on an authenticated session — it is composed in
`AppRoutes.jsx` inside `AuthGate` rather than in `App.jsx`, establishing
`AppRoutes.jsx` as the valid composition site for app-root domains with an
auth dependency `App.jsx` can't express.

`RoundProvider` also becomes the only provider (besides `Auth`) that calls
`useApi()` for backend data: `GameSessionProvider` and `NightShopProvider`
now consume `useRound()`'s `pauseGame`/`resetDay`/`resetGame`/`endDay` and
`loadShopCatalog`/`purchaseShopItem` instead of building their own HTTP
calls, so every gameplay endpoint is reachable through one auditable path.
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md docs/architecture/0008-round-provider-app-root-promotion.md
git commit -m "docs: document RoundProvider's promotion to an app-root domain"
```

---

## Part C — Exit checklist

- [ ] Both Prerequisites done (other plan's Task 1 landed; `MainView.test.jsx` de-duplicated).
- [ ] Tasks 1–7 done, full suite green, lint clean.
- [ ] Task 8 done or explicitly deferred (it's optional/separable — note which if deferring).
- [ ] Task 9 done — CLAUDE.md and the new ADR reflect reality before this branch merges into `dev`.
- [ ] Re-run `grep -rln "useApi()" src/frontend/src --include="*.jsx" | grep -v /tests/` one final time immediately before merging — must still print exactly `providers/Auth/AuthProvider.jsx` and `providers/Round/RoundProvider.jsx`.
