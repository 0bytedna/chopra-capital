-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Deposit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'CRYPTO',
    "amount" DECIMAL NOT NULL,
    "network" TEXT,
    "txHash" TEXT,
    "reference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" DATETIME,
    CONSTRAINT "Deposit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Deposit" ("adminNote", "amount", "confirmedAt", "createdAt", "id", "network", "status", "txHash", "userId") SELECT "adminNote", "amount", "confirmedAt", "createdAt", "id", "network", "status", "txHash", "userId" FROM "Deposit";
DROP TABLE "Deposit";
ALTER TABLE "new_Deposit" RENAME TO "Deposit";
CREATE INDEX "Deposit_userId_createdAt_idx" ON "Deposit"("userId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
