# 0003: Google Sign-In via ID-token verification, with an opaque hashed server-side session

## Status
Accepted

## Context
The `User`/`UserSession` Prisma models (added in commit `850b6bb`, migration
`20260706210005_uuidv7_ids_and_auth`) already committed this project to Google-only
authentication before any route/service code existed: `User` has `googleId`/`email`/`name`/
`avatarUrl` and no password field, and `UserSession` has only an opaque `sessionToken` and
`expiresAt` — no OAuth access/refresh token columns anywhere. This schema shape only makes
sense for one flow: the backend verifies a Google-issued ID token once, then manages its own
independent session, never calling a Google API again afterward. This ADR records that
decision explicitly and the implementation choices it drove.

## Decision

**Flow**: the frontend uses Google Identity Services (GSI) to obtain a signed ID token
(a JWT) and POSTs it to `POST /auth/google`. The backend verifies the token's signature,
issuer, audience (`GOOGLE_CLIENT_ID`), and expiry, then upserts a `User` row keyed on the
token's `sub` claim (`googleId`) and mints its own session — a 256-bit random token
(`crypto.randomBytes(32)`, base64url) returned to the client only inside an `httpOnly`,
signed cookie. The database stores only a SHA-256 hash of that token in `UserSession
.sessionToken`, never the raw value, so a database leak or backup exposure doesn't hand out
live sessions directly.

**Rejected: OAuth 2.0 authorization-code flow** (e.g. via `@fastify/oauth2` or `passport`).
That flow exists to obtain access/refresh tokens for calling Google APIs later on the user's
behalf — this game never does that, it only needs to know who the user is once at sign-in.
Adopting it would mean persisting and refreshing tokens the schema has no columns for, and
pulling in a much larger dependency surface for no benefit.

**Rejected: `@fastify/session`**. It provides its own server-side session-store abstraction,
which would duplicate what the already-migrated `UserSession` Prisma model does. Session
state lives in `UserSession`; `@fastify/cookie` is used only for reading/writing the signed
cookie that carries the opaque token.

**Library choices**: `google-auth-library`'s `OAuth2Client.verifyIdToken` for signature/
issuer/audience/expiry verification (avoids hand-rolling JWKS/JWT verification and its edge
cases like key rotation); `@fastify/cookie` for the signed `httpOnly` cookie; `fastify-plugin`
so the `request.getCurrentUser()` decorator is visible outside its own plugin encapsulation.

**Session model**: multiple concurrent sessions per user are allowed — signing in on a new
device does not invalidate other sessions, matching the schema's one-to-many `User` →
`UserSession` relation. Sessions last 30 days by default (`SESSION_TTL_MS`). Sign-in is
rejected if Google's `email_verified` claim is `false`.

**Production safeguard**: `docker-compose.yml`, `docker/.env.example`, and `ci.yml` all fall
back to a hardcoded, publicly-committed `COOKIE_SECRET` placeholder so local dev and CI/
docker-smoke can boot without real secrets (neither path calls real Google or serves real
traffic). To stop that placeholder from silently reaching a real deployment,
`resolveCookieSecret` refuses to start when `NODE_ENV=production` and `COOKIE_SECRET` matches
a known dev/CI placeholder value.

**Testability**: `services/auth.ts` depends on a minimal local `GoogleIdTokenVerifier`
interface (`{ verifyIdToken(...): Promise<{ getPayload(): ... }> }`) rather than
`google-auth-library`'s real `OAuth2Client`/`LoginTicket` types — `LoginTicket` has private
fields, making it impossible to fake with a plain object. `buildApp()` accepts an optional
`googleClient` override so route-level tests inject a fake verifier directly instead of
mocking the ES module, which is fragile under this project's native-ESM Jest setup. The real
`OAuth2Client` still satisfies the narrower interface structurally, so production code
constructs and uses the real client unchanged.

## Consequences
- A new external dependency: sign-in requires reaching Google's token-verification endpoint
  (cached internally by `google-auth-library`); an outage there blocks new sign-ins but not
  existing sessions, since sessions are independently validated against Postgres afterward.
- `GET /auth/me`'s `request.getCurrentUser()` decorator (`src/backend/src/plugins/
  current-user.ts`) is available to any future protected route without building a generic
  `preHandler` auth guard now — deferred until a second protected route actually needs one.
- New required env vars (`GOOGLE_CLIENT_ID`, `COOKIE_SECRET`) and an optional one
  (`SESSION_TTL_MS`) must be set wherever the backend runs — local `.env`, `docker-compose.yml`,
  and CI all use dummy/dev-safe values since no test or alive-check path calls real Google.
- Session tokens are hashed at rest, but `UserSession.sessionToken`'s column name/type were
  kept unchanged (only its Prisma doc comment was updated) — no new migration was needed.

## Related
- `docs/api/auth.md`
- `src/backend/prisma/schema/auth.prisma`
- `src/backend/src/services/auth.ts`, `src/backend/src/routes/auth.ts`
