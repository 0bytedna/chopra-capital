-- CreateTable
CREATE TABLE "BrokerTransferBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "totalQueuedUsdt" DECIMAL NOT NULL,
    "totalReceivedUsdt" DECIMAL NOT NULL,
    "navPrice" DECIMAL NOT NULL,
    "adminId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BrokerTransferBatch_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- AlterTable
ALTER TABLE "Deposit" ADD COLUMN "queuedUsdtAmount" DECIMAL;
ALTER TABLE "Deposit" ADD COLUMN "brokerTransferBatchId" TEXT REFERENCES "BrokerTransferBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Preserve the known USDT value of legacy completed deposits.
UPDATE "Deposit"
SET "queuedUsdtAmount" = "amount"
WHERE "status" = 'CONFIRMED';

-- CreateIndex
CREATE INDEX "Deposit_brokerTransferBatchId_idx" ON "Deposit"("brokerTransferBatchId");
CREATE INDEX "BrokerTransferBatch_createdAt_idx" ON "BrokerTransferBatch"("createdAt");
CREATE INDEX "BrokerTransferBatch_adminId_idx" ON "BrokerTransferBatch"("adminId");
