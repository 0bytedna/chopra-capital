-- Store the chosen payout method on each withdrawal. SQLite represents Prisma
-- enums as TEXT, so adding CANCELLED to WithdrawalStatus needs no table change.
ALTER TABLE "Withdrawal" ADD COLUMN "method" TEXT NOT NULL DEFAULT 'CRYPTO';
