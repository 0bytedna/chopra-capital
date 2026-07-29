import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWithdrawalReferenceRate } from "@/lib/withdrawal-rate";
import { formatInr, formatUsdt } from "@/lib/money";
import { HistoryTabs } from "./HistoryTabs";

export const metadata: Metadata = { title: "History" };

export default async function HistoryPage() {
  const user = await requireUser();
  const [deposits, withdrawals, currentInrRate] = await Promise.all([
    prisma.deposit.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.withdrawal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    getWithdrawalReferenceRate(),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <p className="eyebrow">Account activity</p>
        <h1 className="mt-2 font-serif text-2xl text-ink sm:text-3xl">
          Transaction <em className="gold-text italic">history</em>
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-dim">
          Review, edit, or cancel eligible deposit and withdrawal requests from one place.
          Confirmed and completed records remain available as your account history.
        </p>
      </header>

      <section className="glass-card rounded-2xl p-4 sm:p-7">
        <HistoryTabs
          twoFactorEnabled={user.twoFactorEnabled}
          withdrawalMethods={{ bank: user.bankTransferEnabled, cash: user.cashEnabled }}
          deposits={deposits.map((deposit) => ({
            id: deposit.id,
            method: deposit.method,
            status: deposit.status,
            amount: formatUsdt(deposit.amount),
            queuedUsdtAmount:
              deposit.queuedUsdtAmount === null
                ? null
                : formatUsdt(deposit.queuedUsdtAmount, 8),
            reportedUsdtAmount:
              deposit.reportedUsdtAmount === null
                ? null
                : formatUsdt(deposit.reportedUsdtAmount, 8),
            inrAmount:
              deposit.inrAmount === null ? null : formatInr(deposit.inrAmount),
            editAmount: (deposit.reportedUsdtAmount ?? deposit.amount).toString(),
            editInrAmount: deposit.inrAmount?.toString() ?? null,
            network: deposit.network,
            txHash: deposit.txHash,
            reference: deposit.reference,
            adminNote: deposit.adminNote,
            createdAt: deposit.createdAt.toISOString(),
          }))}
          withdrawals={withdrawals.map((withdrawal) => ({
            id: withdrawal.id,
            method: withdrawal.method,
            status: withdrawal.status,
            amount: formatUsdt(withdrawal.amount),
            editAmount: withdrawal.amount.toString(),
            referenceRate: formatInr(currentInrRate),
            network: withdrawal.network,
            address: withdrawal.address,
            paidAmount:
              withdrawal.paidAmount === null
                ? null
                : formatUsdt(withdrawal.paidAmount),
            paidInrAmount:
              withdrawal.paidInrAmount === null
                ? null
                : formatInr(withdrawal.paidInrAmount),
            brokerReceivedUsdt:
              withdrawal.brokerReceivedUsdt === null
                ? null
                : formatUsdt(withdrawal.brokerReceivedUsdt),
            convertedInrAmount:
              withdrawal.convertedInrAmount === null
                ? null
                : formatInr(withdrawal.convertedInrAmount),
            weekKey: withdrawal.weekKey,
            adminNote: withdrawal.adminNote,
            payoutCorrectionNote: withdrawal.payoutCorrectionNote,
            createdAt: withdrawal.createdAt.toISOString(),
          }))}
        />
      </section>
    </div>
  );
}
