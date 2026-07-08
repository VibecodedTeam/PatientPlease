import { prisma } from '../../src/db/prisma.js';
import { seed } from '../../src/db/seed.js';
import { truncateDatabase } from '../setup/truncate.js';

describe('seed', () => {
  afterEach(truncateDatabase);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('seeds at least 20 rows into every catalog and case table', async () => {
    await seed();

    const [diagnoses, treatments, shopItems, patients, cases, documents, hints] = await Promise.all([
      prisma.diagnosis.count(),
      prisma.treatment.count(),
      prisma.shopItem.count(),
      prisma.patient.count(),
      prisma.case.count(),
      prisma.caseDocument.count(),
      prisma.caseHint.count(),
    ]);

    expect(diagnoses).toBeGreaterThanOrEqual(20);
    expect(treatments).toBeGreaterThanOrEqual(20);
    expect(shopItems).toBeGreaterThanOrEqual(20);
    expect(patients).toBeGreaterThanOrEqual(20);
    expect(cases).toBeGreaterThanOrEqual(20);
    expect(documents).toBeGreaterThanOrEqual(20);
    expect(hints).toBeGreaterThanOrEqual(20);
  });

  it('links every case to a valid patient, diagnosis, at least one document, and at least one hint', async () => {
    await seed();

    const cases = await prisma.case.findMany({
      include: { patient: true, correctDiagnosis: true, documents: true, hints: true },
    });

    expect(cases.length).toBeGreaterThanOrEqual(20);
    for (const caseRecord of cases) {
      expect(caseRecord.patient).not.toBeNull();
      expect(caseRecord.correctDiagnosis).not.toBeNull();
      expect(caseRecord.documents.length).toBeGreaterThan(0);
      expect(caseRecord.hints.length).toBeGreaterThan(0);
    }
  });

  it('by default, calling seed again on an already-seeded database is a no-op', async () => {
    await seed();
    const [firstDiagnosis] = await prisma.diagnosis.findMany({ orderBy: { code: 'asc' }, take: 1 });
    const firstCount = await prisma.diagnosis.count();

    await seed();
    const [secondDiagnosis] = await prisma.diagnosis.findMany({ orderBy: { code: 'asc' }, take: 1 });
    const secondCount = await prisma.diagnosis.count();

    expect(secondCount).toBe(firstCount);
    expect(secondDiagnosis?.id).toBe(firstDiagnosis?.id);
  });

  it('with force: true, wipes and recreates the catalog', async () => {
    await seed();
    const [firstDiagnosis] = await prisma.diagnosis.findMany({ orderBy: { code: 'asc' }, take: 1 });
    const firstCount = await prisma.diagnosis.count();

    await seed({ force: true });
    const [secondDiagnosis] = await prisma.diagnosis.findMany({ orderBy: { code: 'asc' }, take: 1 });
    const secondCount = await prisma.diagnosis.count();

    expect(secondCount).toBe(firstCount);
    expect(secondDiagnosis?.id).not.toBe(firstDiagnosis?.id);
  });
});
