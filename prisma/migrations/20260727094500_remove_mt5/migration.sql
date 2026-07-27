UPDATE "PoolState" SET "tradingBalance" = COALESCE((SELECT "balance" FROM "Mt5Account" ORDER BY "updatedAt" DESC LIMIT 1), "tradingBalance"), "tradingEquity" = COALESCE((SELECT "equity" FROM "Mt5Account" ORDER BY "updatedAt" DESC LIMIT 1), "tradingEquity");

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Mt5Account";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Mt5Trade";
PRAGMA foreign_keys=on;
