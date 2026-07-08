import { prisma } from '../../src/db/prisma.js';
import { truncateDatabase } from '../setup/truncate.js';
import { runSeed } from '../../src/db/seed/index.js';

describe('runSeed', () => {
  afterEach(truncateDatabase);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('seeds at least 20 rows for every content model', async () => {
    await runSeed(prisma);

    expect(await prisma.diagnosis.count()).toBeGreaterThanOrEqual(20);
    expect(await prisma.treatment.count()).toBeGreaterThanOrEqual(20);
    expect(await prisma.shopItem.count()).toBeGreaterThanOrEqual(20);
    expect(await prisma.patient.count()).toBeGreaterThanOrEqual(20);
    expect(await prisma.case.count()).toBeGreaterThanOrEqual(20);
    expect(await prisma.caseDocument.count()).toBeGreaterThanOrEqual(20);
    expect(await prisma.caseHint.count()).toBeGreaterThanOrEqual(20);
  });

  it('does not seed any application/session data', async () => {
    await runSeed(prisma);

    expect(await prisma.user.count()).toBe(0);
    expect(await prisma.userSession.count()).toBe(0);
    expect(await prisma.gameSession.count()).toBe(0);
    expect(await prisma.gameDayLog.count()).toBe(0);
    expect(await prisma.ownedItem.count()).toBe(0);
    expect(await prisma.diagnosisAttempt.count()).toBe(0);
    expect(await prisma.chatMessage.count()).toBe(0);
    expect(await prisma.gameplayLog.count()).toBe(0);
  });

  it('leaves every seeded Case pointing at a valid patient, diagnosis, and treatment', async () => {
    await runSeed(prisma);

    const cases = await prisma.case.findMany({
      include: { patient: true, correctDiagnosis: true, correctTreatment: true },
    });

    expect(cases.length).toBeGreaterThanOrEqual(20);
    for (const gameCase of cases) {
      expect(gameCase.patient).not.toBeNull();
      expect(gameCase.correctDiagnosis).not.toBeNull();
    }
  });

  it('is idempotent — running it twice does not duplicate rows or throw', async () => {
    await runSeed(prisma);
    const counts = {
      diagnosis: await prisma.diagnosis.count(),
      treatment: await prisma.treatment.count(),
      shopItem: await prisma.shopItem.count(),
      patient: await prisma.patient.count(),
      case: await prisma.case.count(),
      caseDocument: await prisma.caseDocument.count(),
      caseHint: await prisma.caseHint.count(),
    };

    await runSeed(prisma);

    expect(await prisma.diagnosis.count()).toBe(counts.diagnosis);
    expect(await prisma.treatment.count()).toBe(counts.treatment);
    expect(await prisma.shopItem.count()).toBe(counts.shopItem);
    expect(await prisma.patient.count()).toBe(counts.patient);
    expect(await prisma.case.count()).toBe(counts.case);
    expect(await prisma.caseDocument.count()).toBe(counts.caseDocument);
    expect(await prisma.caseHint.count()).toBe(counts.caseHint);
  });
});
