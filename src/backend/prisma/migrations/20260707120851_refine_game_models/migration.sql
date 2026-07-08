/*
  Warnings:

  - You are about to drop the column `unlockDay` on the `Case` table. All the data in the column will be lost.
  - You are about to drop the column `gameSessionId` on the `DiagnosisAttempt` table. All the data in the column will be lost.
  - You are about to drop the column `chiefComplaint` on the `Patient` table. All the data in the column will be lost.
  - Changed the type of `difficulty` on the `Case` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `gameDayLogId` to the `DiagnosisAttempt` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "GameSessionStatus" ADD VALUE 'PAUSED';

-- DropForeignKey
ALTER TABLE "DiagnosisAttempt" DROP CONSTRAINT "DiagnosisAttempt_gameSessionId_fkey";

-- DropIndex
DROP INDEX "Case_isActive_unlockDay_idx";

-- DropIndex
DROP INDEX "DiagnosisAttempt_gameSessionId_attemptedAt_idx";

-- AlterTable
ALTER TABLE "Case" DROP COLUMN "unlockDay",
DROP COLUMN "difficulty",
ADD COLUMN     "difficulty" SMALLINT NOT NULL;

-- AlterTable
ALTER TABLE "DiagnosisAttempt" DROP COLUMN "gameSessionId",
ADD COLUMN     "gameDayLogId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "Patient" DROP COLUMN "chiefComplaint";

-- DropEnum
DROP TYPE "CaseDifficulty";

-- CreateIndex
CREATE INDEX "Case_isActive_idx" ON "Case"("isActive");

-- CreateIndex
CREATE INDEX "DiagnosisAttempt_gameDayLogId_attemptedAt_idx" ON "DiagnosisAttempt"("gameDayLogId", "attemptedAt");

-- AddForeignKey
ALTER TABLE "DiagnosisAttempt" ADD CONSTRAINT "DiagnosisAttempt_gameDayLogId_fkey" FOREIGN KEY ("gameDayLogId") REFERENCES "GameDayLog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
