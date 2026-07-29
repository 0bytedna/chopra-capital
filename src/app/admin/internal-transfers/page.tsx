import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import {
  InternalTransferForm,
  type TransferInvestorOption,
} from "@/components/admin/InternalTransferForm";
import { D, formatUsdt, toNumber } from "@/lib/money";
import { getCurrentNav } from "@/lib/nav";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Admin · Internal transfers" };

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
  const [{ nav }, users, transfers] = await Promise.all([
    getCurrentNav(),
    prisma.user.findMany({
      where: { role: "USER" },
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


  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <p className="eyebrow">Account operations</p>
        <h1 className="mt-2 font-serif text-3xl text-ink">
          Internal <em className="gold-text italic">transfers</em>
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-dim">
          Move USD value between investor accounts without changing company cash,
          broker equity or total pool units.
        </p>
      </header>

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

      <section className="glass-card rounded-2xl p-5 sm:p-7" aria-labelledby="transfer-history-heading">
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
              <thead className="border-b border-gold-600/15 text-xs uppercase tracking-[0.14em] text-ink-faint">
                <tr>
                  <th className="px-3 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 font-medium">From</th>
                  <th className="px-3 py-3 font-medium">To</th>
                  <th className="px-3 py-3 font-medium">Amount</th>
                  <th className="px-3 py-3 font-medium">Breakdown</th>
                  <th className="px-3 py-3 font-medium">NAV</th>
                  <th className="px-3 py-3 font-medium">Admin / note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-600/10">
                {transfers.map((transfer) => (
                  <tr key={transfer.id} className="align-top">
                    <td className="whitespace-nowrap px-3 py-4 text-ink-dim">
                      {formatDate(transfer.createdAt)}
                    </td>
                    <td className="px-3 py-4">
                      <Link
                        href={`/admin/investors/${transfer.fromUser.id}`}
                        className="text-ink transition-colors hover:text-gold-300"
                      >
                        {transfer.fromUser.fullName ?? transfer.fromUser.email}
                      </Link>
                      <p className="mt-1 text-xs text-ink-faint">{transfer.fromUser.email}</p>
                    </td>
                    <td className="px-3 py-4">
                      <Link
                        href={`/admin/investors/${transfer.toUser.id}`}
                        className="text-ink transition-colors hover:text-gold-300"
                      >
                        {transfer.toUser.fullName ?? transfer.toUser.email}
                      </Link>
                      <p className="mt-1 text-xs text-ink-faint">{transfer.toUser.email}</p>
                    </td>
                    <td className="currency-value whitespace-nowrap px-3 py-4 text-sm text-ink">
                      {formatUsdt(transfer.amount)} USD
                    </td>
                    <td className="px-3 py-4 text-ink-dim">
                      <p className="currency-value">{formatUsdt(transfer.queuedAmount)} USD queued</p>
                      <p className="currency-value mt-1">{formatUsdt(transfer.investedAmount)} USD invested</p>
                      {D(transfer.units).gt(0) && (
                        <p className="mt-1 font-mono text-xs text-ink-faint">
                          {formatUsdt(transfer.units, 6)} units
                        </p>
                      )}
                    </td>
                    <td className="currency-value whitespace-nowrap px-3 py-4 text-ink-dim">
                      {formatUsdt(transfer.navPrice)} USD
                    </td>
                    <td className="max-w-64 px-3 py-4 text-ink-dim">
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
              No internal transfers have been recorded.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}