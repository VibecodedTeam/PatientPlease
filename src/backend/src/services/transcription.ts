export interface TranscriptionAudioInput {
  buffer: Buffer;
  mimeType: string;
}

export interface TranscriptionClient {
  transcribe(input: TranscriptionAudioInput): Promise<string>;
}

export type WhisperFetchLike = (
  input: string,
  init: { method: string; headers: Record<string, string>; body: FormData },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export const ALLOWED_CHAT_AUDIO_MIME_TYPES = new Set([
  'audio/webm',
  'audio/wav',
  'audio/mpeg',
  'audio/ogg',
]);

const MIME_TO_FILENAME: Record<string, string> = {
  'audio/webm': 'clip.webm',
  'audio/wav': 'clip.wav',
  'audio/mpeg': 'clip.mp3',
  'audio/ogg': 'clip.ogg',
};

export class TranscriptionError extends Error {
  constructor(message = 'Audio transcription failed', options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'TranscriptionError';
  }
}

export interface CreateWhisperClientOptions {
  baseUrl: string;
  model: string;
  apiKey?: string;
  languageCode?: string;
  fetchImpl?: WhisperFetchLike;
}

export function createWhisperClient(options: CreateWhisperClientOptions): TranscriptionClient {
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async transcribe(input: TranscriptionAudioInput): Promise<string> {
      const filename = MIME_TO_FILENAME[input.mimeType];
      if (!filename) {
        throw new TranscriptionError(`Unsupported audio mime type: ${input.mimeType}`);
      }

      const form = new FormData();
      form.append('model', options.model);
      form.append('response_format', 'json');
      if (options.languageCode) {
        form.append('language', options.languageCode);
      }
      form.append(
        'file',
        new Blob([Uint8Array.from(input.buffer)], { type: input.mimeType }),
        filename,
      );

      const headers: Record<string, string> = {};
      if (options.apiKey) {
        headers.Authorization = `Bearer ${options.apiKey}`;
      }

      let response: { ok: boolean; status: number; json(): Promise<unknown> };
      try {
        response = await fetchImpl(`${options.baseUrl}/audio/transcriptions`, {
          method: 'POST',
          headers,
          body: form,
        });
      } catch (error) {
        throw new TranscriptionError('Failed to reach the Whisper server', { cause: error });
      }

      if (!response.ok) {
        throw new TranscriptionError(`Whisper server returned ${response.status}`);
      }

      const body = (await response.json()) as { text?: string };
      const transcript = body.text?.trim();
      if (!transcript) {
        throw new TranscriptionError('Whisper server returned an empty transcript');
      }
      return transcript;
    },
  };
}
