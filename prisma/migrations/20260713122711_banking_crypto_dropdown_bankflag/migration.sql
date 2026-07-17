/*
  Warnings:

  - You are about to drop the column `usdtBep20` on the `BankingDetail` table. All the data in the column will be lost.
  - You are about to drop the column `usdtErc20` on the `BankingDetail` table. All the data in the column will be lost.
  - You are about to drop the column `usdtTrc20` on the `BankingDetail` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BankingDetail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "accountNumber" TEXT,
    "ifsc" TEXT,
    "upiId" TEXT,
    "accountType" TEXT,
    "usdtAddress" TEXT,
    "usdtNetwork" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BankingDetail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_BankingDetail" ("accountNumber", "accountType", "createdAt", "id", "ifsc", "updatedAt", "upiId", "userId") SELECT "accountNumber", "accountType", "createdAt", "id", "ifsc", "updatedAt", "upiId", "userId" FROM "BankingDetail";
DROP TABLE "BankingDetail";
ALTER TABLE "new_BankingDetail" RENAME TO "BankingDetail";
CREATE UNIQUE INDEX "BankingDetail_userId_key" ON "BankingDetail"("userId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "bankTransferEnabled" BOOLEAN NOT NULL DEFAULT false,
    "cashEnabled" BOOLEAN NOT NULL DEFAULT false,
    "fullName" TEXT,
    "mobile" TEXT,
    "country" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "kycStatus" TEXT NOT NULL DEFAULT 'NOT_SUBMITTED',
    "kycNote" TEXT,
    "twoFactorSecret" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("address", "city", "country", "createdAt", "email", "fullName", "id", "kycNote", "kycStatus", "mobile", "passwordHash", "role", "state", "twoFactorEnabled", "twoFactorSecret", "updatedAt") SELECT "address", "city", "country", "createdAt", "email", "fullName", "id", "kycNote", "kycStatus", "mobile", "passwordHash", "role", "state", "twoFactorEnabled", "twoFactorSecret", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
