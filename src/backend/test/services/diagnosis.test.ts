import { jest } from '@jest/globals';
import { NoActiveGameError, NoOpenDayError } from '../../src/services/game.js';
import {
  CaseNotFoundError,
  DiagnosisAlreadyAttemptedError,
  DiagnosisNotFoundError,
  TreatmentNotFoundError,
  submitDiagnosis,
  type DiagnosisPrismaClient,
} from '../../src/services/diagnosis.js';
import type { GameSessionRecord } from '../../src/services/round.js';

function createMockPrisma() {
  return {
    gameSession: {
      findFirst: jest.fn<DiagnosisPrismaClient['gameSession']['findFirst']>(),
      update: jest.fn<DiagnosisPrismaClient['gameSession']['update']>(),
    },
    case: {
      findUnique: jest.fn<DiagnosisPrismaClient['case']['findUnique']>(),
    },
    diagnosis: {
      findUnique: jest.fn<DiagnosisPrismaClient['diagnosis']['findUnique']>(),
    },
    treatment: {
      findUnique: jest.fn<DiagnosisPrismaClient['treatment']['findUnique']>(),
    },
    gameDayLog: {
      findFirst: jest.fn<DiagnosisPrismaClient['gameDayLog']['findFirst']>(),
    },
    diagnosisAttempt: {
      findFirst: jest.fn<DiagnosisPrismaClient['diagnosisAttempt']['findFirst']>(),
      create: jest.fn<DiagnosisPrismaClient['diagnosisAttempt']['create']>(),
    },
    $transaction: jest.fn() as unknown as DiagnosisPrismaClient['$transaction'],
  };
}

function primeTransaction(prisma: ReturnType<typeof createMockPrisma>) {
  prisma.$transaction = jest.fn((fn: (tx: DiagnosisPrismaClient) => Promise<unknown>) =>
    fn(prisma as unknown as DiagnosisPrismaClient),
  ) as unknown as DiagnosisPrismaClient['$transaction'];
}

function makeSession(overrides: Partial<GameSessionRecord> = {}): GameSessionRecord {
  return {
    id: 'session-uuid',
    money: 100,
    studentLoanThreshold: null,
    consecutiveBadDiagnosisCount: 0,
    status: 'ACTIVE',
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    ...overrides,
  };
}

function primeHappyPath(prisma: ReturnType<typeof createMockPrisma>) {
  prisma.gameSession.findFirst.mockResolvedValue(makeSession({ money: 100 }));
  prisma.gameDayLog.findFirst.mockResolvedValue({ id: 'open-log-uuid' });
  prisma.case.findUnique.mockResolvedValue({
    id: 'case-uuid',
    correctDiagnosisId: 'diagnosis-uuid',
    correctTreatmentId: null,
    moneyReward: 50,
    moneyPenalty: 20,
  });
  prisma.diagnosis.findUnique.mockResolvedValue({ id: 'diagnosis-uuid' });
  prisma.diagnosisAttempt.findFirst.mockResolvedValue(null);
  prisma.diagnosisAttempt.create.mockResolvedValue({
    id: 'attempt-uuid',
    caseId: 'case-uuid',
    selectedDiagnosisId: 'diagnosis-uuid',
    selectedTreatmentId: null,
    isDiagnosisCorrect: true,
    isTreatmentCorrect: null,
    moneyDelta: 50,
    attemptedAt: new Date('2026-07-01T00:00:00.000Z'),
  });
  primeTransaction(prisma);
}

