-- Convert legacy profit-share relations away from the removed company account.
UPDATE "ProfitShareRun" SET "companyUserId" = "adminId" WHERE "companyUserId" = 'company-trading-account';

-- Remove relations that intentionally use RESTRICT before deleting known demo accounts.
DELETE FROM "InternalTransfer" WHERE "fromUserId" IN (SELECT "id" FROM "User" WHERE "email" = 'demo@chopracapital.com' OR "id" = 'company-trading-account') OR "toUserId" IN (SELECT "id" FROM "User" WHERE "email" = 'demo@chopracapital.com' OR "id" = 'company-trading-account');
DELETE FROM "ProfitShareAllocation" WHERE "userId" IN (SELECT "id" FROM "User" WHERE "email" = 'demo@chopracapital.com' OR "id" = 'company-trading-account');
DELETE FROM "TicketMessage" WHERE "authorId" IN (SELECT "id" FROM "User" WHERE "email" = 'demo@chopracapital.com' OR "id" = 'company-trading-account');
DELETE FROM "User" WHERE "email" = 'demo@chopracapital.com' OR "id" = 'company-trading-account';