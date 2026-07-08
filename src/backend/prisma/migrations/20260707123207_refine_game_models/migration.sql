/*
  Warnings:

  - You are about to drop the column `currentDay` on the `GameSession` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "GameDayLog" ADD COLUMN     "pausedAt" TIMESTAMP(3),
ALTER COLUMN "endingMoney" DROP NOT NULL,
ALTER COLUMN "casesAttempted" SET DEFAULT 0,
ALTER COLUMN "casesCorrect" SET DEFAULT 0,
ALTER COLUMN "penaltyApplied" DROP NOT NULL;

-- AlterTable
ALTER TABLE "GameSession" DROP COLUMN "currentDay";
