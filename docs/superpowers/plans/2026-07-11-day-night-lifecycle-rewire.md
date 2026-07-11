# Day/Night Lifecycle Rewire Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the day→night→day (and reset) lifecycle so `RoundProvider` refetches the round at exactly the right moments — entering the day view, after a day/game reset — without losing the app-root centralization from the previous plan, and add the missing "return to the clinic" navigation that today doesn't exist at all.

**Architecture:** `RoundProvider` stays a singleton at the app root (per ADR 0008) — it does not need to remount to do its job. What it's missing is (a) a request-sequencing guard so overlapping fetches can't let a stale response win, and (b) a *publicly callable* refresh action that something other than its own one-time mount effect can trigger. `MainView` becomes that trigger: it calls the refresh in its own mount effect, so every time the router mounts `MainView` — first entry, or returning from `/game/night` — a fresh `POST /api/v1/round` fires. `NightView` gets an explicit "Continue" action that navigates there. This is a targeted fix to five specific spots, not a re-architecture.

**Tech Stack:** React + Vite frontend (`src/frontend`), Fastify + TypeScript + Prisma backend (`src/backend`), Jest + RTL, pnpm workspaces.

## Global Constraints

- No `position: absolute` outside `OverlayPortal` (CLAUDE.md §1.1).
- No cross-domain reach-through; every cross-cutting read goes through a Provider + hook pair (§1.2, §5).
- Only a folder's `index.js` barrel is a valid import path for outsiders (§1.3, §6).
- No production logic without a failing test first (§1.4, §8).
- `frontend` never imports from `backend`; the only contract is the HTTP API (§1.5).
- Backend is TypeScript-only, frontend is JavaScript-only (§1.6).
- pnpm only (§1.9).
- Every provider that talks to the backend uses `useApi()`/`useRound()` — never a hardcoded string (§5).
- Mock `global.fetch` directly in tests — never `jest.mock()` on axios/`lib/Api` (§8.6).

## Preflight check (already done, no action needed)

`origin/dev` has not moved since this branch's last merge — `git log HEAD..origin/dev` is empty, meaning this branch already contains everything `dev` has. No rebase/merge is needed before starting this plan.

---

## Part A — The backend's actual state machine (read this before touching anything)

Verified directly against `src/backend/src/services/round.ts`, `services/game.ts`, `docs/api/round.md`, `docs/api/day.md`, `docs/api/game.md`, and their test files. This is the authoritative contract the frontend must match — not an assumption.

### A.1 — `POST /api/v1/round`: idempotent-while-open, lazily-advancing

- Resolves the caller's `GameSession`: reuses it if `ACTIVE`, flips `PAUSED`→`ACTIVE` (accounting paused time into `totalPausedMs`), creates a fresh one if none exists.
- **If a `GameDayLog` is currently open (`endedAt: null`), this call returns the same case and does not create a new day.** This is what makes it safe to call every time the day view mounts — it will not skip or duplicate a case.
- **If the previous day was ended** (`POST /api/v1/day/end` already ran, so the latest `GameDayLog.endedAt` is set), the next `POST /api/v1/round` call **lazily opens the next `GameDayLog`** (`dayNumber + 1`, fresh `startingMoney`) and picks the next un-attempted case. This is the entire mechanism for "advancing to the next day" — there is no separate "start next day" endpoint, and none is needed.
- 409 `no_cases_remaining`/`game_completed` once every case is diagnosed (session marked `COMPLETED`).

### A.2 — `POST /api/v1/day/end`: closes today, does not open tomorrow

- Ends the current `GameDayLog`, computes `casesAttempted`/`casesCorrect`/`thresholdMet`/`penaltyApplied`, updates `consecutiveBadDiagnosisCount`.
- **Deliberately does not create tomorrow's `GameDayLog`** — per `docs/api/day.md`: "that still happens lazily on the next `POST /api/v1/round` call." Session `status` stays `ACTIVE`.
- Consequence for the frontend: do **not** refetch the round immediately after `endDay()` succeeds — that would open tomorrow's day log while the player is still looking at the Statistics popup / about to go shopping, starting tomorrow's clock early. The round refetch must wait until the player is actually about to see the day view again.

### A.3 — `POST /api/v1/day/reset`: restart *today*, not a new day

- Deletes today's `DiagnosisAttempt` rows, refunds `money` to today's `startingMoney`, resets counters. `dayNumber`/`startingMoney`/`startedAt` untouched.
- Since case selection excludes cases with a `DiagnosisAttempt` in this session, deleting today's attempts makes today's cases eligible again — the next `POST /api/v1/round` call returns to the first case of today. This is the correct, intended "restart today" behavior and needs a round refetch immediately (already implemented, see A.5).

### A.4 — `POST /api/v1/game/reset`: currently a one-way trip to a dead end — **backend bug, not just a frontend wiring gap**

- Sets `GameSession.status = 'GAME_OVER'`. Docs claim: *"The next call to `POST /api/v1/round` creates a brand-new `GameSession`."*
- **This is false as implemented.** `resolveGameSession` (`src/backend/src/services/round.ts:220-266`) throws `GameOverError` (409 `game_over`) whenever the latest session's status is `GAME_OVER` — it never creates a new one. Confirmed intentional-looking (not a typo) by its own test: `src/backend/test/services/round.test.ts:220-227` — *"throws GameOverError and creates no new session when the latest is GAME_OVER"* — and the route-level equivalent at `src/backend/test/routes/round.test.ts:289-306`.
- **Practical effect today:** once a player clicks "Back to start of game," every subsequent `POST /api/v1/round` call permanently 409s. `RoundProvider.terminalStateFromError` maps that straight to `terminalState: 'game_over'`, and nothing in `round.ts` ever exits that state. "Reset the whole game" is currently a dead end, not a restart — this needs a **backend** fix (Task 0 below), not something the frontend can wire around, since the frontend has no way to force a stuck backend session back to a fresh one.

