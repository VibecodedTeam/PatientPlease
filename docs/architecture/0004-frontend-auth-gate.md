# 0004: Frontend session gating via an AuthGate component, not a LoginView

## Status
Accepted (path of `views/`/`components/`/`providers/` superseded by [0006](./0006-consolidate-frontend-under-src.md) — they now live under `src/frontend/src/`)

## Context
The backend's Google Sign-In flow (`POST /auth/google`, `GET /auth/me`, `POST /auth/logout`,
see ADR 0003) had no frontend consumer. Building a "login page" for it collides with CLAUDE.md's
hard constraint that `src/frontend/views/` holds exactly two entries, `MainView` and `NightView`
— a `LoginView` would be a third. Frontend and backend also run on different origins in dev/
docker-compose (`:4173` vs `:4000`), and the backend had no CORS plugin, so the session cookie
could not round-trip cross-origin at all before this change.

## Decision
Session state is owned by a new `Auth` provider domain (`providers/Auth/AuthProvider.jsx` +
`useAuth.js`), following the same `providers/<Domain>/` pattern as the existing `Api` domain.
It checks `GET /auth/me` on mount and exposes `login(idToken)` / `logout()`.

Gating is a **component**, not a view: `components/AuthGate/` consumes `useAuth()` and renders
either a loading placeholder, the `Login` component (unauthenticated), or a thin header +
`{children}` (authenticated) — wrapping the existing `MainView`/`NightView` routes in `App.jsx`.
No route or view is added for login. `components/Login/` itself only wires Google Identity
Services (loads the GSI script, renders the button, surfaces the credential) and takes an
`onCredential` prop rather than calling `useAuth()` directly — this keeps it decoupled and
trivially testable with a plain callback instead of module mocking.

**Rejected: `LoginView`.** Would satisfy the same UX but requires amending CLAUDE.md's hard
constraint on the view list. Gating access to two views a layer above the router achieves the
same result without touching that constraint.

**CORS**: `@fastify/cors` is registered in `app.ts` with `origin: FRONTEND_ORIGIN,
credentials: true`, following the same "fail fast on missing config" pattern as
`resolveGoogleClientId`/`resolveCookieSecret`. `ApiProvider`'s fetch wrapper sends
`credentials: 'include'` so the `httpOnly` session cookie is sent/stored across origins.
`ApiProvider` also now treats `204` responses as bodiless (returns `null` instead of calling
`response.json()`), which was needed for `POST /auth/logout`'s always-204 contract to work
through the shared wrapper at all.

## Consequences
- New required env vars: `FRONTEND_ORIGIN` (backend), `VITE_API_BASE_URL` and
  `VITE_GOOGLE_CLIENT_ID` (frontend) — added to `.env.example` files, `docker-compose.yml`, and
  CI, mirroring the existing `GOOGLE_CLIENT_ID`/`COOKIE_SECRET` dev-safe-default pattern.
- Any future screen that must render outside the two views still cannot become a new view
  without revisiting CLAUDE.md Section 4/6 — this decision does not relax that constraint, it
  routes around it for the one case (auth gating) where full-screen takeover is needed.

## Related
- `docs/api/auth.md`
- `docs/architecture/0003-google-sign-in-auth.md`
- `src/frontend/providers/Auth/`, `src/frontend/components/AuthGate/`, `src/frontend/components/Login/`
- `src/backend/src/app.ts`, `src/backend/src/config.ts`
