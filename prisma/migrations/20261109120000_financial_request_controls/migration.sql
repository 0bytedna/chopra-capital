ALTER TABLE "User" ADD COLUMN "depositsEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "withdrawalsEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "cryptoEnabled" BOOLEAN NOT NULL DEFAULT true;

INSERT OR IGNORE INTO "Setting" ("key", "value") VALUES ('DEPOSITS_PAUSED', 'false');
INSERT OR IGNORE INTO "Setting" ("key", "value") VALUES ('WITHDRAWALS_PAUSED', 'false');
