import { buildCasePrompt, type CasePromptChatMessage, type ChatSenderValue } from './casePrompt.js';
import type { GenerateReplyInput } from './llm.js';

export interface ChatMessageRecord {
  id: string;
  sender: ChatSenderValue;
  content: string;
  sentAt: Date;
  sortOrder: number;
}

export interface ChatGameSessionRecord {
  id: string;
  userId: string;
}

export interface ChatPatientRecord {
  name: string;
  age: number;
  sex: string;
  occupation: string | null;
}

export interface ChatCaseDocumentRecord {
  type: string;
  title: string;
  content: unknown;
  imageAltText: string | null;
}

export interface ChatCaseRecord {
  id: string;
  difficulty: number;
  patient: ChatPatientRecord;
  documents: ChatCaseDocumentRecord[];
}

/** Narrow, structurally-compatible subset of PrismaClient this service depends on — keeps unit tests free of the full generated client shape (mirrors RoundPrismaClient in services/round.ts). */
export interface ChatPrismaClient {
  gameSession: {
    findUnique(args: { where: { id: string } }): Promise<ChatGameSessionRecord | null>;
  };
  case: {
    findUnique(args: {
      where: { id: string };
      include: { patient: true; documents: true };
    }): Promise<ChatCaseRecord | null>;
  };
  chatMessage: {
    findMany(args: {
      where: { gameSessionId: string; caseId: string };
      orderBy: { sortOrder: 'asc' };
    }): Promise<ChatMessageRecord[]>;
    create(args: {
      data: {
        gameSessionId: string;
        caseId: string;
        sender: ChatSenderValue;
        content: string;
        sortOrder: number;
      };
    }): Promise<ChatMessageRecord>;
  };
}

export class ChatGameSessionNotFoundError extends Error {
  constructor(message = 'GameSession not found or not owned by this user') {
    super(message);
    this.name = 'ChatGameSessionNotFoundError';
  }
}

export class ChatCaseNotFoundError extends Error {
  constructor(message = 'Case not found') {
    super(message);
    this.name = 'ChatCaseNotFoundError';
  }
}

export interface SendChatMessageInput {
  userId: string;
  gameSessionId: string;
  caseId: string;
  playerText: string;
}

export interface SendChatMessageDeps {
  generateReply(input: GenerateReplyInput): Promise<string>;
}

export interface SendChatMessageResult {
  playerMessage: ChatMessageRecord;
  patientMessage: ChatMessageRecord;
}

function toPromptHistory(messages: ChatMessageRecord[]): CasePromptChatMessage[] {
  return messages.map((message) => ({ sender: message.sender, content: message.content }));
}

export async function sendChatMessage(
  prisma: ChatPrismaClient,
  deps: SendChatMessageDeps,
  input: SendChatMessageInput,
): Promise<SendChatMessageResult> {
  const gameSession = await prisma.gameSession.findUnique({ where: { id: input.gameSessionId } });
  if (!gameSession || gameSession.userId !== input.userId) {
    throw new ChatGameSessionNotFoundError();
  }

  const gameCase = await prisma.case.findUnique({
    where: { id: input.caseId },
    include: { patient: true, documents: true },
  });
  if (!gameCase) {
    throw new ChatCaseNotFoundError();
  }

  const history = await prisma.chatMessage.findMany({
    where: { gameSessionId: input.gameSessionId, caseId: input.caseId },
    orderBy: { sortOrder: 'asc' },
  });

  const nextSortOrder = (history.at(-1)?.sortOrder ?? 0) + 1;

  const playerMessage = await prisma.chatMessage.create({
    data: {
      gameSessionId: input.gameSessionId,
      caseId: input.caseId,
      sender: 'PLAYER',
      content: input.playerText,
      sortOrder: nextSortOrder,
    },
  });

  const prompt = buildCasePrompt(
    gameCase.patient,
    { difficulty: gameCase.difficulty, documents: gameCase.documents },
    toPromptHistory([...history, playerMessage]),
  );

  const replyText = await deps.generateReply(prompt);

  const patientMessage = await prisma.chatMessage.create({
    data: {
      gameSessionId: input.gameSessionId,
      caseId: input.caseId,
      sender: 'PATIENT',
      content: replyText,
      sortOrder: nextSortOrder + 1,
    },
  });

  return { playerMessage, patientMessage };
}
