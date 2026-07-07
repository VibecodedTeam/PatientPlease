/*
  Warnings:

  - The primary key for the `AttentionPoint` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Case` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `correctTreatmentId` column on the `Case` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `CaseDocument` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `attentionPointId` column on the `CaseDocument` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `CaseHint` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `requiredShopItemId` column on the `CaseHint` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `ChatMessage` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Diagnosis` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `DiagnosisAttempt` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `selectedTreatmentId` column on the `DiagnosisAttempt` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `GameDayLog` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `GameSession` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `GameplayLog` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `gameSessionId` column on the `GameplayLog` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `caseId` column on the `GameplayLog` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `OwnedItem` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Patient` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `ShopItem` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Treatment` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `id` on the `AttentionPoint` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `caseId` on the `AttentionPoint` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `Case` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `patientId` on the `Case` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `correctDiagnosisId` on the `Case` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `CaseDocument` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `caseId` on the `CaseDocument` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `CaseHint` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `caseId` on the `CaseHint` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `ChatMessage` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `caseId` on the `ChatMessage` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `gameSessionId` on the `ChatMessage` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `Diagnosis` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `DiagnosisAttempt` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `gameSessionId` on the `DiagnosisAttempt` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `caseId` on the `DiagnosisAttempt` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `selectedDiagnosisId` on the `DiagnosisAttempt` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `GameDayLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `gameSessionId` on the `GameDayLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `userId` to the `GameSession` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `id` on the `GameSession` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `GameplayLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `OwnedItem` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `gameSessionId` on the `OwnedItem` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `shopItemId` on the `OwnedItem` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `Patient` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `ShopItem` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `Treatment` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "AttentionPoint" DROP CONSTRAINT "AttentionPoint_caseId_fkey";

-- DropForeignKey
ALTER TABLE "Case" DROP CONSTRAINT "Case_correctDiagnosisId_fkey";

-- DropForeignKey
ALTER TABLE "Case" DROP CONSTRAINT "Case_correctTreatmentId_fkey";

-- DropForeignKey
ALTER TABLE "Case" DROP CONSTRAINT "Case_patientId_fkey";

-- DropForeignKey
ALTER TABLE "CaseDocument" DROP CONSTRAINT "CaseDocument_attentionPointId_fkey";

-- DropForeignKey
ALTER TABLE "CaseDocument" DROP CONSTRAINT "CaseDocument_caseId_fkey";

-- DropForeignKey
ALTER TABLE "CaseHint" DROP CONSTRAINT "CaseHint_caseId_fkey";

-- DropForeignKey
ALTER TABLE "CaseHint" DROP CONSTRAINT "CaseHint_requiredShopItemId_fkey";

-- DropForeignKey
ALTER TABLE "ChatMessage" DROP CONSTRAINT "ChatMessage_caseId_fkey";

-- DropForeignKey
ALTER TABLE "ChatMessage" DROP CONSTRAINT "ChatMessage_gameSessionId_fkey";

-- DropForeignKey
ALTER TABLE "DiagnosisAttempt" DROP CONSTRAINT "DiagnosisAttempt_caseId_fkey";

-- DropForeignKey
ALTER TABLE "DiagnosisAttempt" DROP CONSTRAINT "DiagnosisAttempt_gameSessionId_fkey";

-- DropForeignKey
ALTER TABLE "DiagnosisAttempt" DROP CONSTRAINT "DiagnosisAttempt_selectedDiagnosisId_fkey";

-- DropForeignKey
ALTER TABLE "DiagnosisAttempt" DROP CONSTRAINT "DiagnosisAttempt_selectedTreatmentId_fkey";

-- DropForeignKey
ALTER TABLE "GameDayLog" DROP CONSTRAINT "GameDayLog_gameSessionId_fkey";

-- DropForeignKey
ALTER TABLE "GameplayLog" DROP CONSTRAINT "GameplayLog_caseId_fkey";

-- DropForeignKey
ALTER TABLE "GameplayLog" DROP CONSTRAINT "GameplayLog_gameSessionId_fkey";

-- DropForeignKey
ALTER TABLE "OwnedItem" DROP CONSTRAINT "OwnedItem_gameSessionId_fkey";

-- DropForeignKey
ALTER TABLE "OwnedItem" DROP CONSTRAINT "OwnedItem_shopItemId_fkey";

-- AlterTable
ALTER TABLE "AttentionPoint" DROP CONSTRAINT "AttentionPoint_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "caseId",
ADD COLUMN     "caseId" UUID NOT NULL,
ADD CONSTRAINT "AttentionPoint_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Case" DROP CONSTRAINT "Case_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "patientId",
ADD COLUMN     "patientId" UUID NOT NULL,
DROP COLUMN "correctDiagnosisId",
ADD COLUMN     "correctDiagnosisId" UUID NOT NULL,
DROP COLUMN "correctTreatmentId",
ADD COLUMN     "correctTreatmentId" UUID,
ADD CONSTRAINT "Case_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "CaseDocument" DROP CONSTRAINT "CaseDocument_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "caseId",
ADD COLUMN     "caseId" UUID NOT NULL,
DROP COLUMN "attentionPointId",
ADD COLUMN     "attentionPointId" UUID,
ADD CONSTRAINT "CaseDocument_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "CaseHint" DROP CONSTRAINT "CaseHint_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "caseId",
ADD COLUMN     "caseId" UUID NOT NULL,
DROP COLUMN "requiredShopItemId",
ADD COLUMN     "requiredShopItemId" UUID,
ADD CONSTRAINT "CaseHint_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "ChatMessage" DROP CONSTRAINT "ChatMessage_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "caseId",
ADD COLUMN     "caseId" UUID NOT NULL,
DROP COLUMN "gameSessionId",
ADD COLUMN     "gameSessionId" UUID NOT NULL,
ADD CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Diagnosis" DROP CONSTRAINT "Diagnosis_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "Diagnosis_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "DiagnosisAttempt" DROP CONSTRAINT "DiagnosisAttempt_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "gameSessionId",
ADD COLUMN     "gameSessionId" UUID NOT NULL,
DROP COLUMN "caseId",
ADD COLUMN     "caseId" UUID NOT NULL,
DROP COLUMN "selectedDiagnosisId",
ADD COLUMN     "selectedDiagnosisId" UUID NOT NULL,
DROP COLUMN "selectedTreatmentId",
ADD COLUMN     "selectedTreatmentId" UUID,
ADD CONSTRAINT "DiagnosisAttempt_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "GameDayLog" DROP CONSTRAINT "GameDayLog_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "gameSessionId",
ADD COLUMN     "gameSessionId" UUID NOT NULL,
ADD CONSTRAINT "GameDayLog_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "GameSession" DROP CONSTRAINT "GameSession_pkey",
ADD COLUMN     "userId" UUID NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "GameplayLog" DROP CONSTRAINT "GameplayLog_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "gameSessionId",
ADD COLUMN     "gameSessionId" UUID,
DROP COLUMN "caseId",
ADD COLUMN     "caseId" UUID,
ADD CONSTRAINT "GameplayLog_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "OwnedItem" DROP CONSTRAINT "OwnedItem_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "gameSessionId",
ADD COLUMN     "gameSessionId" UUID NOT NULL,
DROP COLUMN "shopItemId",
ADD COLUMN     "shopItemId" UUID NOT NULL,
ADD CONSTRAINT "OwnedItem_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Patient" DROP CONSTRAINT "Patient_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "Patient_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "ShopItem" DROP CONSTRAINT "ShopItem_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "ShopItem_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Treatment" DROP CONSTRAINT "Treatment_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "Treatment_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "googleId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_sessionToken_key" ON "UserSession"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "Case_patientId_key" ON "Case"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "GameDayLog_gameSessionId_dayNumber_key" ON "GameDayLog"("gameSessionId", "dayNumber");

-- CreateIndex
CREATE UNIQUE INDEX "OwnedItem_gameSessionId_shopItemId_key" ON "OwnedItem"("gameSessionId", "shopItemId");

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameDayLog" ADD CONSTRAINT "GameDayLog_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
