ALTER TABLE "Withdrawal" ADD COLUMN "payoutAccountNumber" TEXT;
ALTER TABLE "Withdrawal" ADD COLUMN "payoutIfsc" TEXT;
ALTER TABLE "Withdrawal" ADD COLUMN "payoutUpiId" TEXT;
ALTER TABLE "Withdrawal" ADD COLUMN "payoutAccountType" TEXT;
ALTER TABLE "Withdrawal" ADD COLUMN "proposedAccountNumber" TEXT;
ALTER TABLE "Withdrawal" ADD COLUMN "proposedIfsc" TEXT;
ALTER TABLE "Withdrawal" ADD COLUMN "proposedUpiId" TEXT;
ALTER TABLE "Withdrawal" ADD COLUMN "proposedAccountType" TEXT;
ALTER TABLE "Withdrawal" ADD COLUMN "payoutCorrectionNote" TEXT;
ALTER TABLE "Withdrawal" ADD COLUMN "payoutCorrectionRequestedAt" DATETIME;
ALTER TABLE "Withdrawal" ADD COLUMN "payoutDetailsSubmittedAt" DATETIME;
ALTER TABLE "Withdrawal" ADD COLUMN "payoutDetailsApprovedAt" DATETIME;

-- Preserve the current bank destination for withdrawals that existed before
-- payout snapshots were introduced.
UPDATE "Withdrawal"
SET
  "payoutAccountNumber" = (
    SELECT "accountNumber"
    FROM "BankingDetail"
    WHERE "BankingDetail"."userId" = "Withdrawal"."userId"
  ),
  "payoutIfsc" = (
    SELECT "ifsc"
    FROM "BankingDetail"
    WHERE "BankingDetail"."userId" = "Withdrawal"."userId"
  ),
  "payoutUpiId" = (
    SELECT "upiId"
    FROM "BankingDetail"
    WHERE "BankingDetail"."userId" = "Withdrawal"."userId"
  ),
  "payoutAccountType" = (
    SELECT "accountType"
    FROM "BankingDetail"
    WHERE "BankingDetail"."userId" = "Withdrawal"."userId"
  )
WHERE "method" = 'BANK';

CREATE TABLE "WithdrawalPayoutDetailAudit" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "withdrawalId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "actorRole" TEXT NOT NULL,
  "accountNumber" TEXT,
  "ifsc" TEXT,
  "upiId" TEXT,
  "accountType" TEXT,
  "note" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WithdrawalPayoutDetailAudit_withdrawalId_fkey"
    FOREIGN KEY ("withdrawalId") REFERENCES "Withdrawal" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "WithdrawalPayoutDetailAudit_withdrawalId_createdAt_idx"
ON "WithdrawalPayoutDetailAudit" ("withdrawalId", "createdAt");
