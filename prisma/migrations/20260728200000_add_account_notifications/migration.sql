CREATE TABLE "AccountNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'UPDATE',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT NOT NULL DEFAULT '/app/notifications',
    "actionLabel" TEXT NOT NULL DEFAULT 'View details',
    "sourceType" TEXT,
    "sourceId" TEXT,
    "eventCode" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" DATETIME,
    CONSTRAINT "AccountNotification_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "AccountNotification_userId_isRead_createdAt_idx"
ON "AccountNotification"("userId", "isRead", "createdAt");

CREATE INDEX "AccountNotification_userId_createdAt_idx"
ON "AccountNotification"("userId", "createdAt");

CREATE INDEX "AccountNotification_sourceType_sourceId_idx"
ON "AccountNotification"("sourceType", "sourceId");

-- Preserve one readable current-state entry for existing financial requests.
-- Backfilled rows are marked read so deploying this migration does not create
-- a large false unread badge for historical activity.
INSERT INTO "AccountNotification" (
  "id", "userId", "kind", "title", "message", "href", "actionLabel",
  "sourceType", "sourceId", "eventCode", "isRead", "readAt", "createdAt"
)
SELECT
  lower(hex(randomblob(16))),
  "userId",
  CASE WHEN "status" = 'NEEDS_CORRECTION' THEN 'ACTION' ELSE 'UPDATE' END,
  CASE "status"
    WHEN 'PENDING' THEN 'Deposit submitted'
    WHEN 'NEEDS_CORRECTION' THEN 'Deposit needs correction'
    WHEN 'RECEIVED' THEN 'Deposit payment accepted'
    WHEN 'QUEUED' THEN 'Deposit accepted and queued'
    WHEN 'CONFIRMED' THEN 'Deposit invested'
    WHEN 'REJECTED' THEN 'Deposit rejected'
    ELSE 'Deposit cancelled'
  END,
  CASE "status"
    WHEN 'PENDING' THEN 'Your deposit is waiting for payment verification.'
    WHEN 'NEEDS_CORRECTION' THEN COALESCE(NULLIF("adminNote", ''), 'Correct the payment information requested by the operations team.')
    WHEN 'RECEIVED' THEN 'The payment was verified and is waiting for USDT conversion.'
    WHEN 'QUEUED' THEN 'The funds are in the company wallet and waiting for transfer to the broker.'
    WHEN 'CONFIRMED' THEN 'The net funds reached the broker and were added to your invested balance.'
    WHEN 'REJECTED' THEN COALESCE(NULLIF("adminNote", ''), 'The deposit was not approved.')
    ELSE 'The deposit request was cancelled.'
  END,
  '/app/history',
  'View deposit',
  'DEPOSIT',
  "id",
  'DEPOSIT_' || "status",
  true,
  CURRENT_TIMESTAMP,
  "createdAt"
FROM "Deposit";

INSERT INTO "AccountNotification" (
  "id", "userId", "kind", "title", "message", "href", "actionLabel",
  "sourceType", "sourceId", "eventCode", "isRead", "readAt", "createdAt"
)
SELECT
  lower(hex(randomblob(16))),
  "userId",
  CASE WHEN "status" = 'PAYOUT_DETAILS_REQUIRED' THEN 'ACTION' ELSE 'UPDATE' END,
  CASE "status"
    WHEN 'REQUESTED' THEN 'Withdrawal submitted'
    WHEN 'APPROVED' THEN 'Withdrawal approved'
    WHEN 'BROKER_RECEIVED' THEN 'Withdrawal received from broker'
    WHEN 'INR_READY' THEN 'INR payout is ready'
    WHEN 'PAYOUT_DETAILS_REQUIRED' THEN 'Withdrawal payout details need correction'
    WHEN 'PAYOUT_DETAILS_REVIEW' THEN 'Corrected payout details are under review'
    WHEN 'PROCESSED' THEN 'Withdrawal completed'
    WHEN 'REJECTED' THEN 'Withdrawal rejected'
    ELSE 'Withdrawal cancelled'
  END,
  CASE "status"
    WHEN 'REQUESTED' THEN 'Your withdrawal is waiting for admin review.'
    WHEN 'APPROVED' THEN 'Your request was accepted and is waiting for the bulk broker withdrawal.'
    WHEN 'BROKER_RECEIVED' THEN 'Funds were received from the broker and are being prepared for payout.'
    WHEN 'INR_READY' THEN 'USD conversion is complete and the INR payout is being processed.'
    WHEN 'PAYOUT_DETAILS_REQUIRED' THEN COALESCE(NULLIF("payoutCorrectionNote", ''), 'Correct your payout details before processing can continue.')
    WHEN 'PAYOUT_DETAILS_REVIEW' THEN 'Your corrected payout details are waiting for admin approval.'
    WHEN 'PROCESSED' THEN 'Your payout was completed.'
    WHEN 'REJECTED' THEN COALESCE(NULLIF("adminNote", ''), 'The withdrawal was not approved.')
    ELSE 'The withdrawal request was cancelled.'
  END,
  '/app/history',
  'View withdrawal',
  'WITHDRAWAL',
  "id",
  'WITHDRAWAL_' || "status",
  true,
  CURRENT_TIMESTAMP,
  "createdAt"
