import type { Metadata } from "next";
import { CalendarClock } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withdrawalsOpenNow } from "@/lib/config";
import { getPortfolioMetrics } from "@/lib/portfolio";
import { toNumber, formatUsdt } from "@/lib/money";
import { WithdrawForm } from "./WithdrawForm";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Withdraw" };

const statusCls: Record<string, string> = {
  REQUESTED: "border-gold-500/40 bg-gold-600/10 text-gold-300",
  APPROVED: "border-gold-500/40 bg-gold-600/10 text-gold-300",
  PROCESSED: "border-positive/40 bg-positive/10 text-positive",
  REJECTED: "border-negative/40 bg-negative/10 text-negative",
};

export default async function WithdrawPage() {
  const user = await requireUser();
  const [metrics, withdrawals] = await Promise.all([
    getPortfolioMetrics(user.id),
    prisma.withdrawal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const open = withdrawalsOpenNow();
  const available = toNumber(metrics.currentValue);

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <header>
        <p className="eyebrow">Money out</p>
        <h1 className="mt-2 font-serif text-3xl text-ink">
          Withdraw <em className="gold-text italic">weekly</em>
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-dim">
          Request on Saturday, processed on Sunday at the prevailing NAV. There is no lock-in —
          your money is available every week. Capital at risk until withdrawn.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="glass-card rounded-xl p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-ink-faint">Available balance</p>
          <p className="mt-1.5 font-serif text-3xl text-ink">
            {formatUsdt(available)} <span className="text-base text-ink-faint">USDT</span>
          </p>
          <p className="mt-1 text-xs text-ink-faint">Pool holdings at current NAV + queued balance.</p>
        </div>
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-2">
            <CalendarClock className="size-4 text-gold-500" aria-hidden />
            <p className="text-[11px] uppercase tracking-[0.14em] text-ink-faint">Schedule</p>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-dim">
            Requests: <strong className="text-ink">Saturday</strong>
            <br />
            Processing: <strong className="text-ink">Sunday</strong>
          </p>
          <p className="mt-1 text-xs text-ink-faint">
            A network/processing fee may apply and is shown on your ledger as its own line.
          </p>
        </div>
      </section>

      <section className="glass-card rounded-2xl p-5 sm:p-7">
        <WithdrawForm open={open} available={available} />
      </section>

      <section>
        <p className="eyebrow">History</p>
        <h2 className="mt-2 font-serif text-xl text-ink">Your withdrawal requests</h2>
        {withdrawals.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-gold-600/20 px-4 py-8 text-center text-sm text-ink-faint">
            No withdrawal requests yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {withdrawals.map((w) => (
              <li key={w.id} className="glass-card flex items-center justify-between gap-3 rounded-xl px-4 py-3.5">
                <div className="min-w-0">
                  <p className="font-mono text-sm text-ink">
                    {formatUsdt(w.amount)} USDT
                    {w.paidAmount !== null && (
                      <span className="text-ink-faint"> · paid {formatUsdt(w.paidAmount)}</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-ink-faint">
                    {w.network} · week {w.weekKey}
                    {w.adminNote ? ` · ${w.adminNote}` : ""}
                  </p>
                </div>
                <span className={cn("shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium", statusCls[w.status])}>
                  {w.status.toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
