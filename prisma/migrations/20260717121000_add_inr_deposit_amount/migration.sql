-- Keep the INR payment reported by an investor separate from the USDT value
-- an admin later confirms and credits to the investment wallet.
ALTER TABLE "Deposit" ADD COLUMN "inrAmount" DECIMAL;

-- Previous pending bank/cash requests stored their reported amount in the
-- USDT field. Preserve that user-entered value as INR and clear the yet-to-be
-- confirmed USDT credit amount.
UPDATE "Deposit"
SET "inrAmount" = "amount", "amount" = 0
WHERE "method" IN ('BANK', 'CASH')
  AND "status" = 'PENDING'
  AND "inrAmount" IS NULL;