FROM "Withdrawal";

INSERT INTO "AccountNotification" (
  "id", "userId", "kind", "title", "message", "href", "actionLabel",
  "sourceType", "sourceId", "eventCode", "isRead", "readAt", "createdAt"
)
SELECT
  lower(hex(randomblob(16))),
  "id",
  CASE WHEN "kycStatus" = 'REJECTED' THEN 'ACTION' ELSE 'UPDATE' END,
  CASE "kycStatus"
    WHEN 'PENDING' THEN 'KYC submitted'
    WHEN 'APPROVED' THEN 'KYC approved'
    ELSE 'KYC needs correction'
  END,
  CASE "kycStatus"
    WHEN 'PENDING' THEN 'Your identity documents are under review.'
    WHEN 'APPROVED' THEN 'Your identity verification was approved. Deposits are now available.'
    ELSE COALESCE(NULLIF("kycNote", ''), 'Review and correct the requested identity documents.')
  END,
  '/app/profile#kyc-verification',
  'View KYC',
  'KYC',
  "id",
  'KYC_' || "kycStatus",
  true,
  CURRENT_TIMESTAMP,
  "updatedAt"
FROM "User"
WHERE "role" = 'USER' AND "kycStatus" IN ('PENDING', 'APPROVED', 'REJECTED');

CREATE TRIGGER "account_notification_deposit_created"
AFTER INSERT ON "Deposit"
BEGIN
  INSERT INTO "AccountNotification" (
    "id", "userId", "kind", "title", "message", "href", "actionLabel",
    "sourceType", "sourceId", "eventCode"
  ) VALUES (
    lower(hex(randomblob(16))),
    NEW."userId",
    'UPDATE',
    'Deposit submitted',
    CASE NEW."method"
      WHEN 'CRYPTO' THEN 'Your crypto deposit is waiting for wallet verification.'
      WHEN 'BANK' THEN 'Your bank transfer is waiting for payment verification.'
      ELSE 'Your cash deposit request is waiting for confirmation.'
    END,
    '/app/history',
    'View deposit',
    'DEPOSIT',
    NEW."id",
    'DEPOSIT_' || NEW."status"
  );
END;

