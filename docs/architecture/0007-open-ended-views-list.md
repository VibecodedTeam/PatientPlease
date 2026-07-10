# 0007: Views are an open-ended, routed list, not capped at two

## Status

Accepted

## Context

CLAUDE.md previously hard-capped `src/frontend/src/views/` at exactly two
entries, `MainView` and `NightView`, and said "no other view may be added
without updating this document." That held while the game only had a day
phase and a night/shop phase.

A third screen, `StartView`, was introduced as a pre-game splash screen —
the "Patient Please" title card with a PLAY button that signs the player in
via Google (or drops them straight into the game if already authenticated)
— meant to be reachable on its own, before login, not composed inside
`MainView` or `NightView`. Forcing it into one of those two views as a
sub-component would have misrepresented it as part of the day-phase exam
UI, when it's really its own top-level screen the player lands on first.
The two-view cap no longer matched what the app actually needed, and the
game is expected to keep adding top-level screens over time (e.g. a
results/summary screen, a settings screen) as it grows.

## Decision

- `src/frontend/src/views/` holds one PascalCase folder per top-level
  screen wired to its own route in `App.jsx`, with no fixed count. Currently:
  `MainView` (day phase), `NightView` (night/shop phase), `StartView`
  (pre-game splash/login screen, routed at `/`).
- Adding a new top-level routed screen is allowed without a CLAUDE.md
  amendment going forward, on the condition that the same change that adds
  it also updates the view list in Section 4 and the naming rule in Section
  6 — the document must stay truthful to what views actually exist, it just
  no longer hard-codes a count.
- The distinction between "is its own view" and "is a component composed
  inside a view" is unchanged: a view is a screen reachable at its own
  route; everything else (patient scene, documents, diagnosis panel, chat,
  shop, inventory, popups, info board) stays a `components/` entry composed
  inside whichever view uses it. This ADR loosens the *count*, not the
  *distinction*.
- Since `StartView` must be reachable before the player signs in, `App.jsx`'s
  route table splits into a public group (`/` → `StartView`) and a gated
  group (`/game/*`, wrapped in `AuthGate` → `MainView` at `/game/main`,
  `NightView` at `/game/night`) — not every view sits behind the same gate.

## Consequences

- `StartView` is a real view (`views/StartView/`, barrel `index.js`, CSS
  Module, mirrored test in `tests/views/StartView/`) wired to `/` in
  `App.jsx`, with `MainView`/`NightView` moved under the gated `/game/*`
  group.
- Future views follow the identical convention; reviewers check "is this a
  new top-level screen with its own route, and was CLAUDE.md's view list
  updated in the same PR?" instead of rejecting any new view outright.
- The risk this cap existed to prevent — screen sprawl replacing what
  should be a `components/` entry — is now a review judgment call
  (does this need its own route, or does it belong inside an existing
  view?) rather than a hard-coded number.
