import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getCurrentNav } from "@/lib/nav";
import { D, toNumber, formatUsdt } from "@/lib/money";
import { cn } from "@/lib/cn";
import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { TradingAdjustmentFields } from "@/components/admin/TradingAdjustmentFields";
import { TradingEntryActions } from "@/components/admin/TradingEntryActions";
import {
  EDITABLE_TRADING_TYPES,
  type EditableTradingAdjustmentType,
} from "@/lib/tradingAccount";
import { adminRecordTradingAdjustment } from "../actions";

export const metadata: Metadata = { title: "Admin · Trading" };

const reasonLabels: Record<string, string> = {
  TRADING_PROFIT: "Trading profit",
  TRADING_LOSS: "Trading loss",
  SERVER_FEE: "Server or operating fee",
  ADMIN_SHARE: "Company's profit share",
  OTHER_INCREASE: "Other increase",
  OTHER_DECREASE: "Other decrease",
  MANUAL_SNAPSHOT: "Manual balance snapshot",
  USER_DEPOSIT: "Verified deposit batch",
  USER_WITHDRAWAL: "Verified withdrawal batch",
};

const editableTradingTypes = new Set<string>(EDITABLE_TRADING_TYPES);

export default async function AdminTradingPage() {
  const [poolNav, walletAgg, entries] = await Promise.all([
    getCurrentNav(),
    prisma.wallet.aggregate({ _sum: { units: true } }),
    prisma.tradingAccountEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: {
        admin: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    }),
  ]);

  const investorUnits = D(walletAgg._sum.units ?? 0);
  const unitsDrift = toNumber(D(poolNav.totalUnits).sub(investorUnits));

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header>
        <p className="eyebrow">Trading</p>
        <h1 className="mt-2 font-serif text-3xl text-ink">
          Profit, loss & <em className="gold-text italic">movements</em>
        </h1>
      </header>

      <section aria-labelledby="balance-change-heading">
        <AdminActionForm
          action={adminRecordTradingAdjustment}
          submitLabel="Record adjustment"
          pendingLabel="Recording…"
          className="glass-card rounded-2xl p-5 sm:p-6"
          confirmMessage="Apply this adjustment to the balance?"
        >
          <h2
            id="balance-change-heading"
            className="font-serif text-xl text-ink"
          >
            Record a balance change
          </h2>
          <TradingAdjustmentFields key={poolNav.balance.toString()} currentBalance={toNumber(poolNav.balance)} />
          <label className="mt-3 block space-y-1.5 text-xs text-ink-faint">
            Audit note
            <input
              name="note"
              maxLength={240}
              required
              placeholder="Trading session, invoice, or another supporting reference"
              className="h-10 w-full rounded-lg border border-gold-600/20 bg-vault-950/65 px-3 text-sm text-ink"
            />
          </label>
        </AdminActionForm>
      </section>

      <section className="glass-card overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="eyebrow">Audit trail</p>
            <h2 className="mt-1 font-serif text-xl text-ink">
              Recent account changes
            </h2>
          </div>
          <span
            className={cn(
              "shrink-0 font-mono text-xs",
              Math.abs(unitsDrift) < 0.0001
                ? "text-positive"
                : "text-negative",
            )}
          >
            unit drift {unitsDrift.toFixed(6)}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="border-y border-gold-600/15 bg-stone-50 text-ink-faint">
              <tr>
                <th className="px-5 py-3">Time</th>
                <th className="px-5 py-3">Reason</th>
                <th className="px-5 py-3">Change</th>
                <th className="px-5 py-3">Balance after</th>
                <th className="px-5 py-3">Note</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold-600/10">
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-5 py-3 text-ink-faint">
                    {entry.createdAt.toLocaleString("en-IN")}
                  </td>
                  <td className="px-5 py-3 text-ink">
                    {reasonLabels[entry.type]}
                  </td>
                  <td
                    className={cn(
                      "currency-value px-5 py-3",
                      D(entry.amount).gte(0)
                        ? "text-positive"
                        : "text-negative",
                    )}
                  >
                    {D(entry.amount).gte(0) ? "+" : ""}
                    {formatUsdt(entry.amount)} USD
                  </td>
                  <td className="currency-value px-5 py-3 text-ink">
                    {formatUsdt(entry.balanceAfter)}
                  </td>
                  <td className="max-w-xs px-5 py-3 text-ink-dim">
                    {entry.note}
                  </td>
                  <td className="px-5 py-3">
                    {editableTradingTypes.has(entry.type) &&
                    !entry.note.startsWith("Investor correction:") ? (
                      <TradingEntryActions
                        id={entry.id}
                        type={entry.type as EditableTradingAdjustmentType}
                        amount={D(entry.amount).abs().toString()}
                        note={entry.note}
                      />
                    ) : (
                      <span className="text-[11px] text-ink-faint">Protected</span>
                    )}
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-ink-faint"
                  >
                    No account changes yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