CREATE TRIGGER "account_notification_deposit_status"
AFTER UPDATE OF "status" ON "Deposit"
WHEN OLD."status" <> NEW."status"
BEGIN
  UPDATE "AccountNotification"
  SET "isRead" = true, "readAt" = CURRENT_TIMESTAMP
  WHERE "userId" = NEW."userId"
    AND "sourceType" = 'DEPOSIT'
    AND "sourceId" = NEW."id"
    AND "isRead" = false;

  INSERT INTO "AccountNotification" (
    "id", "userId", "kind", "title", "message", "href", "actionLabel",
    "sourceType", "sourceId", "eventCode"
  ) VALUES (
    lower(hex(randomblob(16))),
    NEW."userId",
    CASE WHEN NEW."status" = 'NEEDS_CORRECTION' THEN 'ACTION' ELSE 'UPDATE' END,
    CASE NEW."status"
      WHEN 'PENDING' THEN 'Deposit resubmitted'
      WHEN 'NEEDS_CORRECTION' THEN 'Deposit needs correction'
      WHEN 'RECEIVED' THEN 'Deposit payment accepted'
      WHEN 'QUEUED' THEN 'Deposit accepted and queued'
      WHEN 'CONFIRMED' THEN 'Deposit invested'
      WHEN 'REJECTED' THEN 'Deposit rejected'
      ELSE 'Deposit cancelled'
    END,
    CASE NEW."status"
      WHEN 'PENDING' THEN 'Your corrected deposit information was submitted for another review.'
      WHEN 'NEEDS_CORRECTION' THEN COALESCE(NULLIF(NEW."adminNote", ''), 'Correct the payment information requested by the operations team.')
      WHEN 'RECEIVED' THEN 'The INR payment was verified and is waiting for bulk USDT conversion.'
      WHEN 'QUEUED' THEN 'The funds are in the company wallet and waiting for transfer to the broker.'
      WHEN 'CONFIRMED' THEN 'The net funds reached the broker and were added to your invested balance.'
      WHEN 'REJECTED' THEN COALESCE(NULLIF(NEW."adminNote", ''), 'The deposit was not approved. Open History to review the request.')
      ELSE 'The deposit request was cancelled.'
    END,
    '/app/history',
    'View deposit',
    'DEPOSIT',
    NEW."id",
    'DEPOSIT_' || NEW."status"
  );
END;

CREATE TRIGGER "account_notification_deposit_edited"
AFTER UPDATE OF "amount", "inrAmount", "reportedUsdtAmount", "reference", "txHash" ON "Deposit"
WHEN OLD."status" = NEW."status"
  AND (
    OLD."amount" IS NOT NEW."amount"
    OR OLD."inrAmount" IS NOT NEW."inrAmount"
    OR OLD."reportedUsdtAmount" IS NOT NEW."reportedUsdtAmount"
    OR OLD."reference" IS NOT NEW."reference"
    OR OLD."txHash" IS NOT NEW."txHash"
  )
BEGIN
  INSERT INTO "AccountNotification" (
    "id", "userId", "kind", "title", "message", "href", "actionLabel",
    "sourceType", "sourceId", "eventCode"
  ) VALUES (
    lower(hex(randomblob(16))),
    NEW."userId",
    'UPDATE',
    'Deposit request updated',
    'The amount or payment reference for your deposit was changed.',
    '/app/history',
    'View deposit',
    'DEPOSIT',
    NEW."id",
    'DEPOSIT_EDITED'
  );
END;

CREATE TRIGGER "account_notification_withdrawal_created"
AFTER INSERT ON "Withdrawal"
BEGIN
  INSERT INTO "AccountNotification" (
    "id", "userId", "kind", "title", "message", "href", "actionLabel",
    "sourceType", "sourceId", "eventCode"
  ) VALUES (
    lower(hex(randomblob(16))),
    NEW."userId",
    'UPDATE',
    'Withdrawal submitted',
    'Your withdrawal request is waiting for admin review.',
    '/app/history',
    'View withdrawal',
    'WITHDRAWAL',
    NEW."id",
    'WITHDRAWAL_' || NEW."status"
  );
END;

