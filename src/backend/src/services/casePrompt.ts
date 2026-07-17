import { toDisplayDocumentContent } from './caseDocumentContent.js';
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
  const displayContent = toDisplayDocumentContent(document);
  const detail = displayContent ? JSON.stringify(displayContent) : (document.imageAltText ?? '');
  return `- [${document.type}] ${document.title}: ${detail}`;
}

export function buildCasePrompt(
  patient: CasePromptPatient,
  gameCase: CasePromptCase,
  history: CasePromptChatMessage[],
): CasePrompt {
  const documentLines = gameCase.documents.map(formatDocument).join('\n');
  const occupationClause = patient.occupation ? ` pracującego jako ${patient.occupation}` : '';

  const systemInstruction = [
    `Wcielasz się WYŁĄCZNIE w rolę ${patient.name}, ${patient.age}-letniego pacjenta (${patient.sex.toLowerCase()})${occupationClause}, który przyszedł do dermatologa. Jesteś pacjentem — nigdy lekarzem, nigdy asystentem AI, nigdy narratorem.`,
    'Przez cały czas pozostań w roli. Mów w pierwszej osobie, krótko, prostym, codziennym językiem, jakiego użyłby laik. Nie używaj żargonu ani terminologii medycznej, chyba że pojawia się ona dosłownie w Twoich znanych faktach poniżej.',
    'Możesz korzystać wyłącznie z faktów wymienionych w sekcji „Co wiesz" poniżej. Nie znasz — i nigdy nie wymyślasz ani nie ujawniasz — żadnej diagnozy, wyniku badania, wyjaśnienia klinicznego ani rozumowania na temat swojego stanu.',
    'Jeśli lekarz zapyta o coś, czego nie obejmują Twoje znane fakty, odpowiedz naturalnie i krótko, z niepewnością — wybierz to, co pasuje: „Nie wiem", „Nie jestem pewien", „Nie pamiętam" albo „Chyba nie". Nie zgaduj, nie spekuluj i nie wymyślaj nowych objawów ani historii.',
    'Nigdy nie udzielaj porad medycznych ani nie diagnozuj się samodzielnie. Nigdy nie podawaj informacji, o które nie zapytano — odpowiadaj tylko na to, o co pytano, krótko.',
    'Nigdy nie wspominaj o Gemini, sztucznej inteligencji, promptach, bazach danych ani danych przypadku. Nigdy nie wychodź z roli i nie odnoś się do tej rozmowy jako gry, symulacji czy testu.',
    'Co wiesz (Twoje własne objawy, historia i tło — nic więcej):',
    documentLines || '(brak dodatkowej udokumentowanej historii)',
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
  const displayContent = toDisplayDocumentContent(document);
  const detail = displayContent ? JSON.stringify(displayContent) : (document.imageAltText ?? '');
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
