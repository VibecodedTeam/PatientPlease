# 0007: Views are an open, documented list — not a fixed count of two

Status: Accepted (supersedes the "exactly two views" language from [0001](./0001-frontend-views-backend-typescript.md))

## Context

[0001](./0001-frontend-views-backend-typescript.md) fixed the frontend at exactly two top-level views, `MainView` and `NightView`, to keep a hard line between "route-level screen" and "reusable UI unit." A third view, `StartView` (a pre-game skin-cancer-awareness landing page), was added, and more top-level screens are expected going forward. Hard-coding the count at two forces a CLAUDE.md edit for every new screen and doesn't reflect how the game is actually growing.

## Decision

- `src/frontend/src/views/` holds one `PascalCase` folder per top-level screen/route wired to its own path in `App.jsx`, not a fixed count. `MainView`, `NightView`, and `StartView` are the current members.
- The distinction from [0001](./0001-frontend-views-backend-typescript.md) still holds: a view is a route-level screen; every other screen element (patient scene, documents, diagnosis panel, chat, shop, inventory, popups, info board) is a `components/` entry composed inside a view, never its own view, and never a `features/` folder.
- Each new view still follows the identical file-layout convention (Section 6): `index.js` barrel exporting a named export matching the folder name, `<Name>.jsx`, `<Name>.module.css`, and a mirrored test at `tests/views/<Name>/<Name>.test.jsx`.
- Adding a view means updating the views list in CLAUDE.md Section 4 (folder tree + rule bullet) and Section 6 (naming line) — the list must stay accurate, it just isn't capped at two anymore.

## Consequences

- `CLAUDE.md` Sections 1, 4, and 6 are updated to list views by name instead of asserting a count of two.
- No change to the provider isolation model (Section 5) or the no-`position:absolute` rule (Section 7) — those apply identically regardless of how many views exist.