CREATE TRIGGER "account_notification_withdrawal_status"
AFTER UPDATE OF "status" ON "Withdrawal"
WHEN OLD."status" <> NEW."status"
BEGIN
  UPDATE "AccountNotification"
  SET "isRead" = true, "readAt" = CURRENT_TIMESTAMP
  WHERE "userId" = NEW."userId"
    AND "sourceType" = 'WITHDRAWAL'
    AND "sourceId" = NEW."id"
    AND "isRead" = false;

  INSERT INTO "AccountNotification" (
    "id", "userId", "kind", "title", "message", "href", "actionLabel",
    "sourceType", "sourceId", "eventCode"
  ) VALUES (
    lower(hex(randomblob(16))),
    NEW."userId",
    CASE WHEN NEW."status" = 'PAYOUT_DETAILS_REQUIRED' THEN 'ACTION' ELSE 'UPDATE' END,
    CASE NEW."status"
      WHEN 'REQUESTED' THEN 'Withdrawal resubmitted'
      WHEN 'APPROVED' THEN 'Withdrawal approved'
      WHEN 'BROKER_RECEIVED' THEN 'Withdrawal received from broker'
      WHEN 'INR_READY' THEN 'INR payout is ready'
      WHEN 'PAYOUT_DETAILS_REQUIRED' THEN 'Withdrawal payout details need correction'
      WHEN 'PAYOUT_DETAILS_REVIEW' THEN 'Corrected payout details are under review'
      WHEN 'PROCESSED' THEN 'Withdrawal completed'
      WHEN 'REJECTED' THEN 'Withdrawal rejected'
      ELSE 'Withdrawal cancelled'
    END,
    CASE NEW."status"
      WHEN 'REQUESTED' THEN 'Your updated withdrawal request is waiting for admin review.'
      WHEN 'APPROVED' THEN 'Your request was accepted and is waiting for the bulk broker withdrawal.'
      WHEN 'BROKER_RECEIVED' THEN 'Funds were received from the broker and are being prepared for payout.'
      WHEN 'INR_READY' THEN 'USD conversion is complete and the INR payout is being processed.'
      WHEN 'PAYOUT_DETAILS_REQUIRED' THEN COALESCE(NULLIF(NEW."payoutCorrectionNote", ''), 'Correct your payout details before processing can continue.')
      WHEN 'PAYOUT_DETAILS_REVIEW' THEN 'Your corrected payout details are waiting for admin approval.'
      WHEN 'PROCESSED' THEN 'Your payout was completed.'
      WHEN 'REJECTED' THEN COALESCE(NULLIF(NEW."adminNote", ''), 'The withdrawal was not approved. Open History to review the request.')
      ELSE 'The withdrawal request was cancelled.'
    END,
    '/app/history',
    'View withdrawal',
    'WITHDRAWAL',
    NEW."id",
    'WITHDRAWAL_' || NEW."status"
  );
END;

CREATE TRIGGER "account_notification_withdrawal_edited"
AFTER UPDATE OF "amount", "method", "network", "address" ON "Withdrawal"
WHEN OLD."status" = NEW."status"
  AND (
    OLD."amount" IS NOT NEW."amount"
    OR OLD."method" IS NOT NEW."method"
    OR OLD."network" IS NOT NEW."network"
    OR OLD."address" IS NOT NEW."address"
  )
BEGIN
  INSERT INTO "AccountNotification" (
    "id", "userId", "kind", "title", "message", "href", "actionLabel",
    "sourceType", "sourceId", "eventCode"
  ) VALUES (
    lower(hex(randomblob(16))),
    NEW."userId",
    'UPDATE',
    'Withdrawal request updated',
    'The amount or payout method for your withdrawal was changed.',
    '/app/history',
    'View withdrawal',
    'WITHDRAWAL',
    NEW."id",
    'WITHDRAWAL_EDITED'
  );
END;

CREATE TRIGGER "account_notification_kyc_status"
AFTER UPDATE OF "kycStatus" ON "User"
WHEN OLD."kycStatus" <> NEW."kycStatus" AND NEW."role" = 'USER'
BEGIN
  UPDATE "AccountNotification"
  SET "isRead" = true, "readAt" = CURRENT_TIMESTAMP
  WHERE "userId" = NEW."id"
    AND "sourceType" = 'KYC'
    AND "isRead" = false;

  INSERT INTO "AccountNotification" (
    "id", "userId", "kind", "title", "message", "href", "actionLabel",
    "sourceType", "sourceId", "eventCode"
  ) VALUES (
    lower(hex(randomblob(16))),
    NEW."id",
    CASE WHEN NEW."kycStatus" = 'REJECTED' THEN 'ACTION' ELSE 'UPDATE' END,
    CASE NEW."kycStatus"
      WHEN 'PENDING' THEN 'KYC submitted'
      WHEN 'APPROVED' THEN 'KYC approved'
      WHEN 'REJECTED' THEN 'KYC needs correction'
      ELSE 'KYC status reset'
    END,
    CASE NEW."kycStatus"
      WHEN 'PENDING' THEN 'Your identity documents were submitted and are under review.'
      WHEN 'APPROVED' THEN 'Your identity verification was approved. Deposits are now available.'
      WHEN 'REJECTED' THEN COALESCE(NULLIF(NEW."kycNote", ''), 'Review and correct the requested identity documents.')
      ELSE 'Identity verification must be completed again before financial requests are available.'
    END,
    '/app/profile#kyc-verification',
    CASE WHEN NEW."kycStatus" = 'REJECTED' THEN 'Correct KYC' ELSE 'View KYC' END,
    'KYC',
    NEW."id",
    'KYC_' || NEW."kycStatus"
  );
