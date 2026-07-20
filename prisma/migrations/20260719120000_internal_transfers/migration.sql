-- Audited value transfers between investor accounts. LedgerEntry remains the
-- accounting source of truth while this table links both sides and the admin.
CREATE TABLE "InternalTransfer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "queuedAmount" DECIMAL NOT NULL,
    "investedAmount" DECIMAL NOT NULL,
    "units" DECIMAL NOT NULL,
    "navPrice" DECIMAL NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InternalTransfer_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InternalTransfer_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InternalTransfer_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "InternalTransfer_fromUserId_createdAt_idx"
ON "InternalTransfer"("fromUserId", "createdAt");

CREATE INDEX "InternalTransfer_toUserId_createdAt_idx"
ON "InternalTransfer"("toUserId", "createdAt");

CREATE INDEX "InternalTransfer_adminId_createdAt_idx"
ON "InternalTransfer"("adminId", "createdAt");