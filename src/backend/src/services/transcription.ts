export interface TranscriptionAudioInput {
  buffer: Buffer;
  mimeType: string;
}

export interface TranscriptionClient {
  transcribe(input: TranscriptionAudioInput): Promise<string>;
}

export type FetchLike = (
  input: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export const ALLOWED_CHAT_AUDIO_MIME_TYPES = new Set([
  'audio/webm',
  'audio/wav',
  'audio/mpeg',
  'audio/ogg',
]);

const MIME_TO_ENCODING: Record<string, string> = {
  'audio/webm': 'WEBM_OPUS',
  'audio/wav': 'LINEAR16',
  'audio/mpeg': 'MP3',
  'audio/ogg': 'OGG_OPUS',
};

export class TranscriptionError extends Error {
  constructor(message = 'Audio transcription failed', options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'TranscriptionError';
  }
}

export interface CreateGoogleSpeechClientOptions {
  apiKey: string;
  languageCode?: string;
  fetchImpl?: FetchLike;
}

export function createGoogleSpeechClient(
  options: CreateGoogleSpeechClientOptions,
): TranscriptionClient {
  const fetchImpl = options.fetchImpl ?? fetch;
  const languageCode = options.languageCode ?? 'en-US';

  return {
    async transcribe(input: TranscriptionAudioInput): Promise<string> {
      const encoding = MIME_TO_ENCODING[input.mimeType];
      if (!encoding) {
        throw new TranscriptionError(`Unsupported audio mime type: ${input.mimeType}`);
      }

      let response: { ok: boolean; status: number; json(): Promise<unknown> };
      try {
        response = await fetchImpl(
          `https://speech.googleapis.com/v1/speech:recognize?key=${options.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              config: { encoding, languageCode },
              audio: { content: input.buffer.toString('base64') },
            }),
          },
        );
      } catch (error) {
        throw new TranscriptionError('Failed to reach Google Speech-to-Text', { cause: error });
      }

      if (!response.ok) {
        throw new TranscriptionError(`Google Speech-to-Text returned ${response.status}`);
      }

      const body = (await response.json()) as {
        results?: { alternatives?: { transcript?: string }[] }[];
      };

      const transcript = body.results
        ?.map((result) => result.alternatives?.[0]?.transcript ?? '')
        .filter(Boolean)
        .join(' ')
        .trim();

      if (!transcript) {
        throw new TranscriptionError('Google Speech-to-Text returned an empty transcript');
      }

      return transcript;
    },
  };
}
