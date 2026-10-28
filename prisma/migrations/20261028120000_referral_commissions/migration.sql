-- Add a public investor ID and admin-controlled referral eligibility.
ALTER TABLE "User" ADD COLUMN "publicId" TEXT;
ALTER TABLE "User" ADD COLUMN "referralEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Existing accounts receive a unique, non-sequential public ID. New accounts
-- receive one in application code.
UPDATE "User"
SET "publicId" = 'CC-' || upper(substr(hex(randomblob(16)), 1, 10))
WHERE "publicId" IS NULL;

CREATE UNIQUE INDEX "User_publicId_key" ON "User"("publicId");

CREATE TABLE "Referral" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referrerId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Referral_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "CommissionWallet" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "balance" DECIMAL NOT NULL DEFAULT 0,
    "totalEarned" DECIMAL NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CommissionWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ReferralCommission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referralId" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "periodStart" TEXT NOT NULL,
    "periodEnd" TEXT NOT NULL,
    "ratePercent" DECIMAL NOT NULL,
    "eligibleProfit" DECIMAL NOT NULL,
    "amount" DECIMAL NOT NULL,
    "note" TEXT,
    "adminId" TEXT NOT NULL,
    "distributedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReferralCommission_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReferralCommission_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReferralCommission_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReferralCommission_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Referral_referredUserId_key" ON "Referral"("referredUserId");
CREATE INDEX "Referral_referrerId_createdAt_idx" ON "Referral"("referrerId", "createdAt");
CREATE UNIQUE INDEX "ReferralCommission_referralId_periodStart_periodEnd_key" ON "ReferralCommission"("referralId", "periodStart", "periodEnd");
CREATE INDEX "ReferralCommission_referrerId_createdAt_idx" ON "ReferralCommission"("referrerId", "createdAt");
CREATE INDEX "ReferralCommission_referredUserId_createdAt_idx" ON "ReferralCommission"("referredUserId", "createdAt");
CREATE INDEX "ReferralCommission_adminId_createdAt_idx" ON "ReferralCommission"("adminId", "createdAt");
