-- A dedicated company trading account uses the same User, Wallet and Ledger
-- accounting as every investor while remaining excluded from fee assessment.
ALTER TABLE "User" ADD COLUMN "isCompanyAccount" BOOLEAN NOT NULL DEFAULT false;

INSERT OR IGNORE INTO "User" (
    "id",
    "email",
    "passwordHash",
    "role",
    "isCompanyAccount",
    "fullName",
    "kycStatus",
    "createdAt",
    "updatedAt"
) VALUES (
    'company-trading-account',
    'company.trading@chopracapital.internal',
    '!INTERNAL_ACCOUNT_NO_LOGIN!',
    'USER',
    true,
    'Chopra Capital Company Trading Account',
    'APPROVED',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO "Wallet" (
    "id",
    "userId",
    "queued",
    "units",
    "updatedAt"
) VALUES (
    'company-trading-wallet',
    'company-trading-account',
    0,
    0,
    CURRENT_TIMESTAMP
);

CREATE TABLE "ProfitShareRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "frequency" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "cutoffDate" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "ratePercent" DECIMAL,
    "fixedAmount" DECIMAL,
    "navPrice" DECIMAL NOT NULL,
    "totalEligibleProfit" DECIMAL NOT NULL,
    "totalCompanyShare" DECIMAL NOT NULL,
    "companyUserId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProfitShareRun_companyUserId_fkey" FOREIGN KEY ("companyUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProfitShareRun_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "ProfitShareAllocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profitBeforeShare" DECIMAL NOT NULL,
    "highWaterBefore" DECIMAL NOT NULL,
    "eligibleProfit" DECIMAL NOT NULL,
    "companyShare" DECIMAL NOT NULL,
    "unitsTransferred" DECIMAL NOT NULL,
    "highWaterAfter" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProfitShareAllocation_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ProfitShareRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProfitShareAllocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "ProfitSharePosition" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "highWaterProfit" DECIMAL NOT NULL DEFAULT 0,
    "lastRunAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProfitSharePosition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ProfitShareRun_frequency_periodKey_key"
ON "ProfitShareRun"("frequency", "periodKey");

CREATE INDEX "ProfitShareRun_createdAt_idx"
ON "ProfitShareRun"("createdAt");

CREATE UNIQUE INDEX "ProfitShareAllocation_runId_userId_key"
ON "ProfitShareAllocation"("runId", "userId");

CREATE INDEX "ProfitShareAllocation_userId_createdAt_idx"
ON "ProfitShareAllocation"("userId", "createdAt");