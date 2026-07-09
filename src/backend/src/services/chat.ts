import {
  buildCasePrompt,
  buildDocumentSelectionPrompt,
  type CasePromptChatMessage,
  type ChatSenderValue,
} from './casePrompt.js';
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
  id: string;
  attentionPointRegion: string | null;
  type: string;
  title: string;
  documentDate: Date | null;
  sortOrder: number;
  imageUrl: string | null;
  imageWidthPx: number | null;
  imageHeightPx: number | null;
  imageAltText: string | null;
  content: unknown;
}

export type RevealedDocumentRecord = ChatCaseDocumentRecord;

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
      include: { patient: true; documents: { orderBy: { sortOrder: 'asc' } } };
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
  caseDocumentReveal: {
    findMany(args: {
      where: { gameSessionId: string; caseId: string };
    }): Promise<{ caseDocumentId: string }[]>;
    create(args: {
      data: { gameSessionId: string; caseId: string; caseDocumentId: string };
    }): Promise<{ id: string }>;
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
  selectDocumentIds(input: GenerateReplyInput): Promise<string[]>;
}

export interface SendChatMessageResult {
  playerMessage: ChatMessageRecord;
  patientMessage: ChatMessageRecord;
  revealedDocuments: RevealedDocumentRecord[];
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
    include: { patient: true, documents: { orderBy: { sortOrder: 'asc' } } },
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

  let revealedDocuments: RevealedDocumentRecord[];
  try {
    const selectionPrompt = buildDocumentSelectionPrompt(
      gameCase.documents.map((d) => ({
        id: d.id,
        type: d.type,
        title: d.title,
        content: d.content,
        imageAltText: d.imageAltText,
      })),
      replyText,
      input.playerText,
    );
    const selectedIds = await deps.selectDocumentIds(selectionPrompt);

    const validIds = new Set(gameCase.documents.map((d) => d.id));
    const alreadyRevealed = new Set(
      (
        await prisma.caseDocumentReveal.findMany({
          where: { gameSessionId: input.gameSessionId, caseId: input.caseId },
        })
      ).map((r) => r.caseDocumentId),
    );
    const toReveal = [...new Set(selectedIds)].filter(
      (id) => validIds.has(id) && !alreadyRevealed.has(id),
    );

    for (const caseDocumentId of toReveal) {
      await prisma.caseDocumentReveal.create({
        data: { gameSessionId: input.gameSessionId, caseId: input.caseId, caseDocumentId },
      });
    }
    const revealSet = new Set(toReveal);
    revealedDocuments = gameCase.documents
      .filter((d) => revealSet.has(d.id))
      .map(toRevealedDocument);
  } catch {
    revealedDocuments = [];
  }

  return { playerMessage, patientMessage, revealedDocuments };
}

function toRevealedDocument(document: ChatCaseDocumentRecord): RevealedDocumentRecord {
  return {
    id: document.id,
    attentionPointRegion: document.attentionPointRegion,
    type: document.type,
    title: document.title,
    documentDate: document.documentDate,
    sortOrder: document.sortOrder,
    imageUrl: document.imageUrl,
    imageWidthPx: document.imageWidthPx,
    imageHeightPx: document.imageHeightPx,
    imageAltText: document.imageAltText,
    content: document.content,
  };
}
