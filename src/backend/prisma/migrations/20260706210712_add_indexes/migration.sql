-- CreateIndex
CREATE INDEX "AttentionPoint_caseId_sortOrder_idx" ON "AttentionPoint"("caseId", "sortOrder");

-- CreateIndex
CREATE INDEX "Case_correctDiagnosisId_idx" ON "Case"("correctDiagnosisId");

-- CreateIndex
CREATE INDEX "Case_correctTreatmentId_idx" ON "Case"("correctTreatmentId");

-- CreateIndex
CREATE INDEX "Case_isActive_unlockDay_idx" ON "Case"("isActive", "unlockDay");

-- CreateIndex
CREATE INDEX "CaseDocument_caseId_sortOrder_idx" ON "CaseDocument"("caseId", "sortOrder");

-- CreateIndex
CREATE INDEX "CaseDocument_attentionPointId_idx" ON "CaseDocument"("attentionPointId");

-- CreateIndex
CREATE INDEX "CaseHint_caseId_sortOrder_idx" ON "CaseHint"("caseId", "sortOrder");

-- CreateIndex
CREATE INDEX "CaseHint_requiredShopItemId_idx" ON "CaseHint"("requiredShopItemId");

-- CreateIndex
CREATE INDEX "ChatMessage_caseId_sortOrder_idx" ON "ChatMessage"("caseId", "sortOrder");

-- CreateIndex
CREATE INDEX "ChatMessage_gameSessionId_sentAt_idx" ON "ChatMessage"("gameSessionId", "sentAt");

-- CreateIndex
CREATE INDEX "DiagnosisAttempt_gameSessionId_attemptedAt_idx" ON "DiagnosisAttempt"("gameSessionId", "attemptedAt");

-- CreateIndex
CREATE INDEX "DiagnosisAttempt_caseId_idx" ON "DiagnosisAttempt"("caseId");

-- CreateIndex
CREATE INDEX "DiagnosisAttempt_selectedDiagnosisId_idx" ON "DiagnosisAttempt"("selectedDiagnosisId");

-- CreateIndex
CREATE INDEX "DiagnosisAttempt_selectedTreatmentId_idx" ON "DiagnosisAttempt"("selectedTreatmentId");

-- CreateIndex
CREATE INDEX "GameSession_userId_status_idx" ON "GameSession"("userId", "status");

-- CreateIndex
CREATE INDEX "GameplayLog_gameSessionId_occurredAt_idx" ON "GameplayLog"("gameSessionId", "occurredAt");

-- CreateIndex
CREATE INDEX "GameplayLog_caseId_idx" ON "GameplayLog"("caseId");

-- CreateIndex
CREATE INDEX "GameplayLog_eventType_idx" ON "GameplayLog"("eventType");

-- CreateIndex
CREATE INDEX "OwnedItem_shopItemId_idx" ON "OwnedItem"("shopItemId");

-- CreateIndex
CREATE INDEX "ShopItem_itemType_idx" ON "ShopItem"("itemType");

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- CreateIndex
CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");