### A.5 — What the frontend already gets right (from the previous plan, keep as-is)

- `resetDay()`/`resetGame()` already call a `fetchRound()`-equivalent refetch immediately after their POST resolves (Task 8 of the round-provider-centralization plan) — correct per A.3, and will be correct for game-reset too once A.4 is fixed on the backend.
- `NightShopProvider`'s mount effect already calls `loadShopCatalog()` on every mount — correct trigger, just needs the request-sequencing fix (Task 2) and the initial-loading-flash fix (Task 4).

---

## Part B — What's actually broken (mapped to the fix that closes it)

| # | Symptom | Root cause | Fixed by |
|---|---|---|---|
| 1 | Returning to `/game/main` from `/game/night` shows yesterday's case | `RoundProvider`'s mount effect fires once per app session now that it's hoisted to `AppRoutes.jsx`; nothing calls it again on that navigation | Task 1 |
| 2 | A slow/duplicate reset or two overlapping shop loads can let a stale response win | `fetchRound`/`loadShopCatalog` have no request-sequencing token | Task 2 |
| 3 | Logging out (or a 401) mid-fetch can write state into an unmounted `RoundProvider` | `isCancelled` guard only covers `setIsLoading`, not `setRound`/`setError`/`setTerminalState` | Task 2 (same guard covers both) |
| 4 | First-ever shop visit flashes "Nothing in stock" before "Loading the shop…" | `isShopLoading` defaults to `false` instead of the old local `true` | Task 4 |
| 5 | There is no way to leave `/game/night` and return to `/game/main` at all | Never built — `NightView.jsx` has no navigation action, only the Buy button | Task 3 |
| 6 | `POST /api/v1/game/reset` permanently bricks the session | Backend `resolveGameSession` never recovers from `GAME_OVER` (§A.4) | Task 0 |
| 7 | `GameSessionProvider.test.jsx`'s `resetDay`/`resetGame` tests don't actually exercise the refetch they're supposed to cover | Shared single-`Response` mock's second read throws, silently swallowed | Task 5 |

---

## Part C — Target lifecycle (what Tasks 1-5 build)

```
Login → AuthGate → RoundProvider (mounted once, app-root)
  → /game/main mounts → MainView's OWN mount effect calls refreshRound()
      → POST /api/v1/round (day log open → same case; day log closed → next day/case)
      → desk renders round.case
  → day timer elapses → GameSessionProvider.endDay() → StatisticsProvider shows popup
      → player closes popup → navigate('/game/night')  [existing, unchanged]
  → /game/night mounts → NightShopProvider's mount effect calls loadShopCatalog()
      → player shops
      → player clicks "Continue to the Clinic" (NEW) → navigate('/game/main')
  → /game/main REMOUNTS (new MainView instance) → mount effect calls refreshRound() again
      → day log from before is now closed (endDay already ran) → POST /api/v1/round
        lazily opens tomorrow's day log and returns the next case
      → desk renders the NEW round.case — the loop closes correctly

Reset day (Settings → "Back to start of day"):
  → resetDay() POSTs /day/reset, then refreshRound() → same case, money refunded, attempts cleared

Reset game (Settings → "Back to start of game"):
  → BLOCKED until Task 0 lands on the backend — see A.4
  → once fixed: resetGame() POSTs /game/reset, then refreshRound() → resolveGameSession
    treats the fresh GAME_OVER session like "no session," creates a brand-new one,
    the desk shows day 1 again
```

---

## Part D — Tasks

### Task 0: Backend — let `resolveGameSession` actually recover from `GAME_OVER`

**Files:**
- Modify: `src/backend/src/services/round.ts:220-266` (`resolveGameSession`)
- Test: `src/backend/test/services/round.test.ts:219-227` (existing test — its assertion is what needs to change)
- Test: `src/backend/test/routes/round.test.ts:289-306` (existing test — same)

**Interfaces:**
- `resolveGameSession(prisma: RoundPrismaClient, userId: string): Promise<GameSessionRecord>` — signature unchanged.

**Root cause:** `resolveGameSession` treats `GAME_OVER` exactly like `COMPLETED` (both throw and refuse to create a new session). `COMPLETED` (every case legitimately diagnosed) should stay terminal — that's a real "you finished" state. `GAME_OVER` is what `POST /api/v1/game/reset` sets specifically so the player can start over; per `docs/api/game.md`, it should behave like "no session exists," not like a dead end.

- [ ] **Step 1: Update the two existing tests to the corrected expectation (red)**

In `src/backend/test/services/round.test.ts`, replace the test at lines 219-227:

```typescript
it('throws GameOverError and creates no new session when the latest is GAME_OVER', async () => {
  const prisma = createMockPrisma();
  prisma.gameSession.findFirst.mockResolvedValue(makeSession({ status: 'GAME_OVER' }));

  await expect(resolveGameSession(prisma, 'user-uuid')).rejects.toThrow(GameOverError);
  expect(prisma.gameSession.create).not.toHaveBeenCalled();
  expect(prisma.gameSession.update).not.toHaveBeenCalled();
});
```