END;

CREATE TRIGGER "account_notification_profile_changed"
AFTER UPDATE OF "fullName", "mobile", "country", "address", "city", "state" ON "User"
WHEN NEW."role" = 'USER'
  AND (
    OLD."fullName" IS NOT NEW."fullName"
    OR OLD."mobile" IS NOT NEW."mobile"
    OR OLD."country" IS NOT NEW."country"
    OR OLD."address" IS NOT NEW."address"
    OR OLD."city" IS NOT NEW."city"
    OR OLD."state" IS NOT NEW."state"
  )
BEGIN
  INSERT INTO "AccountNotification" (
    "id", "userId", "kind", "title", "message", "href", "actionLabel",
    "sourceType", "sourceId", "eventCode"
  ) VALUES (
    lower(hex(randomblob(16))),
    NEW."id",
    'UPDATE',
    'Profile details updated',
    'Your personal profile information was changed. Review it if you did not expect this update.',
    '/app/profile',
    'Review profile',
    'PROFILE',
    NEW."id",
    'PROFILE_UPDATED'
  );
END;

CREATE TRIGGER "account_notification_deposit_methods_changed"
AFTER UPDATE OF "bankTransferEnabled", "cashEnabled" ON "User"
WHEN NEW."role" = 'USER'
  AND (
    OLD."bankTransferEnabled" <> NEW."bankTransferEnabled"
    OR OLD."cashEnabled" <> NEW."cashEnabled"
  )
BEGIN
  INSERT INTO "AccountNotification" (
    "id", "userId", "kind", "title", "message", "href", "actionLabel",
    "sourceType", "sourceId", "eventCode"
  ) VALUES (
    lower(hex(randomblob(16))),
    NEW."id",
    'UPDATE',
    'Deposit methods updated',
    'The deposit methods available for your account were changed by the operations team.',
    '/app/deposit',
    'View deposit methods',
    'PROFILE',
    NEW."id",
    'DEPOSIT_METHODS_UPDATED'
  );
END;

CREATE TRIGGER "account_notification_password_changed"
AFTER UPDATE OF "passwordHash" ON "User"
WHEN OLD."passwordHash" <> NEW."passwordHash" AND NEW."role" = 'USER'
BEGIN
  INSERT INTO "AccountNotification" (
    "id", "userId", "kind", "title", "message", "href", "actionLabel",
    "sourceType", "sourceId", "eventCode"
  ) VALUES (
    lower(hex(randomblob(16))),
    NEW."id",
    'UPDATE',
    'Password changed',
    'The password for your account was changed. Contact support immediately if you did not authorize it.',
    '/app/profile#security',
    'Review security',
    'SECURITY',
    NEW."id",
    'PASSWORD_CHANGED'
  );
END;

CREATE TRIGGER "account_notification_two_factor_changed"
AFTER UPDATE OF "twoFactorEnabled" ON "User"
WHEN OLD."twoFactorEnabled" <> NEW."twoFactorEnabled" AND NEW."role" = 'USER'
BEGIN
  INSERT INTO "AccountNotification" (
    "id", "userId", "kind", "title", "message", "href", "actionLabel",
    "sourceType", "sourceId", "eventCode"
  ) VALUES (
    lower(hex(randomblob(16))),
    NEW."id",
    'UPDATE',
    CASE WHEN NEW."twoFactorEnabled" = true THEN 'Two-factor authentication enabled' ELSE 'Two-factor authentication disabled' END,
    CASE
      WHEN NEW."twoFactorEnabled" = true THEN 'Authenticator verification is now enabled for protected account actions.'
      ELSE 'Authenticator verification was disabled. Contact support if you did not authorize this change.'
    END,
    '/app/profile#two-factor-security',
    'Review security',
    'SECURITY',
    NEW."id",
    CASE WHEN NEW."twoFactorEnabled" = true THEN 'TWO_FACTOR_ENABLED' ELSE 'TWO_FACTOR_DISABLED' END
  );