describe('submitDiagnosis', () => {
  it('throws NoActiveGameError when there is no ACTIVE GameSession', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(null);

    await expect(
      submitDiagnosis(prisma, 'user-uuid', 'case-uuid', 'diagnosis-uuid', null),
    ).rejects.toThrow(NoActiveGameError);
  });

  it('throws NoOpenDayError when the session has no open GameDayLog', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue(null);

    await expect(
      submitDiagnosis(prisma, 'user-uuid', 'case-uuid', 'diagnosis-uuid', null),
    ).rejects.toThrow(NoOpenDayError);
  });

  it('throws CaseNotFoundError when caseId matches no Case', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue({ id: 'open-log-uuid' });
    prisma.case.findUnique.mockResolvedValue(null);

    await expect(
      submitDiagnosis(prisma, 'user-uuid', 'case-uuid', 'diagnosis-uuid', null),
    ).rejects.toThrow(CaseNotFoundError);
  });

  it('throws DiagnosisNotFoundError when selectedDiagnosisId matches no Diagnosis', async () => {
    const prisma = createMockPrisma();
    primeHappyPath(prisma);
    prisma.diagnosis.findUnique.mockResolvedValue(null);

    await expect(
      submitDiagnosis(prisma, 'user-uuid', 'case-uuid', 'diagnosis-uuid', null),
    ).rejects.toThrow(DiagnosisNotFoundError);
  });

  it('throws TreatmentNotFoundError when selectedTreatmentId is provided but matches no Treatment', async () => {
    const prisma = createMockPrisma();
    primeHappyPath(prisma);
    prisma.treatment.findUnique.mockResolvedValue(null);

    await expect(
      submitDiagnosis(prisma, 'user-uuid', 'case-uuid', 'diagnosis-uuid', 'treatment-uuid'),
    ).rejects.toThrow(TreatmentNotFoundError);
  });

  it('throws DiagnosisAlreadyAttemptedError when this case already has an attempt in this session', async () => {
    const prisma = createMockPrisma();
    primeHappyPath(prisma);
    prisma.diagnosisAttempt.findFirst.mockResolvedValue({ id: 'existing-attempt-uuid' });

    await expect(
      submitDiagnosis(prisma, 'user-uuid', 'case-uuid', 'diagnosis-uuid', null),
    ).rejects.toThrow(DiagnosisAlreadyAttemptedError);
  });

  it('records a correct diagnosis, adds moneyReward, and creates the DiagnosisAttempt', async () => {
    const prisma = createMockPrisma();
    primeHappyPath(prisma);
    prisma.gameSession.update.mockResolvedValue(makeSession({ money: 150 }));

    const result = await submitDiagnosis(prisma, 'user-uuid', 'case-uuid', 'diagnosis-uuid', null);

    expect(prisma.gameSession.update).toHaveBeenCalledWith({
      where: { id: 'session-uuid' },
      data: { money: 150 },
    });
    expect(prisma.diagnosisAttempt.create).toHaveBeenCalledWith({
      data: {
        gameDayLogId: 'open-log-uuid',
        caseId: 'case-uuid',
        selectedDiagnosisId: 'diagnosis-uuid',
        selectedTreatmentId: null,
        isDiagnosisCorrect: true,
        isTreatmentCorrect: null,
        moneyDelta: 50,
      },
    });
    expect(result.result).toEqual({
      isDiagnosisCorrect: true,
      isTreatmentCorrect: null,
      moneyDelta: 50,
    });
    expect(result.gameSession.money).toBe(150);
  });

  it('records an incorrect diagnosis and deducts moneyPenalty, floored at 0', async () => {
    const prisma = createMockPrisma();
    primeHappyPath(prisma);
    prisma.gameSession.findFirst.mockResolvedValue(makeSession({ money: 10 }));
    prisma.gameSession.update.mockResolvedValue(makeSession({ money: 0 }));

    const result = await submitDiagnosis(
      prisma,
      'user-uuid',
      'case-uuid',
      'other-diagnosis-uuid',
      null,
    );

    expect(prisma.gameSession.update).toHaveBeenCalledWith({
      where: { id: 'session-uuid' },
      data: { money: 0 },
    });
    expect(result.result).toEqual({
      isDiagnosisCorrect: false,
      isTreatmentCorrect: null,
      moneyDelta: -20,
    });
  });

  it('records isTreatmentCorrect when a selectedTreatmentId is given', async () => {
    const prisma = createMockPrisma();
    primeHappyPath(prisma);
    prisma.case.findUnique.mockResolvedValue({
      id: 'case-uuid',
      correctDiagnosisId: 'diagnosis-uuid',
      correctTreatmentId: 'treatment-uuid',
      moneyReward: 50,
      moneyPenalty: 20,
    });
    prisma.treatment.findUnique.mockResolvedValue({ id: 'treatment-uuid' });
    prisma.gameSession.update.mockResolvedValue(makeSession({ money: 150 }));

    const result = await submitDiagnosis(
      prisma,
      'user-uuid',
      'case-uuid',
      'diagnosis-uuid',
      'treatment-uuid',
    );

    expect(result.result.isTreatmentCorrect).toBe(true);
  });
});
