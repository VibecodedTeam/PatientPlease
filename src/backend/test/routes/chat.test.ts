import { jest } from '@jest/globals';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/db/prisma.js';
import type { GoogleIdTokenVerifier } from '../../src/services/auth.js';
import { GeminiError, type GeminiClient } from '../../src/services/llm.js';
import { TranscriptionError, type TranscriptionClient } from '../../src/services/transcription.js';

function extractSessionCookie(response: {
  headers: { 'set-cookie'?: string | string[] | undefined };
}): string {
  const header = response.headers['set-cookie'];
  const raw = Array.isArray(header) ? header[0] : header;
  const match = /session=([^;]+)/.exec(String(raw));
  if (!match?.[1]) {
    throw new Error('session cookie not set on response');
  }
  return `session=${match[1]}`;
}

const VALID_PAYLOAD = {
  sub: 'google-chat-1',
  email: 'doctor-chat@example.test',
  email_verified: true,
  name: 'Doctor Test',
};

function createGoogleClient(payload: Record<string, unknown> | undefined): GoogleIdTokenVerifier {
  return { verifyIdToken: jest.fn(() => Promise.resolve({ getPayload: () => payload })) };
}

function createFakeGeminiClient(reply: string): GeminiClient {
  return {
    generateReply: jest.fn(() => Promise.resolve(reply)),
    selectRelevantDocumentIds: jest.fn(() => Promise.resolve([])),
  };
}

function createFakeTranscriptionClient(transcript: string): TranscriptionClient {
  return { transcribe: jest.fn(() => Promise.resolve(transcript)) };
}

async function signIn(app: FastifyInstance): Promise<{ cookie: string; userId: string }> {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/google',
    payload: { idToken: 'raw' },
  });
  const body = response.json<{ user: { id: string } }>();
  return { cookie: extractSessionCookie(response), userId: body.user.id };
}

async function createDiagnosis() {
  return prisma.diagnosis.create({
    data: { code: 'MELANOMA', name: 'Melanoma', description: 'test', category: 'MALIGNANT' },
  });
}

async function createTreatment() {
  return prisma.treatment.create({
    data: { code: 'REFER_ONCO', name: 'Refer to oncology', description: 'test', kind: 'REFERRAL' },
  });
}

async function createCase(diagnosisId: string, treatmentId: string) {
  const patient = await prisma.patient.create({
    data: {
      name: 'Jan Kowalski',
      age: 52,
      sex: 'MALE',
      occupation: 'Roofer',
      portraitImageUrl: 'https://cdn.example.test/jan.png',
      bodyModelVariant: 'male_average_01',
    },
  });
  return prisma.case.create({
    data: {
      patientId: patient.id,
      difficulty: 1,
      correctDiagnosisId: diagnosisId,
      correctTreatmentId: treatmentId,
      moneyReward: 50,
      moneyPenalty: 20,
      resultExplanationText: 'It was melanoma.',
    },
  });
}

