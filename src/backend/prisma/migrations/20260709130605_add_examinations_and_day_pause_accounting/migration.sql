-- AlterEnum
ALTER TYPE "CaseDocumentType" ADD VALUE 'EXAMINATION_RESULTS';

-- AlterEnum
ALTER TYPE "ShopItemType" ADD VALUE 'EXAMINATION';

-- AlterTable
ALTER TABLE "GameDayLog" ADD COLUMN     "extraElapsedMs" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalPausedMs" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ShopItem" ADD COLUMN     "content" JSONB;

-- CreateTable
CREATE TABLE "CaseExamination" (
    "id" UUID NOT NULL,
    "gameSessionId" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "shopItemId" UUID NOT NULL,
    "isSuccessful" BOOLEAN NOT NULL,
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseExamination_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CaseExamination_caseId_idx" ON "CaseExamination"("caseId");

-- CreateIndex
CREATE INDEX "CaseExamination_shopItemId_idx" ON "CaseExamination"("shopItemId");

-- CreateIndex
CREATE UNIQUE INDEX "CaseExamination_gameSessionId_caseId_shopItemId_key" ON "CaseExamination"("gameSessionId", "caseId", "shopItemId");

-- AddForeignKey
ALTER TABLE "CaseExamination" ADD CONSTRAINT "CaseExamination_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseExamination" ADD CONSTRAINT "CaseExamination_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseExamination" ADD CONSTRAINT "CaseExamination_shopItemId_fkey" FOREIGN KEY ("shopItemId") REFERENCES "ShopItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
