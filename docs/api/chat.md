# Chat: Send a Message to the Patient

Backend endpoint the frontend calls from `MainView`'s chat/dialogue window to send the player's
question to the patient — as typed text or a recorded voice clip — and receive the patient's
(AI-generated) reply. Gated by `gameSessionId` (must belong to the caller) and `caseId` (must
exist). The raw audio file is never stored; only its transcript is persisted.

## `POST /api/v1/chat`

### Request

    POST /api/v1/chat
    Cookie: session=<...>
    Content-Type: multipart/form-data; boundary=...

    gameSessionId: <uuid>
    caseId: <uuid>
    text: <string>          # exactly one of `text` or `audio`
    audio: <file>            # audio/webm | audio/wav | audio/mpeg | audio/ogg, max 10 MiB (CHAT_AUDIO_MAX_BYTES)

### Response

| Condition | Status | Body |
|---|---|---|
| No/invalid session cookie | 401 | `{ "error": "unauthenticated" }` |
| Missing `gameSessionId`/`caseId`, both/neither `text`+`audio`, unsupported audio mime type, or audio exceeds the size limit | 400 | `{ "error": "invalid_input", "message": "..." }` |
| `gameSessionId` does not exist or does not belong to the caller | 404 | `{ "error": "game_session_not_found" }` |
| `caseId` does not exist | 404 | `{ "error": "case_not_found" }` |
| Whisper transcription request failed | 502 | `{ "error": "transcription_failed" }` |
| Gemini request failed | 502 | `{ "error": "llm_failed" }` |
| Success | 200 | see shape below |

```jsonc
{
  "chatMessages": [
    { "id": "uuid", "sender": "PLAYER", "content": "Does it itch?", "sentAt": "iso-datetime", "sortOrder": 2 },
    { "id": "uuid", "sender": "PATIENT", "content": "Yes, especially at night.", "sentAt": "iso-datetime", "sortOrder": 3 }
  ]
}
```

## Orchestration

1. Resolve the caller (`request.getCurrentUser()`) — `401` if absent.
2. Parse the multipart body. Exactly one of `text`/`audio` must be present — `400` otherwise.
3. If `audio`: validate its mime type against `audio/webm`, `audio/wav`, `audio/mpeg`, `audio/ogg`
   (`400` if unsupported or oversized), then transcribe it via an open-source Whisper server
   (OpenAI-compatible `/audio/transcriptions` endpoint, configured via `WHISPER_BASE_URL`)
   (`502` on failure). The transcript becomes the player's message text.
4. Look up the `GameSession` by `gameSessionId` and confirm it belongs to the caller (`404`
   otherwise). Look up the `Case` by `caseId` (`404` if missing).
5. Load every prior `ChatMessage` for this `(gameSessionId, caseId)` pair, ordered by `sortOrder`
   — no windowing or truncation.
6. Persist the player's message as a new `ChatMessage` (`sender: PLAYER`).
7. Build a Gemini prompt from the patient's identity, the case's documents (disease history, UV
   exposure, symptoms, family history, weather history), and the full chat history including the
   just-persisted player message.
8. Call Gemini for a reply (`502` on failure) and persist it as a new `ChatMessage`
   (`sender: PATIENT`).
9. Return both new messages.

## Related

- Route: `src/backend/src/routes/chat.ts`
- Business logic: `src/backend/src/services/chat.ts`, `src/backend/src/services/casePrompt.ts`
- External clients: `src/backend/src/services/transcription.ts` (Whisper, OpenAI-compatible
  `/audio/transcriptions` endpoint), `src/backend/src/services/llm.ts` (Gemini)
- App wiring: `src/backend/src/app.ts`
- Tests: `src/backend/test/routes/chat.test.ts`, `src/backend/test/services/chat.test.ts`,
  `src/backend/test/services/casePrompt.test.ts`, `src/backend/test/services/transcription.test.ts`,
  `src/backend/test/services/llm.test.ts`
- ADR: `docs/architecture/0008-chat-transcription-and-gemini-services.md`