END;

CREATE TRIGGER "account_notification_banking_created"
AFTER INSERT ON "BankingDetail"
BEGIN
  INSERT INTO "AccountNotification" (
    "id", "userId", "kind", "title", "message", "href", "actionLabel",
    "sourceType", "sourceId", "eventCode"
  ) VALUES (
    lower(hex(randomblob(16))),
    NEW."userId",
    'UPDATE',
    'Payout details saved',
    'Bank or crypto payout information was added to your profile.',
    '/app/profile',
    'Review payout details',
    'PAYOUT_DETAILS',
    NEW."id",
    'PAYOUT_DETAILS_SAVED'
  );
END;

CREATE TRIGGER "account_notification_banking_changed"
AFTER UPDATE ON "BankingDetail"
WHEN OLD."accountNumber" IS NOT NEW."accountNumber"
  OR OLD."ifsc" IS NOT NEW."ifsc"
  OR OLD."upiId" IS NOT NEW."upiId"
  OR OLD."accountType" IS NOT NEW."accountType"
  OR OLD."usdtAddress" IS NOT NEW."usdtAddress"
  OR OLD."usdtNetwork" IS NOT NEW."usdtNetwork"
BEGIN
  INSERT INTO "AccountNotification" (
    "id", "userId", "kind", "title", "message", "href", "actionLabel",
    "sourceType", "sourceId", "eventCode"
  ) VALUES (
    lower(hex(randomblob(16))),
    NEW."userId",
    'UPDATE',
    'Payout details updated',
    'Bank or crypto payout information was changed. Review it if you did not expect this update.',
    '/app/profile',
    'Review payout details',
    'PAYOUT_DETAILS',
    NEW."id",
    'PAYOUT_DETAILS_UPDATED'
  );
END;

CREATE TRIGGER "account_notification_ticket_created"
AFTER INSERT ON "Ticket"
BEGIN
  INSERT INTO "AccountNotification" (
    "id", "userId", "kind", "title", "message", "href", "actionLabel",
    "sourceType", "sourceId", "eventCode"
  ) VALUES (
    lower(hex(randomblob(16))),
    NEW."userId",
    'UPDATE',
    'Support ticket created',
    'Your support request was submitted: ' || NEW."subject",
    '/app/tickets/' || NEW."id",
    'View ticket',
    'TICKET',
    NEW."id",
    'TICKET_OPEN'
  );
END;

CREATE TRIGGER "account_notification_ticket_status"
AFTER UPDATE OF "status" ON "Ticket"
WHEN OLD."status" <> NEW."status"
BEGIN
  UPDATE "AccountNotification"
  SET "isRead" = true, "readAt" = CURRENT_TIMESTAMP
  WHERE "userId" = NEW."userId"
    AND "sourceType" = 'TICKET'
    AND "sourceId" = NEW."id"
    AND "isRead" = false;

  INSERT INTO "AccountNotification" (
    "id", "userId", "kind", "title", "message", "href", "actionLabel",
    "sourceType", "sourceId", "eventCode"
  ) VALUES (
    lower(hex(randomblob(16))),
    NEW."userId",
    CASE WHEN NEW."status" = 'ANSWERED' THEN 'ACTION' ELSE 'UPDATE' END,
    CASE NEW."status"
      WHEN 'ANSWERED' THEN 'Support replied'
      WHEN 'CLOSED' THEN 'Support ticket closed'
      ELSE 'Support ticket reopened'
    END,
    CASE NEW."status"
      WHEN 'ANSWERED' THEN 'A support reply is waiting on: ' || NEW."subject"
      WHEN 'CLOSED' THEN 'Your support ticket was marked closed: ' || NEW."subject"
      ELSE 'Your reply reopened the support ticket: ' || NEW."subject"
    END,
    '/app/tickets/' || NEW."id",
    'View ticket',
    'TICKET',
    NEW."id",
    'TICKET_' || NEW."status"
  );
END;

