import { jest } from '@jest/globals';
import {
  ChatCaseNotFoundError,
  ChatGameSessionNotFoundError,
  sendChatMessage,
  type ChatCaseDocumentRecord,
  type ChatCaseRecord,
  type ChatGameSessionRecord,
  type ChatMessageRecord,
  type ChatPrismaClient,
} from '../../src/services/chat.js';
import type { GenerateReplyInput } from '../../src/services/llm.js';

function createMockPrisma() {
  return {
    gameSession: { findUnique: jest.fn<ChatPrismaClient['gameSession']['findUnique']>() },
    case: { findUnique: jest.fn<ChatPrismaClient['case']['findUnique']>() },
    chatMessage: {
      findMany: jest.fn<ChatPrismaClient['chatMessage']['findMany']>(),
      create: jest.fn<ChatPrismaClient['chatMessage']['create']>(),
    },
    caseDocumentReveal: {
      findMany: jest.fn<ChatPrismaClient['caseDocumentReveal']['findMany']>(),
      create: jest.fn<ChatPrismaClient['caseDocumentReveal']['create']>(),
    },
  };
}

function makeDocument(overrides: Partial<ChatCaseDocumentRecord> = {}): ChatCaseDocumentRecord {
  return {
    id: 'doc-1',
    attentionPointRegion: null,
    type: 'PHOTO',
    title: 'Photo',
    documentDate: null,
    sortOrder: 1,
    imageUrl: null,
    imageWidthPx: null,
    imageHeightPx: null,
    imageAltText: 'A photo',
    content: null,
    ...overrides,
  };
}

function makeSelectDocumentIds(ids: string[] = []) {
  return jest.fn<(input: GenerateReplyInput) => Promise<string[]>>().mockResolvedValue(ids);
}

function makeGameSession(overrides: Partial<ChatGameSessionRecord> = {}): ChatGameSessionRecord {
  return { id: 'session-uuid', userId: 'user-uuid', ...overrides };
}

function makeCase(overrides: Partial<ChatCaseRecord> = {}): ChatCaseRecord {
  return {
    id: 'case-uuid',
    difficulty: 1,
    patient: { name: 'Jan Kowalski', age: 52, sex: 'MALE', occupation: 'Roofer' },
    documents: [],
    ...overrides,
  };
}

function makeMessage(overrides: Partial<ChatMessageRecord> = {}): ChatMessageRecord {
  return {
    id: 'message-uuid',
    sender: 'PLAYER',
    content: 'Hello',
    sentAt: new Date('2026-07-08T00:00:00.000Z'),
    sortOrder: 1,
    ...overrides,
  };
}

