-- AlterTable
ALTER TABLE "User" ADD COLUMN "address" TEXT;
ALTER TABLE "User" ADD COLUMN "city" TEXT;
ALTER TABLE "User" ADD COLUMN "state" TEXT;

-- CreateTable
CREATE TABLE "BankingDetail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "accountNumber" TEXT,
    "ifsc" TEXT,
    "upiId" TEXT,
    "accountType" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BankingDetail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "BankingDetail_userId_key" ON "BankingDetail"("userId");
