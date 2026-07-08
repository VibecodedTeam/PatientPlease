import {
  buildCasePrompt,
  type CasePromptCase,
  type CasePromptChatMessage,
  type CasePromptPatient,
} from '../../src/services/casePrompt.js';

const PATIENT: CasePromptPatient = {
  name: 'Jan Kowalski',
  age: 52,
  sex: 'MALE',
  occupation: 'Roofer',
};

const CASE: CasePromptCase = {
  difficulty: 2,
  documents: [
    {
      type: 'CLINICAL_SYMPTOMS',
      title: 'Reported symptoms',
      content: { text: 'Itchy mole on the left shoulder' },
      imageAltText: null,
    },
    {
      type: 'SKIN_IMAGE',
      title: 'Left shoulder photo',
      content: null,
      imageAltText: 'Asymmetric brown lesion, ~8mm',
    },
  ],
};

describe('buildCasePrompt', () => {
  it('includes the patient identity and occupation in the system instruction', () => {
    const prompt = buildCasePrompt(PATIENT, CASE, []);
    expect(prompt.systemInstruction).toContain('Jan Kowalski');
    expect(prompt.systemInstruction).toContain('52-year-old male');
    expect(prompt.systemInstruction).toContain('working as a Roofer');
  });

  it('omits the occupation clause when the patient has none', () => {
    const prompt = buildCasePrompt({ ...PATIENT, occupation: null }, CASE, []);
    expect(prompt.systemInstruction).not.toContain('working as a');
  });

  it('lists every case document in the system instruction', () => {
    const prompt = buildCasePrompt(PATIENT, CASE, []);
    expect(prompt.systemInstruction).toContain('Itchy mole on the left shoulder');
    expect(prompt.systemInstruction).toContain('Asymmetric brown lesion, ~8mm');
  });

  it('falls back to a placeholder when the case has no documents', () => {
    const prompt = buildCasePrompt(PATIENT, { difficulty: 1, documents: [] }, []);
    expect(prompt.systemInstruction).toContain('(no additional documented history)');
  });

  it('maps PLAYER history to the user role and PATIENT history to the model role, in order', () => {
    const history: CasePromptChatMessage[] = [
      { sender: 'PLAYER', content: 'Does it itch?' },
      { sender: 'PATIENT', content: 'Yes, especially at night.' },
    ];
    const prompt = buildCasePrompt(PATIENT, CASE, history);
    expect(prompt.contents).toEqual([
      { role: 'user', parts: [{ text: 'Does it itch?' }] },
      { role: 'model', parts: [{ text: 'Yes, especially at night.' }] },
    ]);
  });

  it('excludes SYSTEM messages from the conversation contents', () => {
    const history: CasePromptChatMessage[] = [
      { sender: 'SYSTEM', content: 'Case started' },
      { sender: 'PLAYER', content: 'Hello' },
    ];
    const prompt = buildCasePrompt(PATIENT, CASE, history);
    expect(prompt.contents).toEqual([{ role: 'user', parts: [{ text: 'Hello' }] }]);
  });
});
