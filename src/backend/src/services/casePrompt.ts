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
    'Always respond in Polish (Polski), no matter what language the doctor writes in. Every instruction in this prompt still applies exactly as written — this only fixes the language of your replies.',
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

export interface DocumentSelectionDocument {
  id: string;
  type: string;
  title: string;
  content: unknown;
  imageAltText: string | null;
}

function formatSelectionDocument(document: DocumentSelectionDocument): string {
  const detail = document.content
    ? JSON.stringify(document.content)
    : (document.imageAltText ?? '');
  return `- id=${document.id} [${document.type}] ${document.title}: ${detail}`;
}

/**
 * Second-stage prompt: given the case's patient-visible documents and the patient's latest
 * spoken reply, ask Gemini which documents that reply relates to. Returns a structured prompt
 * whose expected response is a JSON array of document ids drawn ONLY from the provided list.
 * Carries no answer-key/diagnosis facts — it only ever sees the same patient-visible documents.
 */
export function buildDocumentSelectionPrompt(
  documents: DocumentSelectionDocument[],
  patientReply: string,
  playerText: string,
): CasePrompt {
  const documentLines = documents.map(formatSelectionDocument).join('\n');
  const systemInstruction = [
    'You are a silent classifier for a medical case game. You never talk to the user.',
    'You are given a list of case documents (each with an id) and the latest exchange between a doctor and a patient.',
    'Return the ids of the documents whose information is referenced by, corroborated by, or directly relevant to the PATIENT reply.',
    'Only return ids that appear verbatim in the list below. If none are relevant, return an empty array.',
    'Respond with ONLY a JSON array of id strings, e.g. ["<id>", "<id>"]. No prose, no explanation.',
    'Documents:',
    documentLines || '(none)',
  ].join('\n\n');

  const contents: GeminiContent[] = [
    { role: 'user', parts: [{ text: `Doctor asked: ${playerText}` }] },
    { role: 'user', parts: [{ text: `Patient replied: ${patientReply}` }] },
  ];

  return { systemInstruction, contents };
}