describe('sendChatMessage', () => {
  it('throws ChatGameSessionNotFoundError when the session does not exist', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findUnique.mockResolvedValue(null);

    await expect(
      sendChatMessage(
        prisma,
        {
          generateReply: jest.fn<(input: GenerateReplyInput) => Promise<string>>(),
          selectDocumentIds: makeSelectDocumentIds(),
        },
        {
          userId: 'user-uuid',
          gameSessionId: 'session-uuid',
          caseId: 'case-uuid',
          playerText: 'Hi',
        },
      ),
    ).rejects.toThrow(ChatGameSessionNotFoundError);
  });

  it('throws ChatGameSessionNotFoundError when the session belongs to a different user', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findUnique.mockResolvedValue(makeGameSession({ userId: 'someone-else' }));

    await expect(
      sendChatMessage(
        prisma,
        {
          generateReply: jest.fn<(input: GenerateReplyInput) => Promise<string>>(),
          selectDocumentIds: makeSelectDocumentIds(),
        },
        {
          userId: 'user-uuid',
          gameSessionId: 'session-uuid',
          caseId: 'case-uuid',
          playerText: 'Hi',
        },
      ),
    ).rejects.toThrow(ChatGameSessionNotFoundError);
  });

  it('throws ChatCaseNotFoundError when the case does not exist', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findUnique.mockResolvedValue(makeGameSession());
    prisma.case.findUnique.mockResolvedValue(null);

    await expect(
      sendChatMessage(
        prisma,
        {
          generateReply: jest.fn<(input: GenerateReplyInput) => Promise<string>>(),
          selectDocumentIds: makeSelectDocumentIds(),
        },
        {
          userId: 'user-uuid',
          gameSessionId: 'session-uuid',
          caseId: 'case-uuid',
          playerText: 'Hi',
        },
      ),
    ).rejects.toThrow(ChatCaseNotFoundError);
  });

  it('persists the player message, calls Gemini with the built prompt including prior history, and persists the reply', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findUnique.mockResolvedValue(makeGameSession());
    prisma.case.findUnique.mockResolvedValue(makeCase());
    prisma.chatMessage.findMany.mockResolvedValue([
      makeMessage({ id: 'earlier', sortOrder: 1, content: 'Earlier turn' }),
    ]);
    prisma.chatMessage.create
      .mockResolvedValueOnce(
        makeMessage({ id: 'player-msg', sender: 'PLAYER', content: 'Does it itch?', sortOrder: 2 }),
      )
      .mockResolvedValueOnce(
        makeMessage({
          id: 'patient-msg',
          sender: 'PATIENT',
          content: 'Yes, at night.',
          sortOrder: 3,
        }),
      );
    prisma.caseDocumentReveal.findMany.mockResolvedValue([]);
    const generateReply = jest
      .fn<(input: GenerateReplyInput) => Promise<string>>()
      .mockResolvedValue('Yes, at night.');

    const result = await sendChatMessage(
      prisma,
      { generateReply, selectDocumentIds: makeSelectDocumentIds() },
      {
        userId: 'user-uuid',
        gameSessionId: 'session-uuid',
        caseId: 'case-uuid',
        playerText: 'Does it itch?',
      },
    );

    expect(prisma.chatMessage.create).toHaveBeenNthCalledWith(1, {
      data: {
        gameSessionId: 'session-uuid',
        caseId: 'case-uuid',
        sender: 'PLAYER',
        content: 'Does it itch?',
        sortOrder: 2,
      },
    });
    expect(prisma.chatMessage.create).toHaveBeenNthCalledWith(2, {
      data: {
        gameSessionId: 'session-uuid',
        caseId: 'case-uuid',
        sender: 'PATIENT',
        content: 'Yes, at night.',
        sortOrder: 3,
      },
    });
    expect(generateReply).toHaveBeenCalledTimes(1);
    const promptArg = generateReply.mock.calls[0]?.[0] as { contents: unknown };
    expect(promptArg.contents).toEqual([
      { role: 'user', parts: [{ text: 'Earlier turn' }] },
      { role: 'user', parts: [{ text: 'Does it itch?' }] },
    ]);
    expect(result.playerMessage.id).toBe('player-msg');
    expect(result.patientMessage.id).toBe('patient-msg');
  });

  it('never forwards doctor-only case fields (e.g. resultExplanationText) into the Gemini prompt', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findUnique.mockResolvedValue(makeGameSession());
    // Simulates the raw Prisma Case row, which always carries these scalar columns
    // even though ChatCaseRecord's declared shape only exposes patient/documents/difficulty.
    prisma.case.findUnique.mockResolvedValue({
      ...makeCase(),
      resultExplanationText: 'It was melanoma because of the ABCDE criteria.',
      correctDiagnosisName: 'Melanoma',
    } as ChatCaseRecord);
    prisma.chatMessage.findMany.mockResolvedValue([]);
    prisma.chatMessage.create
      .mockResolvedValueOnce(makeMessage({ id: 'player-msg', sortOrder: 1 }))
      .mockResolvedValueOnce(makeMessage({ id: 'patient-msg', sender: 'PATIENT', sortOrder: 2 }));
    prisma.caseDocumentReveal.findMany.mockResolvedValue([]);
    const generateReply = jest
      .fn<(input: GenerateReplyInput) => Promise<string>>()
      .mockResolvedValue('I do not know.');

    await sendChatMessage(
      prisma,
      { generateReply, selectDocumentIds: makeSelectDocumentIds() },
      { userId: 'user-uuid', gameSessionId: 'session-uuid', caseId: 'case-uuid', playerText: 'Hi' },
    );

    const promptArg = generateReply.mock.calls[0]?.[0] as { systemInstruction: string };
    expect(promptArg.systemInstruction).not.toContain(
      'It was melanoma because of the ABCDE criteria.',
    );
    expect(promptArg.systemInstruction).not.toContain('Melanoma');
  });

  it('never forwards an EXAMINATION_RESULTS document into the patient roleplay prompt', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findUnique.mockResolvedValue(makeGameSession());
    prisma.case.findUnique.mockResolvedValue(
      makeCase({
        documents: [
          makeDocument({
            id: 'exam-doc-uuid',
            type: 'EXAMINATION_RESULTS',
            title: 'Biopsy results',
            content: { shopItemId: 'exam-shop-item-uuid', findings: 'Biopsy findings text' },
          }),
        ],
      }),
    );
    prisma.chatMessage.findMany.mockResolvedValue([]);
    prisma.chatMessage.create
      .mockResolvedValueOnce(makeMessage({ id: 'player-msg', sortOrder: 1 }))
      .mockResolvedValueOnce(makeMessage({ id: 'patient-msg', sender: 'PATIENT', sortOrder: 2 }));
    prisma.caseDocumentReveal.findMany.mockResolvedValue([]);
    const generateReply = jest
      .fn<(input: GenerateReplyInput) => Promise<string>>()
      .mockResolvedValue('I do not know.');
    const selectDocumentIds = makeSelectDocumentIds();

    await sendChatMessage(
      prisma,
      { generateReply, selectDocumentIds },
      {
        userId: 'user-uuid',
        gameSessionId: 'session-uuid',
        caseId: 'case-uuid',
        playerText: 'What did the biopsy show?',
      },
    );

    const roleplayPrompt = generateReply.mock.calls[0]?.[0] as { systemInstruction: string };
    expect(roleplayPrompt.systemInstruction).not.toContain('Biopsy results');
    expect(roleplayPrompt.systemInstruction).not.toContain('Biopsy findings text');

    const selectionPrompt = selectDocumentIds.mock.calls[0]?.[0] as { systemInstruction: string };
    expect(selectionPrompt.systemInstruction).not.toContain('exam-doc-uuid');
    expect(selectionPrompt.systemInstruction).not.toContain('Biopsy results');
  });

  it('starts sortOrder at 1 when there is no prior history', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findUnique.mockResolvedValue(makeGameSession());
    prisma.case.findUnique.mockResolvedValue(makeCase());
    prisma.chatMessage.findMany.mockResolvedValue([]);
    prisma.chatMessage.create
      .mockResolvedValueOnce(makeMessage({ id: 'player-msg', sortOrder: 1 }))
      .mockResolvedValueOnce(makeMessage({ id: 'patient-msg', sender: 'PATIENT', sortOrder: 2 }));
    prisma.caseDocumentReveal.findMany.mockResolvedValue([]);
    const generateReply = jest
      .fn<(input: GenerateReplyInput) => Promise<string>>()
      .mockResolvedValue('Hi there.');

    await sendChatMessage(
      prisma,
      { generateReply, selectDocumentIds: makeSelectDocumentIds() },
      { userId: 'user-uuid', gameSessionId: 'session-uuid', caseId: 'case-uuid', playerText: 'Hi' },
    );

    expect(prisma.chatMessage.create).toHaveBeenNthCalledWith(1, {
      data: {
        gameSessionId: 'session-uuid',
        caseId: 'case-uuid',
        sender: 'PLAYER',
        content: 'Hi',
        sortOrder: 1,
      },
    });
    expect(prisma.chatMessage.create).toHaveBeenNthCalledWith(2, {
      data: {
        gameSessionId: 'session-uuid',
        caseId: 'case-uuid',
        sender: 'PATIENT',
        content: 'Hi there.',
        sortOrder: 2,
      },
    });
  });

  describe('document reveal', () => {
    function setUpRevealCase(
      options: {
        documents?: ChatCaseDocumentRecord[];
        priorReveals?: { caseDocumentId: string }[];
        selectedIds?: string[];
      } = {},
    ) {
      const prisma = createMockPrisma();
      prisma.gameSession.findUnique.mockResolvedValue(makeGameSession());
      prisma.case.findUnique.mockResolvedValue(
        makeCase({
          documents: options.documents ?? [
            makeDocument({ id: 'doc-1' }),
            makeDocument({ id: 'doc-2', title: 'History' }),
          ],
        }),
      );
      prisma.chatMessage.findMany.mockResolvedValue([]);
      prisma.chatMessage.create
        .mockResolvedValueOnce(makeMessage({ id: 'player-msg', sortOrder: 1 }))
        .mockResolvedValueOnce(
          makeMessage({
            id: 'patient-msg',
            sender: 'PATIENT',
            content: 'It itches at night.',
            sortOrder: 2,
          }),
        );
      prisma.caseDocumentReveal.findMany.mockResolvedValue(options.priorReveals ?? []);

      const createdReveals: { gameSessionId: string; caseId: string; caseDocumentId: string }[] =
        [];
      prisma.caseDocumentReveal.create.mockImplementation((args) => {
        createdReveals.push(args.data);
        return Promise.resolve({ id: `reveal-${args.data.caseDocumentId}` });
      });

      const generateReply = jest
        .fn<(input: GenerateReplyInput) => Promise<string>>()
        .mockResolvedValue('It itches at night.');
      const selectDocumentIds = makeSelectDocumentIds(options.selectedIds ?? []);

      const deps = { generateReply, selectDocumentIds };
      const input = {
        userId: 'user-uuid',
        gameSessionId: 'session-uuid',
        caseId: 'case-uuid',
        playerText: 'Does it itch?',
      };

      return { prisma, deps, input, createdReveals };
    }

    it('reveals documents the selection returns, persists them, and returns them mapped', async () => {
      const { prisma, deps, input, createdReveals } = setUpRevealCase({ selectedIds: ['doc-1'] });

      const result = await sendChatMessage(prisma, deps, input);

      expect(result.revealedDocuments.map((d) => d.id)).toEqual(['doc-1']);
      expect(createdReveals).toEqual([
        { gameSessionId: input.gameSessionId, caseId: input.caseId, caseDocumentId: 'doc-1' },
      ]);
    });

    it('drops hallucinated ids not belonging to the case', async () => {
      const { prisma, deps, input } = setUpRevealCase({ selectedIds: ['doc-1', 'ghost'] });

      const result = await sendChatMessage(prisma, deps, input);

      expect(result.revealedDocuments.map((d) => d.id)).toEqual(['doc-1']);
    });

    it('does not re-reveal a document already revealed this session', async () => {
      const { prisma, deps, input, createdReveals } = setUpRevealCase({
        priorReveals: [{ caseDocumentId: 'doc-1' }],
        selectedIds: ['doc-1'],
      });

      const result = await sendChatMessage(prisma, deps, input);

      expect(result.revealedDocuments).toEqual([]);
      expect(createdReveals).toEqual([]);
    });

    it('degrades gracefully to [] when selectDocumentIds throws', async () => {
      const { prisma, deps, input } = setUpRevealCase();
      deps.selectDocumentIds = jest.fn(() => Promise.reject(new Error('gemini down')));

      const result = await sendChatMessage(prisma, deps, input);

      expect(result.patientMessage.content).toBeDefined();
      expect(result.revealedDocuments).toEqual([]);
    });

    it('never reveals an EXAMINATION_RESULTS document even if the classifier returns its id', async () => {
      const { prisma, deps, input, createdReveals } = setUpRevealCase({
        documents: [
          makeDocument({ id: 'doc-1' }),
          makeDocument({
            id: 'exam-doc-uuid',
            type: 'EXAMINATION_RESULTS',
            title: 'Biopsy results',
            content: { shopItemId: 'exam-shop-item-uuid', findings: 'Biopsy findings text' },
          }),
        ],
        selectedIds: ['doc-1', 'exam-doc-uuid'],
      });

      const result = await sendChatMessage(prisma, deps, input);

      expect(result.revealedDocuments.map((d) => d.id)).toEqual(['doc-1']);
      expect(createdReveals).toEqual([
        { gameSessionId: input.gameSessionId, caseId: input.caseId, caseDocumentId: 'doc-1' },
      ]);
    });
  });
});
