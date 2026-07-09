export type GeminiRole = 'user' | 'model';

export interface GeminiContentPart {
  text: string;
}

export interface GeminiContent {
  role: GeminiRole;
  parts: GeminiContentPart[];
}

export type FetchLike = (
  input: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export interface GenerateReplyInput {
  systemInstruction: string;
  contents: GeminiContent[];
}

export interface GeminiClient {
  generateReply(input: GenerateReplyInput): Promise<string>;
}

export class GeminiError extends Error {
  constructor(message = 'Gemini request failed', options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'GeminiError';
  }
}

export interface CreateGeminiClientOptions {
  apiKey: string;
  model: string;
  fetchImpl?: FetchLike;
}

export function createGeminiClient(options: CreateGeminiClientOptions): GeminiClient {
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async generateReply({ systemInstruction, contents }: GenerateReplyInput): Promise<string> {
      if (contents.length === 0) {
        throw new GeminiError('Cannot generate a reply with no conversation contents');
      }

      let response: { ok: boolean; status: number; json(): Promise<unknown> };
      try {
        response = await fetchImpl(
          `https://generativelanguage.googleapis.com/v1beta/models/${options.model}:generateContent?key=${options.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemInstruction }] },
              contents,
            }),
          },
        );
      } catch (error) {
        throw new GeminiError('Failed to reach Gemini', { cause: error });
      }

      if (!response.ok) {
        throw new GeminiError(`Gemini returned ${response.status}`);
      }

      const body = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };

      const text = body.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!text) {
        throw new GeminiError('Gemini returned an empty reply');
      }

      return text;
    },
  };
}

const MOCK_PATIENT_REPLY = 'Nie jestem pewien, ale mogę powiedzieć, co zauważyłem.';

/**
 * Local/dev-only stand-in for the real Gemini client: returns a fixed patient-style
 * reply and never makes a network call. Selected via CHAT_LLM_PROVIDER=mock so the
 * chat UI/backend can still be exercised manually when the Gemini free-tier quota
 * returns 429. Must never be selected in production — the default provider is Gemini.
 */
export function createMockGeminiClient(): GeminiClient {
  return {
    generateReply(): Promise<string> {
      return Promise.resolve(MOCK_PATIENT_REPLY);
    },
  };
}
