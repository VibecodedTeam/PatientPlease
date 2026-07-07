-- CreateEnum
CREATE TYPE "ChatSender" AS ENUM ('PLAYER', 'PATIENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "DiagnosisCategory" AS ENUM ('BENIGN', 'MALIGNANT', 'INFLAMMATORY', 'INFECTIOUS', 'OTHER');

-- CreateEnum
CREATE TYPE "TreatmentKind" AS ENUM ('TOPICAL', 'ORAL_MEDICATION', 'PROCEDURE', 'REFERRAL', 'MONITORING', 'NONE');

-- CreateEnum
CREATE TYPE "CaseDocumentType" AS ENUM ('SKIN_IMAGE', 'DISEASE_HISTORY', 'UV_EXPOSURE_HISTORY', 'CLINICAL_SYMPTOMS', 'FAMILY_HISTORY', 'WEATHER_HISTORY');

-- CreateEnum
CREATE TYPE "ShopItemType" AS ENUM ('EQUIPMENT', 'HANDBOOK', 'PLOT_ITEM');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "CaseDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "BodyRegion" AS ENUM ('HEAD', 'NECK', 'CHEST', 'BACK', 'ABDOMEN', 'LEFT_ARM', 'RIGHT_ARM', 'LEFT_LEG', 'RIGHT_LEG', 'HAND', 'FOOT', 'OTHER');

-- CreateEnum
CREATE TYPE "GameSessionStatus" AS ENUM ('ACTIVE', 'GAME_OVER', 'COMPLETED');

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" SERIAL NOT NULL,
    "caseId" INTEGER NOT NULL,
    "gameSessionId" INTEGER NOT NULL,
    "sender" "ChatSender" NOT NULL,
    "content" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Diagnosis" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "DiagnosisCategory" NOT NULL,

    CONSTRAINT "Diagnosis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Treatment" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "kind" "TreatmentKind" NOT NULL,

    CONSTRAINT "Treatment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosisAttempt" (
    "id" SERIAL NOT NULL,
    "gameSessionId" INTEGER NOT NULL,
    "caseId" INTEGER NOT NULL,
    "selectedDiagnosisId" INTEGER NOT NULL,
    "selectedTreatmentId" INTEGER,
    "isDiagnosisCorrect" BOOLEAN NOT NULL,
    "isTreatmentCorrect" BOOLEAN,
    "moneyDelta" INTEGER NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiagnosisAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseDocument" (
    "id" SERIAL NOT NULL,
    "caseId" INTEGER NOT NULL,
    "attentionPointId" INTEGER,
    "type" "CaseDocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "documentDate" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "imageWidthPx" INTEGER,
    "imageHeightPx" INTEGER,
    "imageAltText" TEXT,
    "content" JSONB,

    CONSTRAINT "CaseDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopItem" (
    "id" SERIAL NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "itemType" "ShopItemType" NOT NULL,
    "price" INTEGER NOT NULL,
    "unlockDay" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "iconImageUrl" TEXT,

    CONSTRAINT "ShopItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnedItem" (
    "id" SERIAL NOT NULL,
    "gameSessionId" INTEGER NOT NULL,
    "shopItemId" INTEGER NOT NULL,
    "purchasePrice" INTEGER NOT NULL,
    "purchasedOnDay" INTEGER NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnedItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseHint" (
    "id" SERIAL NOT NULL,
    "caseId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "unlockAfterDay" INTEGER,
    "requiredShopItemId" INTEGER,

    CONSTRAINT "CaseHint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameplayLog" (
    "id" SERIAL NOT NULL,
    "gameSessionId" INTEGER,
    "caseId" INTEGER,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameplayLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "sex" "Sex" NOT NULL,
    "occupation" TEXT,
    "chiefComplaint" TEXT NOT NULL,
    "portraitImageUrl" TEXT NOT NULL,
    "bodyModelVariant" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "difficulty" "CaseDifficulty" NOT NULL,
    "unlockDay" INTEGER,
    "correctDiagnosisId" INTEGER NOT NULL,
    "correctTreatmentId" INTEGER,
    "moneyReward" INTEGER NOT NULL,
    "moneyPenalty" INTEGER NOT NULL,
    "resultExplanationText" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttentionPoint" (
    "id" SERIAL NOT NULL,
    "caseId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "bodyRegion" "BodyRegion" NOT NULL,
    "positionX" DOUBLE PRECISION NOT NULL,
    "positionY" DOUBLE PRECISION NOT NULL,
    "positionZ" DOUBLE PRECISION NOT NULL,
    "hitboxRadius" DOUBLE PRECISION NOT NULL,
    "zoomDistance" DOUBLE PRECISION,
    "zoomYaw" DOUBLE PRECISION,
    "zoomPitch" DOUBLE PRECISION,
    "isKeyFinding" BOOLEAN NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "AttentionPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSession" (
    "id" SERIAL NOT NULL,
    "currentDay" INTEGER NOT NULL DEFAULT 1,
    "money" INTEGER NOT NULL DEFAULT 0,
    "studentLoanThreshold" INTEGER,
    "consecutiveBadDiagnosisCount" INTEGER NOT NULL DEFAULT 0,
    "status" "GameSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameDayLog" (
    "id" SERIAL NOT NULL,
    "gameSessionId" INTEGER NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "startingMoney" INTEGER NOT NULL,
    "endingMoney" INTEGER NOT NULL,
    "thresholdMet" BOOLEAN,
    "casesAttempted" INTEGER NOT NULL,
    "casesCorrect" INTEGER NOT NULL,
    "penaltyApplied" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "GameDayLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Diagnosis_code_key" ON "Diagnosis"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Treatment_code_key" ON "Treatment"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ShopItem_sku_key" ON "ShopItem"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "OwnedItem_gameSessionId_shopItemId_key" ON "OwnedItem"("gameSessionId", "shopItemId");

-- CreateIndex
CREATE UNIQUE INDEX "Case_patientId_key" ON "Case"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "GameDayLog_gameSessionId_dayNumber_key" ON "GameDayLog"("gameSessionId", "dayNumber");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosisAttempt" ADD CONSTRAINT "DiagnosisAttempt_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosisAttempt" ADD CONSTRAINT "DiagnosisAttempt_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosisAttempt" ADD CONSTRAINT "DiagnosisAttempt_selectedDiagnosisId_fkey" FOREIGN KEY ("selectedDiagnosisId") REFERENCES "Diagnosis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosisAttempt" ADD CONSTRAINT "DiagnosisAttempt_selectedTreatmentId_fkey" FOREIGN KEY ("selectedTreatmentId") REFERENCES "Treatment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseDocument" ADD CONSTRAINT "CaseDocument_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseDocument" ADD CONSTRAINT "CaseDocument_attentionPointId_fkey" FOREIGN KEY ("attentionPointId") REFERENCES "AttentionPoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnedItem" ADD CONSTRAINT "OwnedItem_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnedItem" ADD CONSTRAINT "OwnedItem_shopItemId_fkey" FOREIGN KEY ("shopItemId") REFERENCES "ShopItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseHint" ADD CONSTRAINT "CaseHint_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseHint" ADD CONSTRAINT "CaseHint_requiredShopItemId_fkey" FOREIGN KEY ("requiredShopItemId") REFERENCES "ShopItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameplayLog" ADD CONSTRAINT "GameplayLog_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameplayLog" ADD CONSTRAINT "GameplayLog_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_correctDiagnosisId_fkey" FOREIGN KEY ("correctDiagnosisId") REFERENCES "Diagnosis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_correctTreatmentId_fkey" FOREIGN KEY ("correctTreatmentId") REFERENCES "Treatment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttentionPoint" ADD CONSTRAINT "AttentionPoint_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameDayLog" ADD CONSTRAINT "GameDayLog_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
