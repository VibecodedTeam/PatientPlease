# Auth: Google Sign-In

Backend session endpoints for signing in with a Google account. The frontend obtains a Google
ID token via Google Identity Services (GSI) and exchanges it for a server-managed session — the
backend never talks to Google again after that exchange.

## `POST /auth/google`

Exchanges a Google ID token for a session.

### Request

    POST /auth/google
    Content-Type: application/json

    { "idToken": "<Google ID token from GSI>" }

### Response

| Condition                                             | Status | Body                                |
|--------------------------------------------------------|--------|--------------------------------------|
| Token valid, email verified                            | 200    | `{ "user": { "id", "email", "name", "avatarUrl" } }` |
| `idToken` missing/empty                                | 400    | Fastify validation error body        |
| Token invalid, expired, wrong audience, or unverified email | 401 | `{ "error": "invalid_google_token" }` |

On success, sets a `session` cookie (`HttpOnly`, `Secure` in production, `SameSite=Lax`,
signed, 30-day default lifetime — see `SESSION_TTL_MS`). Signing in with the same Google
identity more than once creates an additional session rather than invalidating prior ones —
multiple devices can be signed in concurrently.

## `GET /auth/me`

Returns the current user for the session cookie.

### Request

    GET /auth/me
    Cookie: session=<...>

### Response

| Condition                                      | Status | Body                                  |
|-------------------------------------------------|--------|----------------------------------------|
| Valid, non-expired session                       | 200    | `{ "user": { "id", "email", "name", "avatarUrl" } }` |
| Cookie missing, session not found, or expired    | 401    | `{ "error": "unauthenticated" }`      |

These three failure cases are intentionally indistinguishable in the response.

## `POST /auth/logout`

Ends the current session. Idempotent — safe to call with no session cookie.

### Request

    POST /auth/logout
    Cookie: session=<...>

### Response

| Condition            | Status | Body |
|-----------------------|--------|------|
| Always                | 204    | (empty) |

Deletes the matching `UserSession` row (if any) and clears the cookie.

## Related

- Route: `src/backend/src/routes/auth.ts`
- Business logic: `src/backend/src/services/auth.ts`
- Plugins: `src/backend/src/plugins/cookie.ts`, `src/backend/src/plugins/current-user.ts`
- App wiring: `src/backend/src/app.ts`
- Tests: `src/backend/test/routes/auth.test.ts`, `src/backend/test/services/auth.test.ts`
- Architecture decision: `docs/architecture/0003-google-sign-in-auth.md`
