import type { GeminiContent } from './llm.js';

export interface CasePromptPatient {
  name: string;
  age: number;
  sex: string;
  occupation: string | null;
}

export interface CasePromptDocument {
  type: string;
  title: string;
  content: unknown;
  imageAltText: string | null;
}

export interface CasePromptCase {
  difficulty: number;
  documents: CasePromptDocument[];
}

export type ChatSenderValue = 'PLAYER' | 'PATIENT' | 'SYSTEM';

export interface CasePromptChatMessage {
  sender: ChatSenderValue;
  content: string;
}

export interface CasePrompt {
  systemInstruction: string;
  contents: GeminiContent[];
}

function formatDocument(document: CasePromptDocument): string {
  const detail = document.content
    ? JSON.stringify(document.content)
    : (document.imageAltText ?? '');
  return `- [${document.type}] ${document.title}: ${detail}`;
}

export function buildCasePrompt(
  patient: CasePromptPatient,
  gameCase: CasePromptCase,
  history: CasePromptChatMessage[],
): CasePrompt {
  const documentLines = gameCase.documents.map(formatDocument).join('\n');
  const occupationClause = patient.occupation ? ` working as a ${patient.occupation}` : '';

  const systemInstruction = [
    `You are ${patient.name}, a ${patient.age}-year-old ${patient.sex.toLowerCase()} patient${occupationClause} visiting a dermatologist.`,
    "Answer the doctor's questions in character, using only the medical facts below. Do not reveal a diagnosis or use medical terminology a layperson would not know.",
    'Known facts about your case:',
    documentLines || '(no additional documented history)',
  ].join('\n\n');

  const contents: GeminiContent[] = history
    .filter((message) => message.sender !== 'SYSTEM')
    .map((message) => ({
      role: message.sender === 'PLAYER' ? 'user' : 'model',
      parts: [{ text: message.content }],
    }));

  return { systemInstruction, contents };
}
