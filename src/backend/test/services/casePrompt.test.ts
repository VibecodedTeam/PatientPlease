import {
  buildCasePrompt,
  buildDocumentSelectionPrompt,
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
    expect(prompt.systemInstruction).toContain('52-letniego pacjenta (male)');
    expect(prompt.systemInstruction).toContain('pracującego jako Roofer');
  });

  it('omits the occupation clause when the patient has none', () => {
    const prompt = buildCasePrompt({ ...PATIENT, occupation: null }, CASE, []);
    expect(prompt.systemInstruction).not.toContain('pracującego jako');
  });

  it('lists every case document in the system instruction', () => {
    const prompt = buildCasePrompt(PATIENT, CASE, []);
    expect(prompt.systemInstruction).toContain('Itchy mole on the left shoulder');
    expect(prompt.systemInstruction).toContain('Asymmetric brown lesion, ~8mm');
  });

  it('falls back to a placeholder when the case has no documents', () => {
    const prompt = buildCasePrompt(PATIENT, { difficulty: 1, documents: [] }, []);
    expect(prompt.systemInstruction).toContain('(brak dodatkowej udokumentowanej historii)');
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

  it('instructs the model to roleplay strictly as the patient, never as the doctor or an AI', () => {
    const prompt = buildCasePrompt(PATIENT, CASE, []);
    expect(prompt.systemInstruction).toContain('nigdy lekarzem');
    expect(prompt.systemInstruction).toContain('nigdy asystentem AI');
    expect(prompt.systemInstruction).toContain('pozostań w roli');
  });

  it('instructs the model to answer with natural uncertainty when a fact is not known', () => {
    const prompt = buildCasePrompt(PATIENT, CASE, []);
    expect(prompt.systemInstruction).toContain('Nie wiem');
    expect(prompt.systemInstruction).toContain('Nie jestem pewien');
    expect(prompt.systemInstruction).toContain('Nie pamiętam');
    expect(prompt.systemInstruction).toContain('Chyba nie');
  });

  it('instructs the model to avoid medical advice, jargon, and volunteering facts', () => {
    const prompt = buildCasePrompt(PATIENT, CASE, []);
    expect(prompt.systemInstruction.toLowerCase()).toContain('porad medycznych');
    expect(prompt.systemInstruction.toLowerCase()).toContain('żargonu');
  });

  it('instructs the model never to reveal it is an AI, or mention Gemini/prompts/databases/case data', () => {
    const prompt = buildCasePrompt(PATIENT, CASE, []);
    const lower = prompt.systemInstruction.toLowerCase();
    expect(lower).toContain('nigdy nie wspominaj');
    expect(lower).toContain('gemini');
    expect(lower).toContain('bazach danych');
    expect(lower).toContain('danych przypadku');
  });

  it('never includes doctor-only facts (diagnosis, result explanation, treatment) in the prompt', () => {
    const caseWithDoctorOnlyFacts: CasePromptCase = {
      ...CASE,
      doctorOnly: {
        correctDiagnosisName: 'Melanoma',
        correctDiagnosisDescription: 'Malignant proliferation of melanocytes',
        correctTreatmentName: 'Refer to oncology',
        resultExplanationText: 'It was melanoma because of the ABCDE criteria.',
        moneyReward: 50,
        moneyPenalty: 20,
      },
    };

    const prompt = buildCasePrompt(PATIENT, caseWithDoctorOnlyFacts, []);

    expect(prompt.systemInstruction).not.toContain('Melanoma');
    expect(prompt.systemInstruction).not.toContain('Malignant proliferation of melanocytes');
    expect(prompt.systemInstruction).not.toContain('Refer to oncology');
    expect(prompt.systemInstruction).not.toContain(
      'It was melanoma because of the ABCDE criteria.',
    );
  });
});

describe('buildDocumentSelectionPrompt', () => {
  const documents = [
    {
      id: 'doc-1',
      type: 'SKIN_IMAGE',
      title: 'Left shoulder photo',
      content: null,
      imageAltText: 'Asymmetric brown lesion',
    },
    {
      id: 'doc-2',
      type: 'DISEASE_HISTORY',
      title: 'History',
      content: { text: 'Noticed 3 months ago' },
      imageAltText: null,
    },
  ];

  it('lists every document id and instructs a JSON-array-of-ids response', () => {
    const prompt = buildDocumentSelectionPrompt(
      documents,
      'I noticed it about three months ago.',
      'When did you notice it?',
    );
    expect(prompt.systemInstruction).toContain('doc-1');
    expect(prompt.systemInstruction).toContain('doc-2');
    expect(prompt.systemInstruction.toLowerCase()).toContain('json');
    expect(prompt.contents.length).toBeGreaterThan(0);
    expect(prompt.contents.at(-1)?.parts[0]?.text).toContain('three months ago');
  });

  it('never leaks doctor-only vocabulary into the selection prompt', () => {
    const prompt = buildDocumentSelectionPrompt(documents, 'reply', 'question');
    expect(prompt.systemInstruction.toLowerCase()).not.toContain('diagnosis');
    expect(prompt.systemInstruction.toLowerCase()).not.toContain('treatment');
  });
});
