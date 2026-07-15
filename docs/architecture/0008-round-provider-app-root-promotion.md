# 0008: Promote RoundProvider to an app-root domain and the sole gameplay-data gateway

## Status

Accepted

## Context

`RoundProvider` originally lived at `views/MainView/providers/Round/`,
consumed only within `MainView`. Two things outgrew that:

- `NightShopProvider` (inside `NightView`) needed shop data/actions, and the
  night shop is a completely separate route from the day phase — a
  `MainView`-local provider can't be an ancestor of `NightView`.
- Independently of routing, `GameSessionProvider` and `NightShopProvider`
  each built their own `useApi()` calls for gameplay endpoints
  (`game.pause`/`reset`, `day.reset`/`end`, `shop.list`/`purchase`), so the
  set of "things that talk to the backend for gameplay data" was scattered
  across three providers instead of one auditable place.

## Decision

- **`RoundProvider` moves to `src/frontend/src/providers/Round/`** — an
  app-root domain, per Section 5, since it's now consumed across multiple
  otherwise-unrelated views (`MainView` and `NightView`).
- **It's composed in `AppRoutes.jsx`, not `App.jsx`.** `POST /api/v1/round`
  requires an authenticated session, and `App.jsx` composes `AuthProvider`
  without knowing whether the user *is* authenticated — only `AppRoutes.jsx`'s
  `AuthGate` knows that. `RoundProvider` wraps the `main`/`night` route
  switch, nested inside `AuthGate`. This establishes `AppRoutes.jsx` as a
  valid composition site for an app-root domain whose dependency `App.jsx`
  can't express — codified in CLAUDE.md Section 4/5.
- **`RoundProvider` becomes the only provider besides `Auth` that calls
  `useApi()`.** It grows six action methods — `pauseGame`, `resetDay`,
  `resetGame`, `endDay`, `loadShopCatalog`, `purchaseShopItem` — each a thin
  `useApi()` call that also syncs `round.gameSession` from the response.
  `GameSessionProvider` and `NightShopProvider` now consume `useRound()`
  instead of building their own HTTP calls; their own public hook shapes
  (`useGameSession()`, `useNightShop()`) are unchanged.
- **`resetDay`/`resetGame` also refetch the round**, not just update
  `gameSession` — a pre-existing bug (the desk kept showing the old case
  after a reset, since nothing else remounted `RoundProvider`) that
  centralizing this logic into one place made straightforward to fix.

## Consequences

- Auditing "does anything bypass the shared HTTP layer for gameplay data" is
  now one grep: `grep -rln "useApi()" src/frontend/src | grep -v /tests/`
  should print exactly `providers/Auth/AuthProvider.jsx` and
  `providers/Round/RoundProvider.jsx`.
- `DocumentTableProvider` and `ResultsProvider` (already consumers of
  `useRound()`, never of `useApi()` directly) needed only an import-path
  fix, not a behavior change — confirming they were already correctly
  isolated to the `Round` domain before this move.
- Several tests needed `RoundProvider` added as an ancestor once
  `GameSessionProvider`/`NightShopProvider` started depending on it,
  including one (`Settings.test.jsx`) that wraps `GameSessionProvider`
  directly and never referenced `Round` at all — an indirect-consumer case
  worth watching for in future provider-boundary changes; a grep for direct
  references to the domain being moved won't find it.
- A single reused `Response` instance (`mockResolvedValue(new Response(...))`)
  in a test's fetch mock breaks once `RoundProvider`'s own mount-time
  round-start call adds an extra body read — `mockImplementation(() => new
  Response(...))` (fresh instance per call) is required wherever a test's
  mock previously assumed exactly one fetch call.
