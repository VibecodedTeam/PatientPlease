import { jest } from '@jest/globals';
import { NoActiveGameError, NoOpenDayError } from '../../src/services/game.js';
import {
  CaseAlreadyAttemptedError,
  CaseNotFoundError,
  submitDiagnosis,
  type DiagnosisPrismaClient,
} from '../../src/services/diagnoses.js';
import type { GameSessionRecord } from '../../src/services/round.js';

function createMockPrisma() {
  return {
    gameSession: {
      findFirst: jest.fn<DiagnosisPrismaClient['gameSession']['findFirst']>(),
      update: jest.fn<DiagnosisPrismaClient['gameSession']['update']>(),
    },
    gameDayLog: {
      findFirst: jest.fn<DiagnosisPrismaClient['gameDayLog']['findFirst']>(),
    },
    case: {
      findUnique: jest.fn<DiagnosisPrismaClient['case']['findUnique']>(),
    },
    diagnosisAttempt: {
      findFirst: jest.fn<DiagnosisPrismaClient['diagnosisAttempt']['findFirst']>(),
      create: jest.fn<DiagnosisPrismaClient['diagnosisAttempt']['create']>(),
    },
    $transaction: jest.fn() as unknown as DiagnosisPrismaClient['$transaction'],
  };
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

describe('submitDiagnosis', () => {
  function primeHappyPath(prisma: ReturnType<typeof createMockPrisma>) {
    prisma.gameSession.findFirst.mockResolvedValue(makeSession({ money: 100 }));
    prisma.gameDayLog.findFirst.mockResolvedValue({ id: 'day-log-uuid' });
    prisma.case.findUnique.mockResolvedValue({
      id: 'case-uuid',
      correctDiagnosisId: 'diagnosis-uuid',
      moneyReward: 50,
      moneyPenalty: 20,
    });
    prisma.diagnosisAttempt.findFirst.mockResolvedValue(null);
    prisma.diagnosisAttempt.create.mockResolvedValue(undefined);
    prisma.gameSession.update.mockResolvedValue(makeSession({ money: 150 }));
    // The mock transaction just runs the callback against the same mock client,
    // so tests can keep asserting on gameSession.update/diagnosisAttempt.create directly.
    prisma.$transaction = jest.fn((fn: (tx: DiagnosisPrismaClient) => Promise<unknown>) =>
      fn(prisma as unknown as DiagnosisPrismaClient),
    ) as unknown as DiagnosisPrismaClient['$transaction'];
  }

  it('throws NoActiveGameError when there is no active GameSession', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(null);

    await expect(
      submitDiagnosis(prisma, 'user-uuid', { caseId: 'case-uuid', selectedDiagnosisId: 'd1' }),
    ).rejects.toThrow(NoActiveGameError);
  });

  it('throws NoOpenDayError when the session has no open GameDayLog', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue(null);

    await expect(
      submitDiagnosis(prisma, 'user-uuid', { caseId: 'case-uuid', selectedDiagnosisId: 'd1' }),
    ).rejects.toThrow(NoOpenDayError);
  });

  it('throws CaseNotFoundError when the case does not exist', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue({ id: 'day-log-uuid' });
    prisma.case.findUnique.mockResolvedValue(null);

    await expect(
      submitDiagnosis(prisma, 'user-uuid', { caseId: 'missing-uuid', selectedDiagnosisId: 'd1' }),
    ).rejects.toThrow(CaseNotFoundError);
  });

  it('throws CaseAlreadyAttemptedError when this case already has a DiagnosisAttempt for the open day', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue({ id: 'day-log-uuid' });
    prisma.case.findUnique.mockResolvedValue({
      id: 'case-uuid',
      correctDiagnosisId: 'diagnosis-uuid',
      moneyReward: 50,
      moneyPenalty: 20,
    });
    prisma.diagnosisAttempt.findFirst.mockResolvedValue({ id: 'existing-attempt-uuid' });

    await expect(
      submitDiagnosis(prisma, 'user-uuid', { caseId: 'case-uuid', selectedDiagnosisId: 'd1' }),
    ).rejects.toThrow(CaseAlreadyAttemptedError);
    expect(prisma.gameSession.update).not.toHaveBeenCalled();
  });

  it('records a correct diagnosis: isDiagnosisCorrect true, moneyDelta +moneyReward, session credited', async () => {
    const prisma = createMockPrisma();
    primeHappyPath(prisma);

    const result = await submitDiagnosis(prisma, 'user-uuid', {
      caseId: 'case-uuid',
      selectedDiagnosisId: 'diagnosis-uuid',
    });

    expect(result.isDiagnosisCorrect).toBe(true);
    expect(result.moneyDelta).toBe(50);
    expect(prisma.gameSession.update).toHaveBeenCalledWith({
      where: { id: 'session-uuid' },
      data: { money: 150 },
    });
    expect(prisma.diagnosisAttempt.create).toHaveBeenCalledWith({
      data: {
        gameDayLogId: 'day-log-uuid',
        caseId: 'case-uuid',
        selectedDiagnosisId: 'diagnosis-uuid',
        isDiagnosisCorrect: true,
        moneyDelta: 50,
      },
    });
  });

  it('records an incorrect diagnosis: isDiagnosisCorrect false, moneyDelta -moneyPenalty, session debited', async () => {
    const prisma = createMockPrisma();
    primeHappyPath(prisma);
    prisma.gameSession.update.mockResolvedValue(makeSession({ money: 80 }));

    const result = await submitDiagnosis(prisma, 'user-uuid', {
      caseId: 'case-uuid',
      selectedDiagnosisId: 'some-other-diagnosis-uuid',
    });

    expect(result.isDiagnosisCorrect).toBe(false);
    expect(result.moneyDelta).toBe(-20);
    expect(prisma.gameSession.update).toHaveBeenCalledWith({
      where: { id: 'session-uuid' },
      data: { money: 80 },
    });
    expect(prisma.diagnosisAttempt.create).toHaveBeenCalledWith({
      data: {
        gameDayLogId: 'day-log-uuid',
        caseId: 'case-uuid',
        selectedDiagnosisId: 'some-other-diagnosis-uuid',
        isDiagnosisCorrect: false,
        moneyDelta: -20,
      },
    });
  });

  it('creates the DiagnosisAttempt and updates the GameSession inside a single transaction', async () => {
    const prisma = createMockPrisma();
    primeHappyPath(prisma);

    await submitDiagnosis(prisma, 'user-uuid', {
      caseId: 'case-uuid',
      selectedDiagnosisId: 'diagnosis-uuid',
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('returns the updated gameSession record', async () => {
    const prisma = createMockPrisma();
    primeHappyPath(prisma);

    const result = await submitDiagnosis(prisma, 'user-uuid', {
      caseId: 'case-uuid',
      selectedDiagnosisId: 'diagnosis-uuid',
    });

    expect(result.gameSession.money).toBe(150);
  });
});
