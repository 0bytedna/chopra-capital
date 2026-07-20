-- Add the staged withdrawal settlement lifecycle.
ALTER TABLE "Withdrawal" ADD COLUMN "requestedInrAmount" DECIMAL;
ALTER TABLE "Withdrawal" ADD COLUMN "requestExchangeRate" DECIMAL;
ALTER TABLE "Withdrawal" ADD COLUMN "brokerReceivedUsdt" DECIMAL;
ALTER TABLE "Withdrawal" ADD COLUMN "convertedInrAmount" DECIMAL;
ALTER TABLE "Withdrawal" ADD COLUMN "paidInrAmount" DECIMAL;
ALTER TABLE "Withdrawal" ADD COLUMN "brokerReference" TEXT;
ALTER TABLE "Withdrawal" ADD COLUMN "conversionReference" TEXT;
ALTER TABLE "Withdrawal" ADD COLUMN "approvedAt" DATETIME;
ALTER TABLE "Withdrawal" ADD COLUMN "brokerReceivedAt" DATETIME;
ALTER TABLE "Withdrawal" ADD COLUMN "convertedAt" DATETIME;

-- Preserve the known payout amount and lifecycle timestamps for historical
-- withdrawals that were completed before the staged workflow existed.
UPDATE "Withdrawal"
SET
  "brokerReceivedUsdt" = "paidAmount",
  "approvedAt" = "createdAt",
  "brokerReceivedAt" = "processedAt"
WHERE "status" = 'PROCESSED';

UPDATE "Withdrawal"
SET "approvedAt" = "createdAt"
WHERE "status" = 'APPROVED' AND "approvedAt" IS NULL;

INSERT OR IGNORE INTO "Setting" ("key", "value")
VALUES ('WITHDRAWAL_INR_PER_USD', '85');

CREATE INDEX "Withdrawal_status_method_idx"
ON "Withdrawal"("status", "method");
