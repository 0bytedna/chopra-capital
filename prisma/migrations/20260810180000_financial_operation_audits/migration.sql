CREATE TABLE "FinancialOperationAudit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "beforeState" TEXT NOT NULL,
    "afterState" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinancialOperationAudit_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FinancialOperationAudit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "FinancialOperationAudit_sourceType_sourceId_createdAt_idx" ON "FinancialOperationAudit"("sourceType", "sourceId", "createdAt");
CREATE INDEX "FinancialOperationAudit_adminId_createdAt_idx" ON "FinancialOperationAudit"("adminId", "createdAt");
CREATE INDEX "FinancialOperationAudit_userId_createdAt_idx" ON "FinancialOperationAudit"("userId", "createdAt");