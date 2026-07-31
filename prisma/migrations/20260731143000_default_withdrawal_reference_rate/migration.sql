INSERT OR IGNORE INTO "Setting" ("key", "value")
VALUES ('WITHDRAWAL_INR_PER_USD', '100');

UPDATE "Setting"
SET "value" = '100'
WHERE "key" = 'WITHDRAWAL_INR_PER_USD';