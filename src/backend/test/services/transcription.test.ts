import { jest } from '@jest/globals';
import {
  ALLOWED_CHAT_AUDIO_MIME_TYPES,
  TranscriptionError,
  createGoogleSpeechClient,
  type FetchLike,
} from '../../src/services/transcription.js';

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) };
}

describe('ALLOWED_CHAT_AUDIO_MIME_TYPES', () => {
  it('accepts webm, wav, mpeg, and ogg', () => {
    expect(ALLOWED_CHAT_AUDIO_MIME_TYPES.has('audio/webm')).toBe(true);
    expect(ALLOWED_CHAT_AUDIO_MIME_TYPES.has('audio/wav')).toBe(true);
    expect(ALLOWED_CHAT_AUDIO_MIME_TYPES.has('audio/mpeg')).toBe(true);
    expect(ALLOWED_CHAT_AUDIO_MIME_TYPES.has('audio/ogg')).toBe(true);
  });

  it('rejects an unsupported mime type', () => {
    expect(ALLOWED_CHAT_AUDIO_MIME_TYPES.has('audio/x-m4a')).toBe(false);
  });
});

describe('createGoogleSpeechClient', () => {
  it('sends a base64-encoded recognize request and returns the joined transcript', async () => {
    const fetchImpl: FetchLike = jest.fn(() =>
      Promise.resolve(
        jsonResponse(200, {
          results: [
            { alternatives: [{ transcript: 'Does it itch' }] },
            { alternatives: [{ transcript: 'on the left shoulder' }] },
          ],
        }),
      ),
    );
    const client = createGoogleSpeechClient({ apiKey: 'test-key', fetchImpl });

    const transcript = await client.transcribe({
      buffer: Buffer.from('audio-bytes'),
      mimeType: 'audio/webm',
    });

    expect(transcript).toBe('Does it itch on the left shoulder');
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://speech.googleapis.com/v1/speech:recognize?key=test-key',
      expect.objectContaining({ method: 'POST' }),
    );
    const call = (fetchImpl as jest.Mock).mock.calls[0] as [string, { body: string }];
    const parsedBody = JSON.parse(call[1].body) as {
      config: { encoding: string; languageCode: string };
      audio: { content: string };
    };
    expect(parsedBody.config.encoding).toBe('WEBM_OPUS');
    expect(parsedBody.config.languageCode).toBe('en-US');
    expect(parsedBody.audio.content).toBe(Buffer.from('audio-bytes').toString('base64'));
  });

  it('throws TranscriptionError for an unsupported mime type without calling fetch', async () => {
    const fetchImpl: FetchLike = jest.fn<FetchLike>();
    const client = createGoogleSpeechClient({ apiKey: 'test-key', fetchImpl });

    await expect(
      client.transcribe({ buffer: Buffer.from('x'), mimeType: 'audio/x-m4a' }),
    ).rejects.toThrow(TranscriptionError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('throws TranscriptionError when the network request fails', async () => {
    const fetchImpl: FetchLike = jest.fn(() => {
      throw new Error('network down');
    });
    const client = createGoogleSpeechClient({ apiKey: 'test-key', fetchImpl });

    await expect(
      client.transcribe({ buffer: Buffer.from('x'), mimeType: 'audio/wav' }),
    ).rejects.toThrow(TranscriptionError);
  });

  it('throws TranscriptionError when the response is not ok', async () => {
    const fetchImpl: FetchLike = jest.fn(() => Promise.resolve(jsonResponse(500, {})));
    const client = createGoogleSpeechClient({ apiKey: 'test-key', fetchImpl });

    await expect(
      client.transcribe({ buffer: Buffer.from('x'), mimeType: 'audio/wav' }),
    ).rejects.toThrow('Google Speech-to-Text returned 500');
  });

  it('throws TranscriptionError when the transcript is empty', async () => {
    const fetchImpl: FetchLike = jest.fn(() => Promise.resolve(jsonResponse(200, { results: [] })));
    const client = createGoogleSpeechClient({ apiKey: 'test-key', fetchImpl });

    await expect(
      client.transcribe({ buffer: Buffer.from('x'), mimeType: 'audio/wav' }),
    ).rejects.toThrow('Google Speech-to-Text returned an empty transcript');
  });
});