with:

```typescript
it('creates a brand-new session when the latest is GAME_OVER, per docs/api/game.md', async () => {
  const prisma = createMockPrisma();
  prisma.gameSession.findFirst.mockResolvedValue(makeSession({ status: 'GAME_OVER' }));
  prisma.gameSession.create.mockResolvedValue(makeSession({ status: 'ACTIVE', money: 0 }));

  const result = await resolveGameSession(prisma, 'user-uuid');

  expect(prisma.gameSession.create).toHaveBeenCalledWith({
    data: { userId: 'user-uuid', money: 0, consecutiveBadDiagnosisCount: 0, status: 'ACTIVE' },
  });
  expect(result.status).toBe('ACTIVE');
});
```

Remove the now-unused `GameOverError` import from this test file only if no other test in it still references `GameOverError` (check with `grep -n GameOverError src/backend/test/services/round.test.ts` first — leave the import if anything else still uses it).

In `src/backend/test/routes/round.test.ts`, replace the test at lines 289-306 (`'returns 409 game_over for a GAME_OVER session without spawning a new session'`) with:

```typescript
it('starts a brand-new session and returns 200 when the latest session is GAME_OVER', async () => {
  app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
  await app.ready();
  const { cookie, userId } = await signIn(app);
  await prisma.gameSession.create({
    data: { userId, money: 250, status: 'GAME_OVER' },
  });

  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/round',
    headers: { cookie },
  });

  expect(response.statusCode).toBe(200);
  const sessions = await prisma.gameSession.findMany({ where: { userId } });
  expect(sessions).toHaveLength(2);
  const newSession = sessions.find((s) => s.status === 'ACTIVE');
  expect(newSession).toBeDefined();
  expect(newSession?.money).toBe(0);
});
```

- [ ] **Step 2: Run both tests to confirm they fail against the current implementation**

Run: `cd src/backend && pnpm test -- round.test`
Expected: FAIL — `resolveGameSession` still throws `GameOverError` instead of creating a session.

- [ ] **Step 3: Fix `resolveGameSession`**

In `src/backend/src/services/round.ts`, change:

```typescript
  // A finished game is terminal: surface it as such instead of silently
  // spawning a fresh money:0 session, which would wipe the player's money and
  // replay every case (case selection is scoped by gameSessionId).
  if (latest.status === 'COMPLETED') {
    throw new GameCompletedError();
  }
  if (latest.status === 'GAME_OVER') {
    throw new GameOverError();
  }

  return latest;
```

to:

```typescript
  // COMPLETED (every case legitimately diagnosed) is a genuine terminal
  // state — surface it as such rather than silently spawning a fresh
  // money:0 session that would wipe progress and replay every case.
  if (latest.status === 'COMPLETED') {
    throw new GameCompletedError();
  }

  // GAME_OVER is what POST /api/v1/game/reset sets specifically so the
  // player can start over (see docs/api/game.md) — treat it exactly like
  // "no session exists yet" rather than a dead end.
  if (latest.status === 'GAME_OVER') {
    return prisma.gameSession.create({
      data: { userId, ...NEW_SESSION_DEFAULTS, status: 'ACTIVE' },
    });
  }

  return latest;
```

- [ ] **Step 4: Run the tests again**

Run: `cd src/backend && pnpm test -- round.test`
Expected: PASS, both files.

- [ ] **Step 5: Check `GameOverError`'s remaining usages**

