import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine, BadgeCheck, LifeBuoy } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentNav } from "@/lib/nav";
import { D, toNumber, formatUsdt } from "@/lib/money";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Admin · Overview" };

export default async function AdminOverviewPage() {
  const [poolNav, walletAgg, pendingDeposits, activeWithdrawals, pendingKyc, openTickets] =
    await Promise.all([
      getCurrentNav(),
      prisma.wallet.aggregate({ _sum: { units: true, queued: true } }),
      prisma.deposit.count({ where: { status: { in: ["PENDING", "NEEDS_CORRECTION", "RECEIVED", "QUEUED"] } } }),
      prisma.withdrawal.count({
        where: { status: { in: ["REQUESTED", "APPROVED", "BROKER_RECEIVED", "INR_READY"] } },
      }),
      prisma.user.count({ where: { kycStatus: "PENDING" } }),
      prisma.ticket.count({ where: { status: "OPEN" } }),
    ]);

  const investorUnits = D(walletAgg._sum.units ?? 0);
  const queuedTotal = toNumber(walletAgg._sum.queued ?? 0);
  const unitsDrift = toNumber(D(poolNav.totalUnits).sub(investorUnits));
  const poolValueAtNav = toNumber(poolNav.totalUnits.mul(poolNav.nav));
  const equity = toNumber(poolNav.equity);
  const equityGap = equity - poolValueAtNav;

  const queues = [
    { href: "/admin/deposits", label: "Deposit work queue", count: pendingDeposits, Icon: ArrowDownToLine },
    { href: "/admin/withdrawals", label: "Withdrawals to review", count: activeWithdrawals, Icon: ArrowUpFromLine },
    { href: "/admin/kyc", label: "KYC in review", count: pendingKyc, Icon: BadgeCheck },
    { href: "/admin/tickets", label: "Open tickets", count: openTickets, Icon: LifeBuoy },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <p className="eyebrow">Operations</p>
        <h1 className="mt-2 font-serif text-3xl text-ink">
          Pool <em className="gold-text italic">overview</em>
        </h1>
      </header>

      {/* Pool snapshot */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Pool snapshot">
        {[
          { label: "MT5 equity", value: `${formatUsdt(equity)}`, hint: poolNav.live ? "live feed" : "no live feed yet" },
          { label: "Total units", value: formatUsdt(poolNav.totalUnits, 4), hint: "pool units issued" },
          { label: "NAV / unit", value: formatUsdt(poolNav.nav, 6), hint: poolNav.live ? "equity ÷ units" : "last settled" },
          { label: "Company wallet queue", value: formatUsdt(queuedTotal), hint: "awaiting weekend broker transfer" },
        ].map((t) => (
          <div key={t.label} className="glass-card rounded-xl p-4 sm:p-5">
            <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint sm:text-[11px]">{t.label}</p>
            <p className="mt-1.5 font-mono text-base text-ink sm:text-lg">{t.value}</p>
            <p className="mt-0.5 text-[11px] text-ink-faint">{t.hint}</p>
          </div>
        ))}
      </section>

      {/* Reconciliation */}
      <section className="glass-card rounded-2xl p-5 sm:p-6">
        <p className="eyebrow">Reconciliation</p>
        <h2 className="mt-1.5 font-serif text-xl text-ink">Do the books balance?</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-vault-950/60 p-4">
            <p className="text-xs text-ink-faint">Investor units vs pool units</p>
            <p className={cn("mt-1 font-mono text-sm", Math.abs(unitsDrift) < 0.0001 ? "text-positive" : "text-negative")}>
              drift {unitsDrift.toFixed(6)} units
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">
              Sum of all wallet units should equal PoolState.totalUnits exactly.
            </p>
          </div>
          <div className="rounded-xl bg-vault-950/60 p-4">
            <p className="text-xs text-ink-faint">MT5 equity vs pool value at NAV</p>
            <p className={cn("mt-1 font-mono text-sm", Math.abs(equityGap) < 1 ? "text-positive" : "text-gold-300")}>
              gap {equityGap.toFixed(2)} USDT
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">
              A persistent gap means broker cash and issued units are out of sync — fix before the
              next weekend transfer.
            </p>
          </div>
        </div>
      </section>

      {/* Work queues */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Work queues">
        {queues.map((q) => (
          <Link key={q.href} href={q.href} className="glass-card glass-card-hover rounded-xl p-5">
            <div className="flex items-center justify-between">
              <q.Icon className="size-4 text-gold-500" aria-hidden />
              <span
                className={cn(
                  "rounded-full border px-2.5 py-0.5 font-mono text-sm",
                  q.count > 0 ? "border-gold-500/40 bg-gold-600/10 text-gold-300" : "border-ink/10 text-ink-faint",
                )}
              >
                {q.count}
              </span>
            </div>
            <p className="mt-3 text-sm text-ink">{q.label}</p>
          </Link>
        ))}
      </section>

    </div>
  );
}
