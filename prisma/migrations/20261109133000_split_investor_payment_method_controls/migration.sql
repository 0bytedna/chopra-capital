ALTER TABLE "User" ADD COLUMN "depositBankEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "depositCryptoEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "depositCashEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "withdrawalBankEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "withdrawalCryptoEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "withdrawalCashEnabled" BOOLEAN NOT NULL DEFAULT false;

UPDATE "User"
SET "depositBankEnabled" = "bankTransferEnabled",
    "depositCryptoEnabled" = "cryptoEnabled",
    "depositCashEnabled" = "cashEnabled",
    "withdrawalBankEnabled" = "bankTransferEnabled",
    "withdrawalCryptoEnabled" = "cryptoEnabled",
    "withdrawalCashEnabled" = "cashEnabled";

UPDATE "Setting" SET "value" = 'false' WHERE "key" IN ('DEPOSITS_PAUSED', 'WITHDRAWALS_PAUSED');
