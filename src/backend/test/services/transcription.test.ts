import { Buffer } from 'node:buffer';
import { jest } from '@jest/globals';
import {
  ALLOWED_CHAT_AUDIO_MIME_TYPES,
  createWhisperClient,
  TranscriptionError,
} from '../../src/services/transcription.js';

const okResponse = (text: string) => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ text }),
});

describe('ALLOWED_CHAT_AUDIO_MIME_TYPES', () => {
  it('contains the supported browser recording types', () => {
    expect([...ALLOWED_CHAT_AUDIO_MIME_TYPES].sort()).toEqual(
      ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm'].sort(),
    );
  });
});

describe('createWhisperClient', () => {
  it('POSTs multipart to {baseUrl}/audio/transcriptions and returns the transcript', async () => {
    const fetchImpl = jest.fn(() => Promise.resolve(okResponse('hello doctor')));
    const client = createWhisperClient({
      baseUrl: 'http://localhost:8000/v1',
      model: 'whisper-1',
      fetchImpl,
    });

    const result = await client.transcribe({
      buffer: Buffer.from('bytes'),
      mimeType: 'audio/webm',
    });

    expect(result).toBe('hello doctor');
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      { method: string; body: FormData },
    ];
    expect(url).toBe('http://localhost:8000/v1/audio/transcriptions');
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.body.get('model')).toBe('whisper-1');
    expect(init.body.get('file')).toBeInstanceOf(Blob);
  });

  it('sends an Authorization header only when an apiKey is provided', async () => {
    const fetchImpl = jest.fn(() => Promise.resolve(okResponse('x')));
    const client = createWhisperClient({
      baseUrl: 'http://h/v1',
      model: 'whisper-1',
      apiKey: 'sk-test',
      fetchImpl,
    });
    await client.transcribe({ buffer: Buffer.from('b'), mimeType: 'audio/wav' });
    const [, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      { headers: Record<string, string> },
    ];
    expect(init.headers.Authorization).toBe('Bearer sk-test');
  });

  it('throws TranscriptionError on unsupported mime type', async () => {
    const client = createWhisperClient({ baseUrl: 'http://h/v1', model: 'whisper-1' });
    await expect(
      client.transcribe({ buffer: Buffer.from('b'), mimeType: 'audio/aiff' }),
    ).rejects.toBeInstanceOf(TranscriptionError);
  });

  it('throws TranscriptionError on non-ok response', async () => {
    const fetchImpl = jest.fn(() =>
      Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) }),
    );
    const client = createWhisperClient({
      baseUrl: 'http://h/v1',
      model: 'whisper-1',
      fetchImpl,
    });
    await expect(
      client.transcribe({ buffer: Buffer.from('b'), mimeType: 'audio/webm' }),
    ).rejects.toBeInstanceOf(TranscriptionError);
  });

  it('throws TranscriptionError on network failure', async () => {
    const fetchImpl = jest.fn(() => Promise.reject(new Error('boom')));
    const client = createWhisperClient({
      baseUrl: 'http://h/v1',
      model: 'whisper-1',
      fetchImpl,
    });
    await expect(
      client.transcribe({ buffer: Buffer.from('b'), mimeType: 'audio/webm' }),
    ).rejects.toBeInstanceOf(TranscriptionError);
  });

  it('throws TranscriptionError on empty transcript', async () => {
    const fetchImpl = jest.fn(() => Promise.resolve(okResponse('   ')));
    const client = createWhisperClient({
      baseUrl: 'http://h/v1',
      model: 'whisper-1',
      fetchImpl,
    });
    await expect(
      client.transcribe({ buffer: Buffer.from('b'), mimeType: 'audio/webm' }),
    ).rejects.toBeInstanceOf(TranscriptionError);
  });
});
