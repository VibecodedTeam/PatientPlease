-- AlterTable
ALTER TABLE "Case" ADD COLUMN     "featuredOrder" SMALLINT;

-- CreateIndex
CREATE INDEX "Case_featuredOrder_idx" ON "Case"("featuredOrder");
