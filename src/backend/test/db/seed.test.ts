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

    const [diagnoses, treatments, shopItems, patients, cases, documents, hints] = await Promise.all(
      [
        prisma.diagnosis.count(),
        prisma.treatment.count(),
        prisma.shopItem.count(),
        prisma.patient.count(),
        prisma.case.count(),
        prisma.caseDocument.count(),
        prisma.caseHint.count(),
      ],
    );

    expect(diagnoses).toBeGreaterThanOrEqual(20);
    expect(treatments).toBeGreaterThanOrEqual(20);
    expect(shopItems).toBeGreaterThanOrEqual(6);
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

  it('seeds EXAMINATION shop items and links every EXAMINATION_RESULTS document to one', async () => {
    await seed();

    const examinationItems = await prisma.shopItem.findMany({
      where: { itemType: 'EXAMINATION' },
    });
    expect(examinationItems.length).toBeGreaterThanOrEqual(3);
    // Every examination carries a numeric time cost in `content` — orderExamination
    // reads `content.timeCostMs` to dock the day clock.
    for (const item of examinationItems) {
      expect(typeof (item.content as { timeCostMs?: unknown } | null)?.timeCostMs).toBe('number');
    }

    const resultDocuments = await prisma.caseDocument.findMany({
      where: { type: 'EXAMINATION_RESULTS' },
    });
    expect(resultDocuments.length).toBeGreaterThan(0);

    // Each EXAMINATION_RESULTS doc must name a real examination item in
    // `content.shopItemId` — that link is what makes ordering that examination
    // "successful" and reveals the document in the round payload.
    const examinationIds = new Set(examinationItems.map((item) => item.id));
    for (const document of resultDocuments) {
      const shopItemId = (document.content as { shopItemId?: string } | null)?.shopItemId;
      expect(shopItemId).toBeDefined();
      expect(examinationIds.has(shopItemId as string)).toBe(true);
    }
  });

  it('by default, calling seed again on an already-seeded database is a no-op', async () => {
    await seed();
    const [firstDiagnosis] = await prisma.diagnosis.findMany({ orderBy: { code: 'asc' }, take: 1 });
    const firstCount = await prisma.diagnosis.count();

    await seed();
    const [secondDiagnosis] = await prisma.diagnosis.findMany({
      orderBy: { code: 'asc' },
      take: 1,
    });
    const secondCount = await prisma.diagnosis.count();

    expect(secondCount).toBe(firstCount);
    expect(secondDiagnosis?.id).toBe(firstDiagnosis?.id);
  });

  it('with force: true, wipes and recreates the catalog', async () => {
    await seed();
    const [firstDiagnosis] = await prisma.diagnosis.findMany({ orderBy: { code: 'asc' }, take: 1 });
    const firstCount = await prisma.diagnosis.count();

    await seed({ force: true });
    const [secondDiagnosis] = await prisma.diagnosis.findMany({
      orderBy: { code: 'asc' },
      take: 1,
    });
    const secondCount = await prisma.diagnosis.count();

    expect(secondCount).toBe(firstCount);
    expect(secondDiagnosis?.id).not.toBe(firstDiagnosis?.id);
  });

  it('seeds a known real case with its correct diagnosis and document types', async () => {
    await seed();

    const patient = await prisma.patient.findFirst({
      where: { name: 'Barbara Sikora' },
      include: {
        case: {
          include: { correctDiagnosis: true, correctTreatment: true, documents: true },
        },
      },
    });

    expect(patient).not.toBeNull();
    expect(patient!.case).not.toBeNull();
    expect(patient!.case!.correctDiagnosis.code).toBe('melanoma');
    expect(patient!.case!.correctTreatment).toBeNull();

    const documentTypes = patient!.case!.documents.map((d) => d.type).sort();
    expect(documentTypes).toEqual(
      [
        'CLINICAL_SYMPTOMS',
        'CLINICAL_SYMPTOMS',
        'EXAMINATION_RESULTS',
        'SKIN_IMAGE',
        'UV_EXPOSURE_HISTORY',
      ].sort(),
    );

    const skinImage = patient!.case!.documents.find((d) => d.type === 'SKIN_IMAGE')!;
    expect(skinImage.attentionPointRegion).toBe('CHEST');
    expect(skinImage.imageUrl).toBe('/cases/case-02.png');
  });

  it('gives every case at least 3 reveal-gated documents, so chat reveal can be progressive', async () => {
    await seed();

    const cases = await prisma.case.findMany({ include: { documents: true, patient: true } });
    const REVEAL_GATED_TYPES = new Set([
      'DISEASE_HISTORY',
      'UV_EXPOSURE_HISTORY',
      'CLINICAL_SYMPTOMS',
      'FAMILY_HISTORY',
      'WEATHER_HISTORY',
    ]);

    const casesWithTooFewGatedDocuments = cases.filter(
      (c) => c.documents.filter((d) => REVEAL_GATED_TYPES.has(d.type)).length < 3,
    );

    expect(casesWithTooFewGatedDocuments.map((c) => c.patient.name)).toEqual([]);
  });

  it('seeds the catalog and generated case labels in Polish', async () => {
    await seed();

    const melanoma = await prisma.diagnosis.findUnique({ where: { code: 'melanoma' } });
    expect(melanoma?.name).toBe('Czerniak');

    const atlas = await prisma.shopItem.findUnique({ where: { sku: 'book-atlas-derm-1' } });
    expect(atlas?.name).toBe('Atlas dermatologii, tom 1');

    const skinImage = await prisma.caseDocument.findFirst({ where: { type: 'SKIN_IMAGE' } });
    expect(skinImage?.title).toBe('Zbliżenie zmiany skórnej');

    const examResults = await prisma.caseDocument.findFirst({
      where: { type: 'EXAMINATION_RESULTS' },
    });
    expect(examResults?.title).toBe('Wyniki badania');

    const hint = await prisma.caseHint.findFirst();
    expect(hint?.content).toContain('Rozważ rozpoznanie');
  });

  it('seeds real portrait URLs and featuredOrder for the first 15 cases', async () => {
    await seed();

    const featured = await prisma.case.findMany({
      where: { featuredOrder: { not: null } },
      orderBy: { featuredOrder: 'asc' },
      include: { patient: true },
    });
    expect(featured).toHaveLength(13);
    featured.forEach((caseRecord, idx) => {
      expect(caseRecord.featuredOrder).toBe(idx + 1);
      expect(caseRecord.patient.portraitImageUrl).toBe(
        `/portraits/portrait-${String(idx + 1).padStart(2, '0')}.png`,
      );
    });

    // No patient still points at the old placeholder CDN.
    const stale = await prisma.patient.count({
      where: { portraitImageUrl: { contains: 'cdn.example.test' } },
    });
    expect(stale).toBe(0);

    // Non-featured patients fall back to a served /patient-portraits/ image.
    const nonFeatured = await prisma.patient.findFirst({
      where: { case: { featuredOrder: null } },
    });
    expect(nonFeatured?.portraitImageUrl).toMatch(/^\/patient-portraits\/.+\.png$/);
  });
});
