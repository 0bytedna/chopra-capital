import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import {
  InternalTransferForm,
  type TransferInvestorOption,
} from "@/components/admin/InternalTransferForm";
import { AdminManualRequestForm } from "@/components/admin/AdminManualRequestForm";
import { D, formatUsdt, toNumber } from "@/lib/money";
import { getCurrentNav } from "@/lib/nav";
import { prisma } from "@/lib/prisma";
import { adminCreateDepositRequest, adminCreateWithdrawalRequest } from "../actions";
import { getFinancialControls } from "@/lib/financialControls";

export const metadata: Metadata = { title: "Admin · Transfers" };

function formatDate(date: Date) {
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default async function AdminInternalTransfersPage() {
  const [{ nav }, users, transfers, controls] = await Promise.all([
    getCurrentNav(),
    prisma.user.findMany({
      where: { role: "USER", isCompanyAccount: false },
      orderBy: [{ fullName: "asc" }, { email: "asc" }],
      select: {
        id: true,
        fullName: true,
        email: true,
        wallet: { select: { queued: true, units: true } },
      },
    }),
    prisma.internalTransfer.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        fromUser: { select: { id: true, fullName: true, email: true } },
        toUser: { select: { id: true, fullName: true, email: true } },
        admin: { select: { fullName: true, email: true } },
      },
    }),
    getFinancialControls(),
  ]);

  const investorOptions: TransferInvestorOption[] = users.map((user) => {
    const queued = D(user.wallet?.queued ?? 0);
    const invested = D(user.wallet?.units ?? 0).mul(nav);
    return {
      id: user.id,
      name: user.fullName ?? user.email,
      email: user.email,
      balance: toNumber(queued.add(invested)),
      queued: toNumber(queued),
      invested: toNumber(invested),
    };
  });
  const requestInvestorOptions = users.map((user) => ({
    id: user.id,
    label: `${user.fullName ?? "Unnamed investor"} · ${user.email}`,
  }));
  const depositAllowedMethods = [
    ...(!controls.depositCryptoPaused ? ["CRYPTO" as const] : []),
    ...(!controls.depositBankPaused ? ["BANK" as const] : []),
    ...(!controls.depositCashPaused ? ["CASH" as const] : []),
  ];
  const withdrawalAllowedMethods = [
    ...(!controls.withdrawalCryptoPaused ? ["CRYPTO" as const] : []),
    ...(!controls.withdrawalBankPaused ? ["BANK" as const] : []),
    ...(!controls.withdrawalCashPaused ? ["CASH" as const] : []),
  ];
  const depositMethods = depositAllowedMethods;
  const withdrawalMethods = withdrawalAllowedMethods;


  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <p className="eyebrow">Account operations</p>
        <h1 className="mt-2 font-serif text-3xl text-ink">
          Account <em className="gold-text italic">transfers</em>
        </h1>
      </header>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7" aria-labelledby="investor-requests-heading">
        <div className="mb-5">
          <p className="eyebrow">Investor requests</p>
          <h2 id="investor-requests-heading" className="mt-2 font-serif text-2xl text-ink">
            Create a request on behalf of an investor
          </h2>
          <p className="mt-2 text-sm text-ink-dim">
            New requests enter Step 1 of the standard deposit or withdrawal workflow.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <AdminManualRequestForm
            kind="deposit"
            action={adminCreateDepositRequest}
            investors={requestInvestorOptions}
            allowedMethods={depositMethods}
          />
          <AdminManualRequestForm
            kind="withdrawal"
            action={adminCreateWithdrawalRequest}
            investors={requestInvestorOptions}
            allowedMethods={withdrawalMethods}
          />
        </div>
      </section>

      <section className="glass-card rounded-2xl p-5 sm:p-7" aria-labelledby="new-transfer-heading">
        <div className="mb-6">
          <p className="eyebrow">New transfer</p>
          <h2 id="new-transfer-heading" className="mt-2 font-serif text-2xl text-ink">
            Move account value
          </h2>
        </div>
        {investorOptions.length >= 2 ? (
          <InternalTransferForm investors={investorOptions} />
        ) : (
          <p className="rounded-xl border border-dashed border-gold-600/20 px-4 py-10 text-center text-sm text-ink-faint">
            At least two investor accounts are required.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7" aria-labelledby="transfer-history-heading">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Audit trail</p>
            <h2 id="transfer-history-heading" className="mt-2 font-serif text-2xl text-ink">
              Transfer history
            </h2>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-positive/25 bg-positive/8 px-2.5 py-1 text-xs text-positive">
            <ShieldCheck className="size-3" aria-hidden />
            Permanent
          </span>
        </div>

        <div className="mt-5 overflow-x-auto">
          {transfers.length > 0 ? (
            <table className="w-full min-w-[60rem] text-left text-xs">
              <thead className="border-b border-stone-200 bg-stone-100 text-xs uppercase tracking-[0.12em] text-ink-faint">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th><th className="px-3 py-2 font-medium">From</th><th className="px-3 py-2 font-medium">To</th><th className="px-3 py-2 font-medium">Amount</th><th className="px-3 py-2 font-medium">Breakdown</th><th className="px-3 py-2 font-medium">NAV</th><th className="px-3 py-2 font-medium">Admin / note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 bg-white">
                {transfers.map((transfer) => (
                  <tr key={transfer.id} className="align-top bg-white even:bg-stone-50 hover:bg-stone-100">
                    <td className="whitespace-nowrap px-3 py-2 text-ink-dim">
                      {formatDate(transfer.createdAt)}
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/investors/${transfer.fromUser.id}`}
                        className="text-ink transition-colors hover:text-gold-300"
                      >
                        {transfer.fromUser.fullName ?? transfer.fromUser.email}
                      </Link>
                      <p className="mt-1 text-xs text-ink-faint">{transfer.fromUser.email}</p>
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/investors/${transfer.toUser.id}`}
                        className="text-ink transition-colors hover:text-gold-300"
                      >
                        {transfer.toUser.fullName ?? transfer.toUser.email}
                      </Link>
                      <p className="mt-1 text-xs text-ink-faint">{transfer.toUser.email}</p>
                    </td>
                    <td className="currency-value whitespace-nowrap px-3 py-2 text-sm text-ink">
                      {formatUsdt(transfer.amount)} USD
                    </td>
                    <td className="px-3 py-2 text-ink-dim">
                      <p className="currency-value">{formatUsdt(transfer.queuedAmount)} USD queued</p>
                      <p className="currency-value mt-1">{formatUsdt(transfer.investedAmount)} USD invested</p>
                      {D(transfer.units).gt(0) && (
                        <p className="mt-1 font-mono text-xs text-ink-faint">
                          {formatUsdt(transfer.units, 6)} units
                        </p>
                      )}
                    </td>
                    <td className="currency-value whitespace-nowrap px-3 py-2 text-ink-dim">
                      {formatUsdt(transfer.navPrice)} USD
                    </td>
                    <td className="max-w-64 px-3 py-2 text-ink-dim">
                      <p>{transfer.admin.fullName ?? transfer.admin.email}</p>
                      <p className="mt-1 break-words text-xs text-ink-faint">
                        {transfer.note ?? "No note"}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="py-10 text-center text-sm text-ink-faint">
              No transfers have been recorded.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
