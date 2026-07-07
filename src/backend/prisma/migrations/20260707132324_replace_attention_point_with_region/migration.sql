/*
  Warnings:

  - You are about to drop the column `attentionPointId` on the `CaseDocument` table. All the data in the column will be lost.
  - The values [HAND,FOOT] on the enum `BodyRegion` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `AttentionPoint` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[attentionPointRegion,caseId]` on the table `CaseDocument` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "CaseDocument" DROP CONSTRAINT "CaseDocument_attentionPointId_fkey";

-- DropIndex
DROP INDEX "CaseDocument_attentionPointId_idx";

-- AlterEnum
BEGIN;
CREATE TYPE "BodyRegion_new" AS ENUM ('HEAD', 'NECK', 'CHEST', 'BACK', 'ABDOMEN', 'LEFT_ARM', 'RIGHT_ARM', 'LEFT_LEG', 'RIGHT_LEG', 'LEFT_HAND', 'RIGHT_HAND', 'LEFT_FOOT', 'RIGHT_FOOT', 'OTHER');
ALTER TABLE "AttentionPoint" ALTER COLUMN "bodyRegion" TYPE "BodyRegion_new" USING ("bodyRegion"::text::"BodyRegion_new");
ALTER TYPE "BodyRegion" RENAME TO "BodyRegion_old";
ALTER TYPE "BodyRegion_new" RENAME TO "BodyRegion";
DROP TYPE "public"."BodyRegion_old";
COMMIT;

-- AlterTable
ALTER TABLE "CaseDocument" DROP COLUMN "attentionPointId",
ADD COLUMN     "attentionPointRegion" "BodyRegion";

-- DropTable
DROP TABLE "AttentionPoint";

-- CreateIndex
CREATE UNIQUE INDEX "CaseDocument_attentionPointRegion_caseId_key" ON "CaseDocument"("attentionPointRegion", "caseId");
