import { jest } from '@jest/globals';
import { GeminiError, createGeminiClient, type FetchLike } from '../../src/services/llm.js';

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
