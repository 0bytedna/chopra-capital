-- DropIndex
DROP INDEX "ProfitShareRun_reversedById_idx";

-- CreateTable
CREATE TABLE "TradingAccountEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "balanceBefore" DECIMAL NOT NULL,
    "balanceAfter" DECIMAL NOT NULL,
    "equityBefore" DECIMAL NOT NULL,
    "equityAfter" DECIMAL NOT NULL,
    "note" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TradingAccountEntry_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PoolState" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'pool',
    "totalUnits" DECIMAL NOT NULL DEFAULT 0,
    "lastNav" DECIMAL NOT NULL DEFAULT 1,
    "tradingBalance" DECIMAL NOT NULL DEFAULT 0,
    "tradingEquity" DECIMAL NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_PoolState" ("id", "lastNav", "totalUnits", "updatedAt") SELECT "id", "lastNav", "totalUnits", "updatedAt" FROM "PoolState";
DROP TABLE "PoolState";
ALTER TABLE "new_PoolState" RENAME TO "PoolState";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "TradingAccountEntry_createdAt_idx" ON "TradingAccountEntry"("createdAt");

-- CreateIndex
CREATE INDEX "TradingAccountEntry_adminId_createdAt_idx" ON "TradingAccountEntry"("adminId", "createdAt");