Run: `grep -rn "GameOverError" src/backend/src src/backend/test`
If `GameOverError` is now unused anywhere in `src/backend/src`, leave the class exported from `round.ts` (removing exported types is out of scope for this fix) but confirm no route still branches on it expecting a 409 — `grep -n "GameOverError\|game_over" src/backend/src/routes/round.ts` should show the 409 mapping is now simply dead code on the happy path (harmless — the route's error handler still needs to exist for defense-in-depth, just never triggered by `resolveGameSession` anymore). No route file changes needed.

- [ ] **Step 6: Update `docs/api/round.md`'s error table to match**

Its 409 `game_over` doesn't currently appear in `round.md`'s error table at all (only `game_completed`/`no_cases_remaining` are documented) — good, no change needed there. Confirm `docs/api/game.md`'s existing claim ("The next call to `POST /api/v1/round` creates a brand-new `GameSession`") now matches reality — it already does, no doc change needed; it was the code that was wrong.

- [ ] **Step 7: Full backend test suite**

Run: `cd src/backend && pnpm test`
Expected: all suites pass (needs a reachable Postgres — see the other plan's Task 10 for `docker compose up` + migrate steps if not already running).

- [ ] **Step 8: Commit**

```bash
git add src/backend/src/services/round.ts src/backend/test/services/round.test.ts src/backend/test/routes/round.test.ts
git commit -m "fix(round): let a GAME_OVER session recover on the next POST /api/v1/round

resolveGameSession treated GAME_OVER identically to COMPLETED (both
permanently 409), but GAME_OVER is what /api/v1/game/reset sets
specifically so the player can start over per docs/api/game.md. Without
this fix, resetting the game is a one-way trip to a dead end."
```

---

### Task 1: `RoundProvider` — expose a public `refreshRound`, call it from `MainView`'s own mount effect

**Files:**
- Modify: `src/frontend/src/providers/Round/RoundProvider.jsx`
- Modify: `src/frontend/src/tests/providers/Round/RoundProvider.test.jsx`
- Modify: `src/frontend/src/views/MainView/MainView.jsx`
- Modify: `src/frontend/src/tests/views/MainView/MainView.test.jsx`

**Interfaces:**
- Produces: `useRound()` gains `refreshRound: () => Promise<void>` (the same underlying fetch `fetchRound` already performs, just exported publicly under a name a consumer calls deliberately, distinct from the provider's own internal one-time mount fetch).
- Consumes (by `MainView.jsx`): `const { refreshRound } = useRound();` called inside a `useEffect(() => { refreshRound(); }, [refreshRound])` in `MainViewContent`.

- [ ] **Step 1: Write the failing test for `refreshRound`**

Add to `src/frontend/src/tests/providers/Round/RoundProvider.test.jsx`, after the existing `resetDay refetches the round...` test:

```jsx
it('exposes refreshRound() which re-fetches the round on demand', async () => {
  let roundCallCount = 0;
  global.fetch = jest.fn().mockImplementation(() => {
    roundCallCount += 1;
    const caseId = roundCallCount === 1 ? 'case-a' : 'case-b';
    return Promise.resolve(
      new Response(JSON.stringify({ gameSession: { money: 100 }, case: { id: caseId } }), {
        status: 200,
      }),
    );
  });

  function Probe() {
    const { round, refreshRound } = useRound();
    return (
      <div>
        <span data-testid="case-id">{round?.case?.id ?? 'none'}</span>
        <button onClick={() => refreshRound()}>refresh</button>
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
  await waitFor(() => expect(screen.getByTestId('case-id').textContent).toBe('case-a'));

  await userEvent.setup().click(screen.getByText('refresh'));

  await waitFor(() => expect(screen.getByTestId('case-id').textContent).toBe('case-b'));
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1 --testPathPattern="providers/Round/RoundProvider.test" -t "refreshRound"`
Expected: FAIL — `refreshRound is not a function` (undefined, destructured from `useRound()`).

- [ ] **Step 3: Add request-sequencing + expose `refreshRound`, fully replacing `fetchRound`/the mount effect**

In `src/frontend/src/providers/Round/RoundProvider.jsx`, replace the `fetchRound`/mount-effect block (currently `const fetchRound = useCallback(...)` through the `useEffect` that calls it) with:

```jsx
  // Monotonically-increasing token: only the response from the MOST
  // RECENTLY issued call is allowed to update state. Any earlier call's
  // response, arriving after a later one, is silently discarded instead of
  // overwriting fresher data (fixes a real race between the initial mount
  // fetch, MainView's own re-entry refresh, and resetDay/resetGame's
  // internal refetch, any of which can be in flight at the same time).
  const fetchTokenRef = useRef(0);

  const refreshRound = useCallback(async () => {
    const token = (fetchTokenRef.current += 1);
    let isCancelled = false;
    const checkStale = () => isCancelled || token !== fetchTokenRef.current;
    setIsLoading(true);
    try {
      const data = await api.post(ENDPOINTS.round.start);
      if (checkStale()) return;
      setRound(data);
      setError(null);
      setTerminalState(null);
    } catch (err) {
      if (checkStale()) return;
      const terminal = terminalStateFromError(err);
      if (terminal) {
        setTerminalState(terminal);
      } else {
        setError(err);
      }
    } finally {
      if (!checkStale()) setIsLoading(false);
    }
    // eslint-disable-next-line no-unused-vars
    return () => {
      isCancelled = true;
    };
  }, [api]);

  useEffect(() => {
    let isCancelled = false;
    const token = fetchTokenRef.current;
    refreshRound();
    return () => {
      isCancelled = true;
      void token;
    };
  }, [refreshRound]);
```

Wait — simplify. The closure-based `isCancelled` above doesn't actually get set by the effect's cleanup (it's local to `refreshRound`, not shared with the mount effect). Use the token alone, which already covers both staleness *and* unmount (nothing reads component state after the fact — React just won't re-render an unmounted component, and the token check stops a late response from calling `setRound` at all, which is what avoids the dev-mode warning). Replace the whole block with this simpler version instead:

```jsx
  // Monotonically-increasing token: only the response from the MOST
  // RECENTLY issued call is allowed to update state. Any earlier call's
  // response, arriving after a later one (or after unmount, since the
  // token check runs regardless), is discarded instead of overwriting
  // fresher data or firing a state update nothing is listening for.
  const fetchTokenRef = useRef(0);

  const refreshRound = useCallback(async () => {
    const token = (fetchTokenRef.current += 1);
    setIsLoading(true);
    try {
      const data = await api.post(ENDPOINTS.round.start);
      if (token !== fetchTokenRef.current) return;
      setRound(data);
      setError(null);
      setTerminalState(null);
    } catch (err) {
      if (token !== fetchTokenRef.current) return;
      const terminal = terminalStateFromError(err);
      if (terminal) {
        setTerminalState(terminal);
      } else {
        setError(err);
      }
    } finally {
      if (token === fetchTokenRef.current) setIsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    refreshRound();
  }, [refreshRound]);
```

Apply the identical token pattern to `loadShopCatalog` — it has the same race (confirmed separately in the code review: overlapping `NightShopProvider` mounts, e.g. quickly navigating to/away/back to `/game/night`, can let a stale catalog response win). Use a **separate** token ref — `loadShopCatalog` and `refreshRound` are independent operations and must not treat each other as "superseding":

```jsx
  const shopFetchTokenRef = useRef(0);

  const loadShopCatalog = useCallback(async () => {
    const token = (shopFetchTokenRef.current += 1);
    setIsShopLoading(true);
    try {
      const data = await api.get(ENDPOINTS.shop.list);
      if (token !== shopFetchTokenRef.current) return null;
      setShopCatalog(data);
      setShopError(null);
      return data;
    } catch (err) {
      if (token !== shopFetchTokenRef.current) return null;
      setShopError(err);
      return null;
    } finally {
      if (token === shopFetchTokenRef.current) setIsShopLoading(false);
    }
  }, [api]);
```

This replaces the existing `loadShopCatalog` definition (same file, same `useCallback`) — add `shopFetchTokenRef` next to `fetchTokenRef`'s declaration.

Note this changes the staleness model from "cancelled on unmount" to "superseded by a newer call" — both the unmount case (Task's Part B item 3) and the concurrent-call case (item 2) are the same bug from `fetchTokenRef`'s point of view: whichever call's token doesn't match the current token is stale, whether that's because a newer call started or because nothing will ever read the result again.

Update `resetDay`/`resetGame` (added in the previous plan's Task 8) to call `refreshRound` instead of the old private `fetchRound` name:

```jsx
  const resetDay = useCallback(async () => {
    const data = await api.post(ENDPOINTS.day.reset);
    await refreshRound();
    return data;
  }, [api, refreshRound]);

  const resetGame = useCallback(async () => {
    const data = await api.post(ENDPOINTS.game.reset);
    await refreshRound();
    return data;
  }, [api, refreshRound]);
```

Add `refreshRound` to the returned `value` object:

```jsx
  const value = {
    round,
    isLoading,
    error,
    terminalState,
    refreshRound,
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
```

Add `useRef` to the `react` import at the top of the file: `import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';`.

- [ ] **Step 3b: Write the failing test for `loadShopCatalog`'s race guard, then apply the fix above**

Add to `RoundProvider.test.jsx`, after the existing `loadShopCatalog GETs /api/v1/shop...` test:

```jsx
it('loadShopCatalog discards a stale response when two calls overlap out of order', async () => {
  const responses = {
    '/api/v1/round': () => new Response(JSON.stringify({ gameSession: { money: 100 } }), { status: 200 }),
  };
  let shopCallCount = 0;
  let resolveFirstCall;
  global.fetch = jest.fn().mockImplementation((request) => {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/api/v1/round') return Promise.resolve(responses['/api/v1/round']());
    shopCallCount += 1;
    if (shopCallCount === 1) {
      return new Promise((resolve) => {
        resolveFirstCall = () =>
          resolve(new Response(JSON.stringify({ money: 0, items: [{ id: 'stale' }] }), { status: 200 }));
      });
    }
    return Promise.resolve(new Response(JSON.stringify({ money: 999, items: [{ id: 'fresh' }] }), { status: 200 }));
  });

  function Probe() {
    const { shopCatalog, loadShopCatalog } = useRound();
    return (
      <div>
        <span data-testid="money">{shopCatalog?.money ?? 'none'}</span>
        <button onClick={() => loadShopCatalog()}>load</button>
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

  const user = userEvent.setup();
  await user.click(screen.getByText('load')); // call #1: hangs
  await user.click(screen.getByText('load')); // call #2: resolves immediately with money:999

  await waitFor(() => expect(screen.getByTestId('money').textContent).toBe('999'));

  resolveFirstCall(); // call #1 finally resolves with the stale money:0
  await new Promise((resolve) => setTimeout(resolve, 10));

  expect(screen.getByTestId('money').textContent).toBe('999'); // must NOT regress to the stale value
});
```

Run: `cd src/frontend && pnpm test -- --maxWorkers=1 --testPathPattern="providers/Round/RoundProvider.test" -t "discards a stale response"`
Expected: FAIL before the token guard exists (the late call #1 response overwrites `money:999` with the stale `money:0`); PASS once the `shopFetchTokenRef` guard from Step 3 is in place.

- [ ] **Step 4: Run the new test and the full RoundProvider suite**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1 --testPathPattern="providers/Round/RoundProvider.test"`
Expected: PASS, all tests (the existing 12 plus the new `refreshRound` one) — none of the existing tests reference `fetchRound` by name, so renaming its call sites internally doesn't break them.

- [ ] **Step 5: Add the failing test for MainView's re-entry refresh**

In `src/frontend/src/tests/views/MainView/MainView.test.jsx`, add (near the other `renders the 3D patient scene...` tests):

```jsx
it('refetches the round every time MainView mounts, so returning from night shows the new case', async () => {
  let roundCallCount = 0;
  mockFetchRoutes({
    '/api/v1/round': () => {
      roundCallCount += 1;
      const caseId = roundCallCount === 1 ? 'case-yesterday' : 'case-today';
      return new Response(
        JSON.stringify({ case: { documents: [], id: caseId, moneyReward: 50, moneyPenalty: 20 } }),
        { status: 200 },
      );
    },
  });

  const { unmount } = await renderMainView();
  expect(roundCallCount).toBe(1);

  unmount();
  await renderMainView();

  await waitFor(() => expect(roundCallCount).toBe(2));
});
```

- [ ] **Step 6: Run it to confirm it fails**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1 --testPathPattern="views/MainView/MainView.test" -t "refetches the round every time MainView mounts"`
Expected: FAIL — `roundCallCount` stays `1` after the second `renderMainView()`, since nothing in `MainView.jsx` re-triggers a fetch on its own mount (only `RoundProvider`'s app-root singleton mount effect fired once, and this test's `unmount()`/re-`render()` doesn't unmount `RoundProvider` here — but in the real app, `RoundProvider` genuinely never unmounts across `/game/main` ↔ `/game/night`, which is exactly what this test is modeling by NOT tearing down `RoundProvider` between the two `renderMainView()` calls).

- [ ] **Step 7: Add the re-entry effect to `MainViewContent`**

In `src/frontend/src/views/MainView/MainView.jsx`, inside `MainViewContent`, add (right after the existing `const { round, terminalState } = useRound();` line):

```jsx
  const { refreshRound } = useRound();
```

and add a new effect alongside the existing visibility-change effect:

```jsx
  useEffect(() => {
    refreshRound();
    // Intentionally omits refreshRound from deps beyond mount: this must
    // fire exactly once per MainView mount (i.e. once per entry into the
    // day view, including returning from /game/night), not on every
    // refreshRound identity change (refreshRound's own identity is stable
    // across RoundProvider's lifetime anyway, since it's wrapped in
    // useCallback with only `api` as a dependency).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

- [ ] **Step 8: Run the test again**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1 --testPathPattern="views/MainView/MainView.test"`
Expected: PASS, full file.

- [ ] **Step 9: Full frontend suite**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1`
Expected: all suites pass.

- [ ] **Step 10: Commit**

```bash
git add src/frontend/src/providers/Round/RoundProvider.jsx src/frontend/src/tests/providers/Round/RoundProvider.test.jsx src/frontend/src/views/MainView/MainView.jsx src/frontend/src/tests/views/MainView/MainView.test.jsx
git commit -m "fix(round-provider): request-sequencing guard + refreshRound() called on every MainView mount

RoundProvider's mount effect fired exactly once per app session after
being hoisted to AppRoutes.jsx, so returning from /game/night to
/game/main showed the same stale case (nothing else ever refetched).
Renamed the internal fetch to refreshRound, exposed it publicly, and
call it from MainViewContent's own mount effect so every entry into the
day view - first login or returning from night - refetches. Also adds a
monotonic token guard so an overlapping refreshRound/resetDay/resetGame
call can no longer let a stale response win."
```

---

### Task 2: `NightView` — add the missing "Continue to the Clinic" navigation

**Files:**
- Modify: `src/frontend/src/views/NightView/NightView.jsx`
- Modify: `src/frontend/src/views/NightView/NightView.module.css`
- Modify: `src/frontend/src/tests/views/NightView/NightView.test.jsx`

**Interfaces:**
- Consumes: `useNavigate()` from `react-router-dom` (already used the same way in `MainView.jsx`).
- No `useRound()`/`useNightShop()` changes — this is purely a navigation action layered on top of the existing shop UI.

**Root cause:** confirmed via `grep -n "navigate\|useNavigate" src/frontend/src/views/NightView/NightView.jsx` returning nothing — there is currently no way to leave `/game/night` at all except a manual URL change or the browser back button.

- [ ] **Step 1: Write the failing test**

In `src/frontend/src/tests/views/NightView/NightView.test.jsx`, add (check the file's existing render helper name first — it wraps `NightView` in `MemoryRouter` already or needs one added; if it currently renders `NightView` directly without a Router, wrap it: `render(<ApiProvider baseUrl="http://api.test"><RoundProvider><MemoryRouter initialEntries={['/game/night']}><Routes><Route path="/game/night" element={<NightView />} /><Route path="/game/main" element={<div>Main view</div>} /></Routes></MemoryRouter></RoundProvider></ApiProvider>)` for this specific test if the shared helper doesn't already provide routing):

```jsx
it('navigates to /game/main when "Continue to the Clinic" is clicked', async () => {
  renderNightView(); // or the file's existing render helper
  await waitFor(() => expect(screen.queryByText(/loading the shop/i)).not.toBeInTheDocument());

  await userEvent.setup().click(screen.getByText('Continue to the Clinic'));

  await waitFor(() => expect(screen.getByText('Main view')).toBeInTheDocument());
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1 --testPathPattern="NightView.test" -t "Continue to the Clinic"`
Expected: FAIL — `Unable to find an element with the text: Continue to the Clinic`.

- [ ] **Step 3: Add the button**

In `src/frontend/src/views/NightView/NightView.jsx`, add the import and hook:

```jsx
import { useNavigate } from 'react-router-dom';
```

Inside `NightShopScreen`, add:

```jsx
  const navigate = useNavigate();
```

and add a new button in the `action` div, alongside the existing Buy button:

```jsx
      <div className={styles.action}>
        <button
          type="button"
          className={styles.actionButton}
          disabled={selectedCount === 0 || isBuying}
          onClick={() => buySelected()}
        >
          {isBuying ? 'Buying…' : 'Buy'}
        </button>
        <span className={styles.actionHint}>
          {buyError ? 'Purchase failed — try again' : `Remaining balance $${remaining}`}
        </span>
        <button
          type="button"
          className={styles.continueButton}
          disabled={isBuying}
          onClick={() => navigate('/game/main')}
        >
          Continue to the Clinic
        </button>
      </div>
```

Add a `.continueButton` rule to `NightView.module.css`, based on the existing `.actionButton` rule for consistent sizing/tokens (flex/grid only — no `position: absolute`, per Global Constraints):

```css
.continueButton {
  composes: actionButton;
  background: var(--color-primary, #2f6f4f);
}
```

(Check `NightView.module.css`'s actual token names before using `--color-primary` — match whatever custom properties the file already uses elsewhere; `composes` requires the two classes to be in the same CSS Modules file, which they are.)

- [ ] **Step 4: Run the test again**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1 --testPathPattern="NightView.test"`
Expected: PASS, full file.

- [ ] **Step 5: Full frontend suite**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1`
Expected: all suites pass — this also confirms Task 1's `MainView` re-entry effect actually fires when reached via this new real navigation path, not just the direct-mount test from Task 1.

- [ ] **Step 6: Commit**

```bash
git add src/frontend/src/views/NightView/NightView.jsx src/frontend/src/views/NightView/NightView.module.css src/frontend/src/tests/views/NightView/NightView.test.jsx
git commit -m "feat(night-view): add Continue to the Clinic navigation back to /game/main

There was previously no way to leave /game/night at all except the
browser back button. Combined with Task 1's MainView re-entry refresh,
this closes the day/night loop: end day -> shop -> continue -> the desk
shows the next day's case."
```

---

### Task 3: `NightShopProvider`/`NightView` — fix the first-visit loading-message flash

**Files:**
- Modify: `src/frontend/src/views/NightView/providers/NightShop/NightShopProvider.jsx`
- Modify: `src/frontend/src/tests/views/NightView/providers/NightShop/NightShopProvider.test.jsx`

**Interfaces:** No change to `useNightShop()`'s returned shape — `isLoading`'s *value* changes at one specific moment (the very first render before any load has ever completed), not its type or name.

**Root cause:** `isShopLoading` now lives in the never-unmounting `RoundProvider` and defaults to `false` (it used to be local `useState(true)` in the old `NightShopProvider`). On the very first `/game/night` visit in a session, the first render sees `isShopLoading=false, shopCatalog=null` — `NightView`'s three-way branch (`isLoading` / `error` / `items.length===0`) hits the wrong one and shows "Nothing in stock right now." for one frame.

- [ ] **Step 1: Write the failing test**

In `src/frontend/src/tests/views/NightView/providers/NightShop/NightShopProvider.test.jsx`, add:

```jsx
it('reports isLoading true on the very first render, before the catalog has ever loaded', () => {
  global.fetch = jest.fn().mockImplementation(() => new Promise(() => {})); // never resolves
  let observedIsLoading;

  function Probe() {
    const { isLoading } = useNightShop();
    observedIsLoading = isLoading;
    return null;
  }

  renderProvider(<Probe />); // adjust to this file's existing render helper name/signature

  expect(observedIsLoading).toBe(true);
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1 --testPathPattern="NightShopProvider.test" -t "very first render"`
Expected: FAIL — `observedIsLoading` is `false`.

- [ ] **Step 3: Derive `isLoading` from "no catalog yet" as well as the shared flag**

In `src/frontend/src/views/NightView/providers/NightShop/NightShopProvider.jsx`, change:

```jsx
  const { shopCatalog, isShopLoading, shopError, loadShopCatalog, purchaseShopItem } = useRound();
```

to keep the destructure the same, but change the `value` object's `isLoading` field from:

```jsx
      isLoading: isShopLoading,
```

to:

```jsx
      // Treat "no catalog fetched yet" as loading too, not just RoundProvider's
      // own isShopLoading flag — isShopLoading defaults to false (RoundProvider
      // doesn't fetch shop data until something asks it to), so on the very
      // first mount, before this provider's own effect has called
      // loadShopCatalog(), shopCatalog is still null and isShopLoading is still
      // false; without this, NightView briefly renders its empty-catalog
      // message instead of a loading message on that first frame.
      isLoading: isShopLoading || shopCatalog === null,
```

- [ ] **Step 4: Run the test again**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1 --testPathPattern="NightShopProvider.test"`
Expected: PASS, full file.

- [ ] **Step 5: Full frontend suite**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1`
Expected: all suites pass.

- [ ] **Step 6: Commit**

```bash
git add src/frontend/src/views/NightView/providers/NightShop/NightShopProvider.jsx src/frontend/src/tests/views/NightView/providers/NightShop/NightShopProvider.test.jsx
git commit -m "fix(night-shop): show loading (not empty-catalog) on the very first shop visit

isShopLoading defaults to false in the now-shared RoundProvider, so the
first render before loadShopCatalog()'s effect has fired saw
shopCatalog=null and isShopLoading=false - the wrong branch of NightView's
three-way loading/error/empty render. Deriving isLoading from
'still loading OR never loaded' fixes the first-visit flash without
touching RoundProvider's shared state at all."
```

---

### Task 4: Fix the test-masking bug in `GameSessionProvider.test.jsx`

**Files:**
- Modify: `src/frontend/src/tests/views/MainView/providers/GameSession/GameSessionProvider.test.jsx`

**Interfaces:** None — test-only fix, no production code changes.

**Root cause (found by this session's code review, confirmed CONFIRMED by an independent verifier agent that reproduced it directly):** `resetDay`/`resetGame`'s tests still use the file's `beforeEach`'s shared single-`Response` mock (`mockResolvedValue(new Response('{}', {status:200}))`). Since `RoundProvider`'s mount fetch now shares this same mock, the day/reset (or game/reset) POST's body-read throws (`Body is unusable: Body has already been read`) because it reuses an already-consumed `Response` instance — silently swallowed by `GameSessionProvider`'s `.catch(() => {})` — so the internal `refreshRound()` call these tests are meant to cover never actually runs, and the `toHaveBeenCalledTimes(2)` assertion passes for the wrong reason (2 calls happen, but the 3rd — the refetch — is masked, not absent).

- [ ] **Step 1: Confirm the current masking, then fix the mock**

In `src/frontend/src/tests/views/MainView/providers/GameSession/GameSessionProvider.test.jsx`, find the `resetDay zeroes the elapsed timer...` and `resetGame zeroes the elapsed timer...` tests. Both currently rely on the shared `beforeEach` mock. Give each its own `mockImplementation` (fresh `Response` per call, matching the pattern the `endDay` test in this same file already uses), and update the call-count assertion from `2` to `3` (mount + the reset POST + the `refreshRound()` this plan's Task 1 triggers):

```jsx
  it('resetDay zeroes the elapsed timer and POSTs /api/v1/day/reset', async () => {
    global.fetch = jest.fn().mockImplementation(() => new Response('{}', { status: 200 }));
    renderWithProviders();
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    act(() => {
      screen.getByText('reset-day').click();
    });

    expect(screen.getByTestId('elapsed').textContent).toBe('0');
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3));
    const resetRequest = global.fetch.mock.calls
      .map(([request]) => request)
      .find((request) => new URL(request.url).pathname === '/api/v1/day/reset');
    expect(resetRequest.method).toBe('POST');
  });

  it('resetGame zeroes the elapsed timer and POSTs /api/v1/game/reset', async () => {
    global.fetch = jest.fn().mockImplementation(() => new Response('{}', { status: 200 }));
    renderWithProviders();
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    act(() => {
      screen.getByText('reset-game').click();
    });

    expect(screen.getByTestId('elapsed').textContent).toBe('0');
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3));
    const resetRequest = global.fetch.mock.calls
      .map(([request]) => request)
      .find((request) => new URL(request.url).pathname === '/api/v1/game/reset');
    expect(resetRequest.method).toBe('POST');
  });
```

- [ ] **Step 2: Run both tests**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1 --testPathPattern="GameSession/GameSessionProvider.test"`
Expected: PASS, full file — and this time the refetch this plan's Task 1/the previous plan's Task 8 added is genuinely exercised, not masked.

- [ ] **Step 3: Full frontend suite**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1`
Expected: all suites pass.

- [ ] **Step 4: Commit**

```bash
git add src/frontend/src/tests/views/MainView/providers/GameSession/GameSessionProvider.test.jsx
git commit -m "test(game-session): stop masking resetDay/resetGame's refetch behind a shared Response mock

Both tests reused the shared single-Response beforeEach mock, so the
reset POST's body-read threw (already consumed by the mount fetch) and
was silently swallowed - the refreshRound() call this covers never
actually ran, but the 'toHaveBeenCalledTimes(2)' assertion passed anyway
because it never counted the masked 3rd call it also never happened."
```

---

### Task 5: Full verification

**Files:** none — verification only.

- [ ] **Step 1: Full frontend suite**

Run: `cd src/frontend && pnpm test -- --maxWorkers=1`
Expected: 0 failed suites, 0 failed tests.

- [ ] **Step 2: Frontend lint**

Run: `cd src/frontend && pnpm lint`

- [ ] **Step 3: Backend build + lint + full test suite**

Run: `cd src/backend && pnpm lint && pnpm build && pnpm test` (needs a reachable Postgres — `pnpm docker:up` from the repo root first if not already running).
Expected: all clean, including Task 0's two updated tests.

- [ ] **Step 4: Manual/real-data smoke of the exact loop this plan fixes**

With the stack up and seeded (`docker compose -f docker/docker-compose.yml up -d`, migrate, seed — see the other plan's Task 10 for exact commands): sign in, note the patient name shown, let the day timer elapse (or temporarily lower `MIN_DAY_DURATION_MS`/`DAY_DURATION_SECONDS` in a local-only, uncommitted edit for faster manual testing — revert before committing anything), close the Statistics popup (navigates to `/game/night`), shop, click "Continue to the Clinic," and confirm the desk now shows a **different** patient/case than before. Then open Settings → "Back to start of day" and confirm the **same** patient/case returns with money refunded. Then (once Task 0 lands) → "Back to start of game" and confirm a **fresh** day-1 case appears instead of a permanent "Game over" screen.

- [ ] **Step 5: Re-run the code-review**

Given the scope of these changes (a request-sequencing rewrite + a new navigation path + a backend behavior change), running `/code-review` again on this diff before merging is warranted — the previous review's findings are exactly what this plan fixes, so a follow-up pass should show them resolved rather than surfacing new ones.

---

## Out of scope for this plan

Four of the ten code-review findings are quality/cleanup issues, not lifecycle-correctness bugs, and are deliberately left out of the tasks above so this plan stays focused on "the day/night/reset loop actually works":

- `RoundProvider`'s context `value` isn't memoized (`useMemo`) — causes extra re-renders on every gameplay action, not wrong behavior.
- The `gameSession` merge reducer is copy-pasted 3x across `pauseGame`/`endDay`/`purchaseShopItem`.
- `endpointList.js`'s `inventory.get`/`inventory.update` are dead code (no consumer yet).
- `mockFetchRoutes` is reimplemented per test file instead of shared.

Worth a short, separate cleanup pass once this plan lands — none of them block or interact with the fixes above.