describe('POST /api/v1/chat', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    await prisma.chatMessage.deleteMany({});
    await prisma.case.deleteMany({});
    await prisma.patient.deleteMany({});
    await prisma.gameSession.deleteMany({});
    await prisma.userSession.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.diagnosis.deleteMany({});
    await prisma.treatment.deleteMany({});
    await app.close();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('returns 401 with no session cookie', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();

    const form = new FormData();
    form.append('gameSessionId', 'irrelevant');
    form.append('caseId', 'irrelevant');
    form.append('text', 'Hello');

    const response = await app.inject({ method: 'POST', url: '/api/v1/chat', payload: form });

    expect(response.statusCode).toBe(401);
  });

  it('returns 400 when both text and audio are provided', async () => {
    app = buildApp({
      googleClient: createGoogleClient(VALID_PAYLOAD),
      geminiClient: createFakeGeminiClient('unused'),
      transcriptionClient: createFakeTranscriptionClient('unused'),
    });
    await app.ready();
    const { cookie } = await signIn(app);

    const form = new FormData();
    form.append('gameSessionId', 'irrelevant');
    form.append('caseId', 'irrelevant');
    form.append('text', 'Hello');
    form.append(
      'audio',
      new Blob([Buffer.from('fake-audio')], { type: 'audio/webm' }),
      'clip.webm',
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/chat',
      headers: { cookie },
      payload: form,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: 'invalid_input',
      message: 'Provide exactly one of text or audio',
    });
  });

  it('returns 400 when neither text nor audio is provided', async () => {
    app = buildApp({
      googleClient: createGoogleClient(VALID_PAYLOAD),
      geminiClient: createFakeGeminiClient('unused'),
      transcriptionClient: createFakeTranscriptionClient('unused'),
    });
    await app.ready();
    const { cookie } = await signIn(app);

    const form = new FormData();
    form.append('gameSessionId', 'irrelevant');
    form.append('caseId', 'irrelevant');

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/chat',
      headers: { cookie },
      payload: form,
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 400 for an unsupported audio mime type', async () => {
    app = buildApp({
      googleClient: createGoogleClient(VALID_PAYLOAD),
      geminiClient: createFakeGeminiClient('unused'),
      transcriptionClient: createFakeTranscriptionClient('unused'),
    });
    await app.ready();
    const { cookie } = await signIn(app);

    const form = new FormData();
    form.append('gameSessionId', 'irrelevant');
    form.append('caseId', 'irrelevant');
    form.append(
      'audio',
      new Blob([Buffer.from('fake-audio')], { type: 'audio/x-m4a' }),
      'clip.m4a',
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/chat',
      headers: { cookie },
      payload: form,
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 404 when the GameSession does not belong to the caller', async () => {
    app = buildApp({
      googleClient: createGoogleClient(VALID_PAYLOAD),
      geminiClient: createFakeGeminiClient('unused'),
      transcriptionClient: createFakeTranscriptionClient('unused'),
    });
    await app.ready();
    const { cookie } = await signIn(app);
    const diagnosis = await createDiagnosis();
    const treatment = await createTreatment();
    const gameCase = await createCase(diagnosis.id, treatment.id);

    const otherUser = await prisma.user.create({
      data: { googleId: 'other-google-id', email: 'other@example.test', name: 'Other Doctor' },
    });
    const otherSession = await prisma.gameSession.create({ data: { userId: otherUser.id } });

    const form = new FormData();
    form.append('gameSessionId', otherSession.id);
    form.append('caseId', gameCase.id);
    form.append('text', 'Hello');

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/chat',
      headers: { cookie },
      payload: form,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'game_session_not_found' });
  });

  it('sends a text message and persists both the player message and the AI reply', async () => {
    // Captured as a local so the assertion below reads the mock directly rather than through
    // `geminiClient.generateReply` — GeminiClient declares `generateReply` with method shorthand,
    // and property access on it trips @typescript-eslint/no-unbound-method.
    const generateReply = jest.fn<GeminiClient['generateReply']>(() =>
      Promise.resolve('It itches at night.'),
    );
    const geminiClient: GeminiClient = {
      generateReply,
      selectRelevantDocumentIds: jest.fn(() => Promise.resolve([])),
    };
    app = buildApp({
      googleClient: createGoogleClient(VALID_PAYLOAD),
      geminiClient,
      transcriptionClient: createFakeTranscriptionClient('unused'),
    });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    const diagnosis = await createDiagnosis();
    const treatment = await createTreatment();
    const gameCase = await createCase(diagnosis.id, treatment.id);
    const gameSession = await prisma.gameSession.create({ data: { userId } });

    const form = new FormData();
    form.append('gameSessionId', gameSession.id);
    form.append('caseId', gameCase.id);
    form.append('text', 'Does it itch?');

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/chat',
      headers: { cookie },
      payload: form,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{ chatMessages: { sender: string; content: string }[] }>();
    expect(body.chatMessages).toHaveLength(2);
    expect(body.chatMessages[0]).toMatchObject({ sender: 'PLAYER', content: 'Does it itch?' });
    expect(body.chatMessages[1]).toMatchObject({
      sender: 'PATIENT',
      content: 'It itches at night.',
    });
    expect(generateReply).toHaveBeenCalledTimes(1);

    const stored = await prisma.chatMessage.findMany({
      where: { gameSessionId: gameSession.id, caseId: gameCase.id },
    });
    expect(stored).toHaveLength(2);
  });

  it('sends an audio message, transcribes it, and never persists the raw audio bytes', async () => {
    // Same reasoning as above: capture the mocks as locals so the assertions read them directly
    // instead of via `transcriptionClient.transcribe`/`geminiClient.generateReply` property access.
    const transcribe = jest.fn<TranscriptionClient['transcribe']>(() =>
      Promise.resolve('Does it itch?'),
    );
    const transcriptionClient: TranscriptionClient = { transcribe };
    const generateReply = jest.fn<GeminiClient['generateReply']>(() =>
      Promise.resolve('It itches at night.'),
    );
    const geminiClient: GeminiClient = {
      generateReply,
      selectRelevantDocumentIds: jest.fn(() => Promise.resolve([])),
    };
    app = buildApp({
      googleClient: createGoogleClient(VALID_PAYLOAD),
      geminiClient,
      transcriptionClient,
    });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    const diagnosis = await createDiagnosis();
    const treatment = await createTreatment();
    const gameCase = await createCase(diagnosis.id, treatment.id);
    const gameSession = await prisma.gameSession.create({ data: { userId } });

    const form = new FormData();
    form.append('gameSessionId', gameSession.id);
    form.append('caseId', gameCase.id);
    form.append(
      'audio',
      new Blob([Buffer.from('fake-audio-bytes')], { type: 'audio/webm' }),
      'clip.webm',
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/chat',
      headers: { cookie },
      payload: form,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{ chatMessages: { sender: string; content: string }[] }>();
    expect(body.chatMessages[0]).toMatchObject({ sender: 'PLAYER', content: 'Does it itch?' });
    expect(transcribe).toHaveBeenCalledTimes(1);

    const stored = await prisma.chatMessage.findMany({
      where: { gameSessionId: gameSession.id, caseId: gameCase.id },
    });
    expect(stored.every((message) => !message.content.includes('fake-audio-bytes'))).toBe(true);
  });

  it('returns 502 when transcription fails', async () => {
    const transcriptionClient: TranscriptionClient = {
      transcribe: jest.fn(() => Promise.reject(new TranscriptionError('upstream down'))),
    };
    app = buildApp({
      googleClient: createGoogleClient(VALID_PAYLOAD),
      geminiClient: createFakeGeminiClient('unused'),
      transcriptionClient,
    });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    const diagnosis = await createDiagnosis();
    const treatment = await createTreatment();
    const gameCase = await createCase(diagnosis.id, treatment.id);
    const gameSession = await prisma.gameSession.create({ data: { userId } });

    const form = new FormData();
    form.append('gameSessionId', gameSession.id);
    form.append('caseId', gameCase.id);
    form.append(
      'audio',
      new Blob([Buffer.from('fake-audio')], { type: 'audio/webm' }),
      'clip.webm',
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/chat',
      headers: { cookie },
      payload: form,
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({ error: 'transcription_failed' });
  });

  it('uses the mock LLM and never calls Gemini when CHAT_LLM_PROVIDER=mock, without needing GEMINI_API_KEY', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const previousProvider = process.env['CHAT_LLM_PROVIDER'];
    const previousApiKey = process.env['GEMINI_API_KEY'];
    process.env['CHAT_LLM_PROVIDER'] = 'mock';
    delete process.env['GEMINI_API_KEY'];

    try {
      // No geminiClient override here — this exercises app.ts's real default wiring.
      app = buildApp({
        googleClient: createGoogleClient(VALID_PAYLOAD),
        transcriptionClient: createFakeTranscriptionClient('unused'),
      });
      await app.ready();
      const { cookie, userId } = await signIn(app);
      const diagnosis = await createDiagnosis();
      const treatment = await createTreatment();
      const gameCase = await createCase(diagnosis.id, treatment.id);
      const gameSession = await prisma.gameSession.create({ data: { userId } });

      const form = new FormData();
      form.append('gameSessionId', gameSession.id);
      form.append('caseId', gameCase.id);
      form.append('text', 'Does it itch?');

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/chat',
        headers: { cookie },
        payload: form,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json<{ chatMessages: { sender: string; content: string }[] }>();
      expect(body.chatMessages[1]).toMatchObject({
        sender: 'PATIENT',
        content: 'Nie jestem pewien, ale mogę powiedzieć, co zauważyłem.',
      });

      const stored = await prisma.chatMessage.findMany({
        where: { gameSessionId: gameSession.id, caseId: gameCase.id },
      });
      expect(stored).toHaveLength(2);
      expect(fetchSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('generativelanguage.googleapis.com'),
        expect.anything(),
      );
    } finally {
      fetchSpy.mockRestore();
      if (previousProvider === undefined) {
        delete process.env['CHAT_LLM_PROVIDER'];
      } else {
        process.env['CHAT_LLM_PROVIDER'] = previousProvider;
      }
      if (previousApiKey !== undefined) {
        process.env['GEMINI_API_KEY'] = previousApiKey;
      }
    }
  });

  it('returns 502 when Gemini fails', async () => {
    const geminiClient: GeminiClient = {
      generateReply: jest.fn(() => Promise.reject(new GeminiError('quota exceeded'))),
      selectRelevantDocumentIds: jest.fn(() => Promise.resolve([])),
    };
    app = buildApp({
      googleClient: createGoogleClient(VALID_PAYLOAD),
      geminiClient,
      transcriptionClient: createFakeTranscriptionClient('unused'),
    });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    const diagnosis = await createDiagnosis();
    const treatment = await createTreatment();
    const gameCase = await createCase(diagnosis.id, treatment.id);
    const gameSession = await prisma.gameSession.create({ data: { userId } });

    const form = new FormData();
    form.append('gameSessionId', gameSession.id);
    form.append('caseId', gameCase.id);
    form.append('text', 'Hello');

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/chat',
      headers: { cookie },
      payload: form,
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({ error: 'llm_failed' });
  });
});
