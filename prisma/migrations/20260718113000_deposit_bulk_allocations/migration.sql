-- CreateTable
CREATE TABLE "DepositAllocationBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "method" TEXT NOT NULL,
    "totalSourceAmount" DECIMAL NOT NULL,
    "totalUsdt" DECIMAL NOT NULL,
    "adminId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DepositAllocationBatch_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- AlterTable
ALTER TABLE "Deposit" ADD COLUMN "reportedUsdtAmount" DECIMAL;
ALTER TABLE "Deposit" ADD COLUMN "receivedAt" DATETIME;
ALTER TABLE "Deposit" ADD COLUMN "allocationBatchId" TEXT REFERENCES "DepositAllocationBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Preserve the originally reported crypto amount before future allocations
-- overwrite Deposit.amount with the user's final queue credit.
UPDATE "Deposit"
SET "reportedUsdtAmount" = "amount"
WHERE "method" = 'CRYPTO';

-- Existing completed deposits were necessarily received before they were
-- credited, so their historical confirmation time is the best receipt time.
UPDATE "Deposit"
SET "receivedAt" = "confirmedAt"
WHERE "status" = 'CONFIRMED';

-- CreateIndex
CREATE INDEX "Deposit_status_method_idx" ON "Deposit"("status", "method");
CREATE INDEX "Deposit_allocationBatchId_idx" ON "Deposit"("allocationBatchId");
CREATE INDEX "DepositAllocationBatch_method_createdAt_idx" ON "DepositAllocationBatch"("method", "createdAt");
CREATE INDEX "DepositAllocationBatch_adminId_idx" ON "DepositAllocationBatch"("adminId");
