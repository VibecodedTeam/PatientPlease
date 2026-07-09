import { jest } from '@jest/globals';
import {
  GeminiError,
  createGeminiClient,
  createMockGeminiClient,
  type FetchLike,
} from '../../src/services/llm.js';

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) };
}

describe('createGeminiClient', () => {
  it('sends the system instruction and contents, returning the reply text', async () => {
    const fetchImpl = jest.fn(() =>
      Promise.resolve(
        jsonResponse(200, {
          candidates: [{ content: { parts: [{ text: 'It itches at night.' }] } }],
        }),
      ),
    ) as unknown as FetchLike;
    const client = createGeminiClient({ apiKey: 'test-key', model: 'gemini-2.0-flash', fetchImpl });

    const reply = await client.generateReply({
      systemInstruction: 'You are the patient.',
      contents: [{ role: 'user', parts: [{ text: 'Does it itch?' }] }],
    });

    expect(reply).toBe('It itches at night.');
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=test-key',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws GeminiError when there are no conversation contents', async () => {
    const fetchImpl = jest.fn() as unknown as FetchLike;
    const client = createGeminiClient({ apiKey: 'test-key', model: 'gemini-2.0-flash', fetchImpl });

    await expect(
      client.generateReply({ systemInstruction: 'You are the patient.', contents: [] }),
    ).rejects.toThrow(GeminiError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('throws GeminiError when the network request fails', async () => {
    const fetchImpl = jest.fn(() => {
      throw new Error('network down');
    }) as unknown as FetchLike;
    const client = createGeminiClient({ apiKey: 'test-key', model: 'gemini-2.0-flash', fetchImpl });

    await expect(
      client.generateReply({
        systemInstruction: 'x',
        contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
      }),
    ).rejects.toThrow(GeminiError);
  });

  it('throws GeminiError when the response is not ok', async () => {
    const fetchImpl = jest.fn(() => Promise.resolve(jsonResponse(429, {}))) as unknown as FetchLike;
    const client = createGeminiClient({ apiKey: 'test-key', model: 'gemini-2.0-flash', fetchImpl });

    await expect(
      client.generateReply({
        systemInstruction: 'x',
        contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
      }),
    ).rejects.toThrow('Gemini returned 429');
  });

  it('throws GeminiError when the reply text is empty', async () => {
    const fetchImpl = jest.fn(() =>
      Promise.resolve(jsonResponse(200, { candidates: [] })),
    ) as unknown as FetchLike;
    const client = createGeminiClient({ apiKey: 'test-key', model: 'gemini-2.0-flash', fetchImpl });

    await expect(
      client.generateReply({
        systemInstruction: 'x',
        contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
      }),
    ).rejects.toThrow('Gemini returned an empty reply');
  });
});

describe('createMockGeminiClient', () => {
  it('returns a fixed patient-style reply without calling fetch', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const client = createMockGeminiClient();

    const reply = await client.generateReply({
      systemInstruction: 'You are the patient.',
      contents: [{ role: 'user', parts: [{ text: 'Does it itch?' }] }],
    });

    expect(reply).toBe('Nie jestem pewien, ale mogę powiedzieć, co zauważyłem.');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

const geminiJsonResponse = (text: string) => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ candidates: [{ content: { parts: [{ text }] } }] }),
});

describe('createGeminiClient.selectRelevantDocumentIds', () => {
  const input = {
    systemInstruction: 'classify',
    contents: [{ role: 'user' as const, parts: [{ text: 'x' }] }],
  };

  it('parses a JSON array of ids from the response', async () => {
    const fetchImpl = jest.fn(() => Promise.resolve(geminiJsonResponse('["doc-1","doc-2"]')));
    const client = createGeminiClient({
      apiKey: 'k',
      model: 'gemini-2.0-flash',
      fetchImpl: fetchImpl,
    });
    await expect(client.selectRelevantDocumentIds(input)).resolves.toEqual(['doc-1', 'doc-2']);
    const sentBody = JSON.parse(
      (fetchImpl.mock.calls[0] as unknown as [string, { body: string }])[1].body,
    ) as { generationConfig: { responseMimeType: string } };
    expect(sentBody.generationConfig.responseMimeType).toBe('application/json');
  });

  it('returns [] when the model returns an empty array', async () => {
    const fetchImpl = jest.fn(() => Promise.resolve(geminiJsonResponse('[]')));
    const client = createGeminiClient({
      apiKey: 'k',
      model: 'gemini-2.0-flash',
      fetchImpl: fetchImpl,
    });
    await expect(client.selectRelevantDocumentIds(input)).resolves.toEqual([]);
  });

  it('throws GeminiError on non-ok response', async () => {
    const fetchImpl = jest.fn(() =>
      Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) }),
    );
    const client = createGeminiClient({
      apiKey: 'k',
      model: 'gemini-2.0-flash',
      fetchImpl: fetchImpl,
    });
    await expect(client.selectRelevantDocumentIds(input)).rejects.toThrow();
  });

  it('throws GeminiError when the response is not valid JSON array', async () => {
    const fetchImpl = jest.fn(() => Promise.resolve(geminiJsonResponse('not json')));
    const client = createGeminiClient({
      apiKey: 'k',
      model: 'gemini-2.0-flash',
      fetchImpl: fetchImpl,
    });
    await expect(client.selectRelevantDocumentIds(input)).rejects.toThrow();
  });
});

describe('createMockGeminiClient.selectRelevantDocumentIds', () => {
  it('returns an empty array without calling the network', async () => {
    await expect(
      createMockGeminiClient().selectRelevantDocumentIds({ systemInstruction: '', contents: [] }),
    ).resolves.toEqual([]);
  });
});
