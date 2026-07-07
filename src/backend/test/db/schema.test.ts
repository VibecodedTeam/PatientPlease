import { prisma } from '../../src/db/prisma.js';
import { truncateDatabase } from '../setup/truncate.js';

describe('game schema', () => {
  afterEach(truncateDatabase);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('persists and relates a record across every domain model', async () => {
    const diagnosis = await prisma.diagnosis.create({
      data: { code: 'test-melanoma', name: 'Melanoma', description: 'test', category: 'MALIGNANT' },
    });
    const treatment = await prisma.treatment.create({
      data: { code: 'test-referral', name: 'Referral', description: 'test', kind: 'REFERRAL' },
    });
    const patient = await prisma.patient.create({
      data: {
        name: 'Test Patient',
        age: 40,
        sex: 'OTHER',
        chiefComplaint: 'A changing mole',
        portraitImageUrl: 'https://example.test/portrait.png',
        bodyModelVariant: 'default',
      },
    });
    const gameCase = await prisma.case.create({
      data: {
        patientId: patient.id,
        difficulty: 'EASY',
        correctDiagnosisId: diagnosis.id,
        correctTreatmentId: treatment.id,
        moneyReward: 100,
        moneyPenalty: 50,
        resultExplanationText: 'Test explanation',
      },
    });
    const attentionPoint = await prisma.attentionPoint.create({
      data: {
        caseId: gameCase.id,
        label: 'Left shoulder mole',
        bodyRegion: 'LEFT_ARM',
        positionX: 0,
        positionY: 0,
        positionZ: 0,
        hitboxRadius: 1,
        isKeyFinding: true,
        sortOrder: 0,
      },
    });
    const document = await prisma.caseDocument.create({
      data: {
        caseId: gameCase.id,
        attentionPointId: attentionPoint.id,
        type: 'SKIN_IMAGE',
        title: 'Close-up photo',
        sortOrder: 0,
        imageUrl: 'https://example.test/lesion.png',
      },
    });
    const user = await prisma.user.create({
      data: { googleId: 'test-google-id', email: 'test@example.test', name: 'Test User' },
    });
    const userSession = await prisma.userSession.create({
      data: {
        userId: user.id,
        sessionToken: 'test-session-token',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    const gameSession = await prisma.gameSession.create({ data: { userId: user.id } });
    const diagnosisAttempt = await prisma.diagnosisAttempt.create({
      data: {
        gameSessionId: gameSession.id,
        caseId: gameCase.id,
        selectedDiagnosisId: diagnosis.id,
        selectedTreatmentId: treatment.id,
        isDiagnosisCorrect: true,
        isTreatmentCorrect: true,
        moneyDelta: 100,
      },
    });
    const shopItem = await prisma.shopItem.create({
      data: {
        sku: 'test-dermatoscope',
        name: 'Dermatoscope',
        description: 'test',
        itemType: 'EQUIPMENT',
        price: 50,
      },
    });
    const ownedItem = await prisma.ownedItem.create({
      data: {
        gameSessionId: gameSession.id,
        shopItemId: shopItem.id,
        purchasePrice: 50,
        purchasedOnDay: 1,
      },
    });
    const caseHint = await prisma.caseHint.create({
      data: {
        caseId: gameCase.id,
        content: 'Check the borders',
        sortOrder: 0,
        requiredShopItemId: shopItem.id,
      },
    });
    const chatMessage = await prisma.chatMessage.create({
      data: {
        caseId: gameCase.id,
        gameSessionId: gameSession.id,
        sender: 'PATIENT',
        content: 'It itches.',
        sortOrder: 0,
      },
    });
    const gameplayLog = await prisma.gameplayLog.create({
      data: {
        gameSessionId: gameSession.id,
        caseId: gameCase.id,
        eventType: 'DIAGNOSIS_SUBMITTED',
        payload: { ok: true },
      },
    });

    const loaded = await prisma.case.findUniqueOrThrow({
      where: { id: gameCase.id },
      include: {
        patient: true,
        correctDiagnosis: true,
        correctTreatment: true,
        documents: true,
        attentionPoints: true,
        hints: true,
        diagnosisAttempts: true,
        chatMessages: true,
        gameplayLogs: true,
      },
    });

    expect(loaded.patient.id).toBe(patient.id);
    expect(loaded.correctDiagnosis.id).toBe(diagnosis.id);
    expect(loaded.correctTreatment?.id).toBe(treatment.id);
    expect(loaded.documents.map((d) => d.id)).toEqual([document.id]);
    expect(loaded.attentionPoints.map((a) => a.id)).toEqual([attentionPoint.id]);
    expect(loaded.hints.map((h) => h.id)).toEqual([caseHint.id]);
    expect(loaded.diagnosisAttempts.map((a) => a.id)).toEqual([diagnosisAttempt.id]);
    expect(loaded.chatMessages.map((m) => m.id)).toEqual([chatMessage.id]);
    expect(loaded.gameplayLogs.map((l) => l.id)).toEqual([gameplayLog.id]);

    const loadedOwnedItem = await prisma.ownedItem.findUniqueOrThrow({
      where: { id: ownedItem.id },
      include: { shopItem: true, gameSession: true },
    });
    expect(loadedOwnedItem.shopItem.id).toBe(shopItem.id);
    expect(loadedOwnedItem.gameSession.id).toBe(gameSession.id);

    const loadedUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { sessions: true, gameSessions: true },
    });
    expect(loadedUser.sessions.map((s) => s.id)).toEqual([userSession.id]);
    expect(loadedUser.gameSessions.map((g) => g.id)).toEqual([gameSession.id]);
  });
});
