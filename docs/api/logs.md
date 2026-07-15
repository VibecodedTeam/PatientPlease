# Logs: Record a Gameplay Event

Backend endpoint for recording ad hoc gameplay/analytics events against a `GameSession` (and
optionally a `Case`) as a `GameplayLog` row. The endpoint and underlying model are intentionally
generic (see `prisma/schema/logging.prisma`'s `GameplayLog` doc-comment), so future event types are
added to the vocabulary rather than given their own route. `BOOK_DOCUMENT_OPENED` is the first
event type defined — intended for the frontend `Book` component to log when a player opens a
revealed document — but this endpoint does not yet have a frontend caller wired up.

## `POST /api/v1/logs`

Validates that `gameSessionId` belongs to the caller and, if given, that `caseId` matches a real
`Case`, then creates a `GameplayLog` row with `eventType` and a free-form `payload`.

`eventType` must be one of the values in `GAMEPLAY_EVENT_TYPES`
(`src/backend/src/services/logs.ts`) — currently just `BOOK_DOCUMENT_OPENED`. It's a plain string
column validated at the service layer rather than a Prisma/DB enum, since this vocabulary is
expected to grow ad hoc as new events are logged.

### Request

    POST /api/v1/logs
    Cookie: session=<...>
    Content-Type: application/json

    { "gameSessionId": "<GameSession.id>", "caseId": "<Case.id>", "eventType": "BOOK_DOCUMENT_OPENED", "payload": { "documentId": "<CaseDocument.id>" } }

`caseId` and `payload` are both optional — `caseId` defaults to `null` (a session-level event with
no specific case), `payload` defaults to `{}`.

### Response

| Condition                                                       | Status | Body                                       |
| ------------------------------------------------------------------ | ------ | --------------------------------------------- |
| No/invalid session cookie                                           | 401    | `{ "error": "unauthenticated" }`             |
| Malformed body (missing `gameSessionId`/`eventType`, or `eventType` outside `GAMEPLAY_EVENT_TYPES`) | 400 | Fastify's default schema-validation body |
| `gameSessionId` doesn't exist or doesn't belong to the caller       | 404    | `{ "error": "game_session_not_found" }`      |
| `caseId` given but matches no `Case`                                | 404    | `{ "error": "case_not_found" }`              |
| Success                                                             | 200    | `{ "log": { "id", "gameSessionId", "caseId", "eventType", "payload", "occurredAt" } }` |

## Related

- Route: `src/backend/src/routes/logs.ts`
- Business logic: `src/backend/src/services/logs.ts`
- Model: `src/backend/prisma/schema/logging.prisma` (`GameplayLog`)
- App wiring: `src/backend/src/app.ts`
- Tests: `src/backend/test/routes/logs.test.ts`
