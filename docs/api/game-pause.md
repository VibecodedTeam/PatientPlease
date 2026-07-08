# POST /api/v1/game/pause

Records that the player paused the game (e.g. by opening the Settings popup during the day phase).

## Request

    POST /api/v1/game/pause

No body, no parameters, no auth.

## Response

| Condition | Status | Body                                              |
|-----------|--------|----------------------------------------------------|
| Always    | 200    | `{ "paused": true, "pausedAt": "<ISO 8601 timestamp>" }` |

The handler is stateless: it does not read or write a database and does not require a request body. It exists so the frontend has a real backend call to hit when the local timer pauses; it does not yet persist a game session or verify who is calling it.

## Related

- Route: `src/backend/src/routes/game.ts`
- App wiring: `src/backend/src/app.ts` (registered under the `/api/v1` prefix)
- Test: `src/backend/test/routes/game.test.ts`
- Frontend caller: `src/frontend/providers/GameSession/GameSessionProvider.jsx`
