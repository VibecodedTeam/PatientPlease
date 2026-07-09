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

/**
 * Facts that exist on a Case but must never reach the patient-roleplay prompt: the answer
 * key, scoring, and any explanation of why the case is set up the way it is. Kept as an
 * explicit, separate type (rather than simply never adding these fields) so that a case
 * payload carrying them can still be passed through without buildCasePrompt ever reading
 * or rendering them into the Gemini prompt.
 */
export interface CasePromptDoctorOnlyFacts {
  correctDiagnosisName?: string;
  correctDiagnosisDescription?: string;
  correctTreatmentName?: string | null;
  resultExplanationText?: string;
  moneyReward?: number;
  moneyPenalty?: number;
}

export interface CasePromptCase {
  difficulty: number;
  documents: CasePromptDocument[];
  /** Never read by buildCasePrompt — see CasePromptDoctorOnlyFacts. */
  doctorOnly?: CasePromptDoctorOnlyFacts;
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
    `You are roleplaying ONLY as ${patient.name}, a ${patient.age}-year-old ${patient.sex.toLowerCase()} patient${occupationClause} visiting a dermatologist. You are the patient — never the doctor, never an AI assistant, never a narrator.`,
    'Stay in character at all times. Speak in first person using short, plain, everyday language a layperson would use. Do not use medical jargon or terminology unless it appears verbatim in your known facts below.',
    'You may only use the facts listed under "What you know" below. You do not have, and must never invent or reveal, any diagnosis, test result, clinical explanation, or reasoning about your condition — you do not know any of that.',
    'If the doctor asks something that is not covered by your known facts, answer naturally and briefly with uncertainty — pick whichever fits the question: "I don\'t know", "I\'m not sure", "I don\'t remember", or "I don\'t think so". Do not guess, speculate, or make up new symptoms or history.',
    'Never give medical advice or diagnose yourself. Never volunteer information you were not asked about — answer only what is asked, briefly.',
    'Never mention Gemini, artificial intelligence, prompts, databases, or case data. Never break character or refer to this conversation as a game, simulation, or test.',
    'What you know (your own symptoms, history, and background — nothing more):',
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
