-- Add revocable sessions and one-time TOTP tracking.
ALTER TABLE "User" ADD COLUMN "lastTotpStep" INTEGER;
ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- Durable authentication throttles shared by every application process.
CREATE TABLE "AuthRateLimit" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);
CREATE INDEX "AuthRateLimit_resetAt_idx" ON "AuthRateLimit"("resetAt");

-- Normalized transaction-hash fingerprints prevent the same on-chain
-- deposit from being submitted again. For historical duplicate groups, only
-- the earliest record is fingerprinted so this migration remains deployable;
-- every future submission still conflicts with that canonical record.
ALTER TABLE "Deposit" ADD COLUMN "txHashFingerprint" TEXT;
UPDATE "Deposit" AS d
SET "status" = 'CANCELLED',
    "adminNote" = CASE
      WHEN d."adminNote" IS NULL OR trim(d."adminNote") = ''
        THEN 'Automatically cancelled: duplicate blockchain transaction hash.'
      ELSE d."adminNote" || ' | Automatically cancelled: duplicate blockchain transaction hash.'
    END
WHERE d."method" = 'CRYPTO'
  AND d."status" IN ('PENDING', 'NEEDS_CORRECTION')
  AND d."txHash" IS NOT NULL
  AND trim(d."txHash") <> ''
  AND d."id" <> (
    SELECT d2."id"
    FROM "Deposit" AS d2
    WHERE lower(trim(coalesce(d2."network", ''))) || ':' ||
          CASE
            WHEN lower(substr(trim(d2."txHash"), 1, 2)) = '0x' THEN lower(substr(trim(d2."txHash"), 3))
            ELSE lower(trim(d2."txHash"))
          END =
          lower(trim(coalesce(d."network", ''))) || ':' ||
          CASE
            WHEN lower(substr(trim(d."txHash"), 1, 2)) = '0x' THEN lower(substr(trim(d."txHash"), 3))
            ELSE lower(trim(d."txHash"))
          END
    ORDER BY d2."createdAt" ASC, d2."id" ASC
    LIMIT 1
  );
UPDATE "Deposit" AS d
SET "txHashFingerprint" = lower(trim(coalesce(d."network", ''))) || ':' ||
    CASE
      WHEN lower(substr(trim(d."txHash"), 1, 2)) = '0x' THEN lower(substr(trim(d."txHash"), 3))
      ELSE lower(trim(d."txHash"))
    END
WHERE d."txHash" IS NOT NULL
  AND trim(d."txHash") <> ''
  AND d."id" = (
    SELECT d2."id"
    FROM "Deposit" AS d2
    WHERE lower(trim(coalesce(d2."network", ''))) || ':' ||
          CASE
            WHEN lower(substr(trim(d2."txHash"), 1, 2)) = '0x' THEN lower(substr(trim(d2."txHash"), 3))
            ELSE lower(trim(d2."txHash"))
          END =
          lower(trim(coalesce(d."network", ''))) || ':' ||
          CASE
            WHEN lower(substr(trim(d."txHash"), 1, 2)) = '0x' THEN lower(substr(trim(d."txHash"), 3))
            ELSE lower(trim(d."txHash"))
          END
    ORDER BY d2."createdAt" ASC, d2."id" ASC
    LIMIT 1
  );
CREATE UNIQUE INDEX "Deposit_txHashFingerprint_key" ON "Deposit"("txHashFingerprint");

-- Remove the confirmed stored-HTML test payload from legacy wallet records.
-- Strict network-specific validation in the application prevents recurrence.
UPDATE "BankingDetail"
SET "usdtAddress" = NULL, "usdtNetwork" = NULL
WHERE "usdtAddress" LIKE '%<%' OR "usdtAddress" LIKE '%>%';
