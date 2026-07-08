import { jest } from '@jest/globals';
import {
  ChatCaseNotFoundError,
  ChatGameSessionNotFoundError,
  sendChatMessage,
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
  };
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
        { generateReply: jest.fn<(input: GenerateReplyInput) => Promise<string>>() },
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
        { generateReply: jest.fn<(input: GenerateReplyInput) => Promise<string>>() },
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
        { generateReply: jest.fn<(input: GenerateReplyInput) => Promise<string>>() },
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
    const generateReply = jest
      .fn<(input: GenerateReplyInput) => Promise<string>>()
      .mockResolvedValue('Yes, at night.');

    const result = await sendChatMessage(
      prisma,
      { generateReply },
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

  it('starts sortOrder at 1 when there is no prior history', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findUnique.mockResolvedValue(makeGameSession());
    prisma.case.findUnique.mockResolvedValue(makeCase());
    prisma.chatMessage.findMany.mockResolvedValue([]);
    prisma.chatMessage.create
      .mockResolvedValueOnce(makeMessage({ id: 'player-msg', sortOrder: 1 }))
      .mockResolvedValueOnce(makeMessage({ id: 'patient-msg', sender: 'PATIENT', sortOrder: 2 }));
    const generateReply = jest
      .fn<(input: GenerateReplyInput) => Promise<string>>()
      .mockResolvedValue('Hi there.');

    await sendChatMessage(
      prisma,
      { generateReply },
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
});
