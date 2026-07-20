ALTER TABLE "ProfitShareRun" ADD COLUMN "activePeriodKey" TEXT;
ALTER TABLE "ProfitShareRun" ADD COLUMN "reversedAt" DATETIME;
ALTER TABLE "ProfitShareRun" ADD COLUMN "reversedById" TEXT REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
UPDATE "ProfitShareRun" SET "activePeriodKey" = "frequency" || ':' || "periodKey";
DROP INDEX "ProfitShareRun_frequency_periodKey_key";
CREATE UNIQUE INDEX "ProfitShareRun_activePeriodKey_key" ON "ProfitShareRun"("activePeriodKey");
CREATE INDEX "ProfitShareRun_reversedById_idx" ON "ProfitShareRun"("reversedById");