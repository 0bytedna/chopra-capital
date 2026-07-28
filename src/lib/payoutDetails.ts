import "server-only";

import type { Prisma } from "@/generated/prisma";

export type BankPayoutDetails = {
  accountNumber: string;
  ifsc: string;
  upiId: string | null;
  accountType: string;
};

export async function stageRequiredBankPayoutCorrections(
  tx: Prisma.TransactionClient,
  {
    userId,
    details,
    actorId,
    actorRole,
  }: {
    userId: string;
    details: BankPayoutDetails;
    actorId: string;
    actorRole: "USER" | "ADMIN";
  },
): Promise<number> {
  const withdrawals = await tx.withdrawal.findMany({
    where: {
      userId,
      method: "BANK",
      status: { in: ["PAYOUT_DETAILS_REQUIRED", "PAYOUT_DETAILS_REVIEW"] },
    },
    select: { id: true, payoutCorrectionNote: true },
  });
  if (withdrawals.length === 0) return 0;

  const submittedAt = new Date();
  for (const withdrawal of withdrawals) {
    const updated = await tx.withdrawal.updateMany({
      where: {
        id: withdrawal.id,
        userId,
        method: "BANK",
        status: { in: ["PAYOUT_DETAILS_REQUIRED", "PAYOUT_DETAILS_REVIEW"] },
      },
      data: {
        status: "PAYOUT_DETAILS_REVIEW",
        proposedAccountNumber: details.accountNumber,
        proposedIfsc: details.ifsc,
        proposedUpiId: details.upiId,
        proposedAccountType: details.accountType,
        payoutDetailsSubmittedAt: submittedAt,
      },
    });
    if (updated.count !== 1) continue;

    await tx.withdrawalPayoutDetailAudit.create({
      data: {
        withdrawalId: withdrawal.id,
        action: "DETAILS_SUBMITTED",
        actorId,
        actorRole,
        accountNumber: details.accountNumber,
        ifsc: details.ifsc,
        upiId: details.upiId,
        accountType: details.accountType,
        note: withdrawal.payoutCorrectionNote,
      },
    });
  }

  return withdrawals.length;
}
