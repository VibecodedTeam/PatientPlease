-- CreateTable
CREATE TABLE "CaseDocumentReveal" (
    "id" UUID NOT NULL,
    "gameSessionId" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "caseDocumentId" UUID NOT NULL,
    "revealedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseDocumentReveal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CaseDocumentReveal_gameSessionId_caseId_idx" ON "CaseDocumentReveal"("gameSessionId", "caseId");

-- CreateIndex
CREATE UNIQUE INDEX "CaseDocumentReveal_gameSessionId_caseDocumentId_key" ON "CaseDocumentReveal"("gameSessionId", "caseDocumentId");

-- AddForeignKey
ALTER TABLE "CaseDocumentReveal" ADD CONSTRAINT "CaseDocumentReveal_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseDocumentReveal" ADD CONSTRAINT "CaseDocumentReveal_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseDocumentReveal" ADD CONSTRAINT "CaseDocumentReveal_caseDocumentId_fkey" FOREIGN KEY ("caseDocumentId") REFERENCES "CaseDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