CREATE TRIGGER "account_notification_internal_transfer"
AFTER INSERT ON "InternalTransfer"
BEGIN
  INSERT INTO "AccountNotification" (
    "id", "userId", "kind", "title", "message", "href", "actionLabel",
    "sourceType", "sourceId", "eventCode"
  ) VALUES (
    lower(hex(randomblob(16))),
    NEW."fromUserId",
    'UPDATE',
    'Internal transfer sent',
    printf('%.2f USD was moved from your account to another investor account.', CAST(NEW."amount" AS REAL)),
    '/app/history',
    'View account history',
    'INTERNAL_TRANSFER',
    NEW."id",
    'INTERNAL_TRANSFER_SENT'
  );

  INSERT INTO "AccountNotification" (
    "id", "userId", "kind", "title", "message", "href", "actionLabel",
    "sourceType", "sourceId", "eventCode"
  ) VALUES (
    lower(hex(randomblob(16))),
    NEW."toUserId",
    'UPDATE',
    'Internal transfer received',
    printf('%.2f USD was added to your account from another investor account.', CAST(NEW."amount" AS REAL)),
    '/app/history',
    'View account history',
    'INTERNAL_TRANSFER',
    NEW."id",
    'INTERNAL_TRANSFER_RECEIVED'
  );
END;

CREATE TRIGGER "account_notification_ledger_change"
AFTER INSERT ON "LedgerEntry"
WHEN NEW."type" IN ('FEE', 'ADJUSTMENT')
  AND COALESCE(NEW."note", '') NOT LIKE 'Internal transfer %'
BEGIN
  INSERT INTO "AccountNotification" (
    "id", "userId", "kind", "title", "message", "href", "actionLabel",
    "sourceType", "sourceId", "eventCode"
  ) VALUES (
    lower(hex(randomblob(16))),
    NEW."userId",
    'UPDATE',
    CASE
      WHEN NEW."type" = 'FEE' THEN 'Fee applied to your account'
      WHEN CAST(NEW."amount" AS REAL) >= 0 THEN 'Account balance increased'
      ELSE 'Account balance decreased'
    END,
    CASE
      WHEN NEW."type" = 'FEE' THEN printf('A %.2f USD fee was recorded. %s', ABS(CAST(NEW."amount" AS REAL)), COALESCE(NEW."note", ''))
      WHEN CAST(NEW."amount" AS REAL) >= 0 THEN printf('Your account increased by %.2f USD. %s', ABS(CAST(NEW."amount" AS REAL)), COALESCE(NEW."note", ''))
      ELSE printf('Your account decreased by %.2f USD. %s', ABS(CAST(NEW."amount" AS REAL)), COALESCE(NEW."note", ''))
    END,
    '/app/history',
    'View account history',
    'LEDGER',
    NEW."id",
    'LEDGER_' || NEW."type"
  );
END;

CREATE TRIGGER "account_notification_trading_movement"
AFTER INSERT ON "TradingAccountEntry"
WHEN NEW."type" IN (
  'TRADING_PROFIT',
  'TRADING_LOSS',
  'SERVER_FEE',
  'ADMIN_SHARE',
  'OTHER_INCREASE',
  'OTHER_DECREASE'
)
BEGIN
  INSERT INTO "AccountNotification" (
    "id", "userId", "kind", "title", "message", "href", "actionLabel",
    "sourceType", "sourceId", "eventCode"
  )
  SELECT
    lower(hex(randomblob(16))),
    "Wallet"."userId",
    'UPDATE',
    CASE NEW."type"
      WHEN 'TRADING_PROFIT' THEN 'Trading profit recorded'
      WHEN 'TRADING_LOSS' THEN 'Trading loss recorded'
      WHEN 'SERVER_FEE' THEN 'Operating fee recorded'
      WHEN 'ADMIN_SHARE' THEN 'Company share recorded'
      WHEN 'OTHER_INCREASE' THEN 'Trading account value increased'
      ELSE 'Trading account value decreased'
    END,
    'Your dashboard balance and performance figures were recalculated using the updated trading account value.',
    '/app',
    'View dashboard',
    'TRADING_ACCOUNT',
    NEW."id",
    'TRADING_' || NEW."type"
  FROM "Wallet"
  WHERE CAST("Wallet"."units" AS REAL) > 0;
END;
