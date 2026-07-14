# 0008: Whisper transcription + two-stage Gemini chat (reply + document reveal)

## Status
Accepted

## Context
`POST /api/v1/chat` (introduced on `feat-45-chat-voice-backend`) originally transcribed player
audio via Google Cloud Speech-to-Text and used Gemini only to generate the patient's in-character
reply. Two problems drove this change:

1. **Vendor lock-in on transcription.** Google Cloud Speech-to-Text ties the project to a paid
   Google API for a feature (speech-to-text) that open-source, self-hostable models (Whisper)
   handle well, with no code change required to switch server implementations.
2. **The chat window had no way to surface case documents.** The player's exam desk
   (`PatientDocuments`) already renders `CaseDocument` rows returned by `POST /api/v1/round`, but
   nothing let a patient's spoken answer *unlock* a document mid-conversation (e.g. the patient
   mentioning "it started itching last month" should be able to reveal a symptom-history
   document) the way a real intake conversation would.

## Decision

**Transcription: swap Google Speech for an OpenAI-compatible Whisper client.**
`src/backend/src/services/transcription.ts`'s `createGoogleSpeechClient` was replaced by
`createWhisperClient`, which POSTs multipart form data (`model`, optional `language`, `file`) to
`${WHISPER_BASE_URL}/audio/transcriptions` and reads `{ text }` from the JSON response — the same
request shape OpenAI's own Whisper API, `whisper.cpp` server, `faster-whisper-server`, and LocalAI
all implement. Configuration is three env vars resolved in `config.ts`: `WHISPER_BASE_URL`
(required, throws if unset), `WHISPER_MODEL` (defaults to `whisper-1`), and `WHISPER_API_KEY`
(optional — most self-hosted servers need no key; only sent as `Authorization: Bearer <key>` when
set). The `TranscriptionClient` interface (`transcribe({ buffer, mimeType }): Promise<string>`),
`ALLOWED_CHAT_AUDIO_MIME_TYPES`, and `TranscriptionError` are unchanged, so `routes/chat.ts` and
`services/chat.ts` needed no edits — only `app.ts`'s wiring and `config.ts`'s resolvers changed.
Gemini remains the answer engine; this swap is transcription-only.

**Reveal: a second, best-effort Gemini call per chat turn.**
After Gemini generates the patient's reply (`GeminiClient.generateReply`), the service makes a
second call, `GeminiClient.selectRelevantDocumentIds`, to a purpose-built classifier prompt
(`buildDocumentSelectionPrompt` in `casePrompt.ts`) that lists every one of the case's documents
by id, title, type, and content/alt-text, plus the doctor's question and the patient's just-
generated reply, and asks for a JSON array of the document ids that reply relates to. The real
client requests `responseMimeType: 'application/json'` with a string-array `responseSchema` so
Gemini's structured-output mode does the JSON-shape enforcement instead of prompt engineering
alone; `createMockGeminiClient` returns `[]` so the `mock` chat LLM provider still exercises the
full flow offline. Like the reply prompt, the selection prompt only ever sees patient-visible
document fields — never diagnosis/treatment answer-key data.

**Persistence: `CaseDocumentReveal`, deduped per session.**
A new Prisma model, `CaseDocumentReveal { id, gameSessionId, caseId, caseDocumentId, revealedAt }`
with a unique constraint on `(gameSessionId, caseDocumentId)`, records which documents a game
session has unlocked. Each turn: ids Gemini returns are filtered to only those that are (a) among
the case's real document ids (`validIds`, built from `gameCase.documents` — drops hallucinated
ids Gemini might return) and (b) not already present in a prior `CaseDocumentReveal` row for this
`(gameSessionId, caseId)` (drops re-reveals). Surviving ids are persisted as new
`CaseDocumentReveal` rows and returned as `revealedDocuments` in the response, mapped to the same
per-document shape `POST /api/v1/round` uses for `case.documents`, filtered from
`gameCase.documents` (not from Gemini's arbitrary output order) so ordering stays stable for the
frontend.

**Degrade gracefully — reveal never blocks the reply.** The entire selection → validate → dedupe
→ persist sequence is wrapped in a single `try/catch` in `sendChatMessage`; any failure (Gemini
429/500, malformed JSON, a `caseDocumentReveal` write failing) is swallowed to
`revealedDocuments: []`. The chat messages persisted in the steps before that point are
unaffected, and the endpoint still returns `200`. This was a deliberate trade: a chat turn's core
job is the reply, not document unlocking, so a flaky classifier call should degrade the UX (one
fewer document reveal, silently retried on a later turn once the corroborating detail comes up
again) rather than fail the whole turn.

**Rejected: a single combined Gemini call for reply + document selection.** Structured-output
schemas can express "reply text + array of ids" in one response, which would halve the per-turn
Gemini calls/latency/quota. Rejected for now because it couples two independently-failing
concerns (persona roleplay quality vs. classification accuracy) into one call whose failure mode
would have to be handled as "did the reply fail, or just the classification within it," and the
two-call best-effort split makes that distinction free. If Gemini quota/cost becomes a problem,
this is the first thing to revisit.

## Consequences
- New required/optional env vars: `WHISPER_BASE_URL` (required), `WHISPER_MODEL` (optional,
  defaults `whisper-1`), `WHISPER_API_KEY` (optional) — replace `GOOGLE_SPEECH_API_KEY` in
  `.env.example`. `GEMINI_API_KEY`/`GEMINI_MODEL` are unchanged.
- A new migration (`add_case_document_reveal`) and Prisma model with back-relations on
  `CaseDocument`, `Case`, and `GameSession`.
- Every chat turn now makes two Gemini calls instead of one, roughly doubling Gemini
  latency/quota usage per turn — mitigated by the reveal call being best-effort and by
  `responseSchema`-constrained output reducing retries from malformed responses.
- Whisper hosting (running `whisper.cpp` server, `faster-whisper-server`, LocalAI, or a hosted
  OpenAI-compatible endpoint) is the operator's responsibility; the backend has no opinion beyond
  the `/audio/transcriptions` contract.
- `docs/api/chat.md`'s 200 response shape gained `revealedDocuments`; no other endpoint's
  contract changed.

## Related
- `docs/api/chat.md`
- `src/backend/src/services/transcription.ts`, `src/backend/src/services/llm.ts`,
  `src/backend/src/services/casePrompt.ts`, `src/backend/src/services/chat.ts`
- `src/backend/src/routes/chat.ts`, `src/backend/src/app.ts`, `src/backend/src/config.ts`
- `src/backend/prisma/schema/documentation.prisma` (`CaseDocumentReveal`)
- `src/backend/test/services/transcription.test.ts`, `test/services/llm.test.ts`,
  `test/services/casePrompt.test.ts`, `test/services/chat.test.ts`, `test/routes/chat.test.ts`,
  `test/db/schema.test.ts`
