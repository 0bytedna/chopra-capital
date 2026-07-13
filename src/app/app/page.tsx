import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine, LifeBuoy } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPortfolioMetrics, getPortfolioSeries } from "@/lib/portfolio";
import { toNumber, formatUsdt } from "@/lib/money";
import { mt5Access } from "@/lib/config";
import { Counter } from "@/components/ui/Counter";
import { PortfolioChart } from "@/components/app/PortfolioChart";
import { CompositionDonut } from "@/components/app/CompositionDonut";
import { Mt5AccessCard } from "@/components/app/Mt5AccessCard";
import { LedgerList } from "@/components/app/LedgerList";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Dashboard" };

const quickActions = [
  { href: "/app/deposit", label: "Deposit", desc: "Add USDT to your account", Icon: ArrowDownToLine },
  { href: "/app/withdraw", label: "Withdraw", desc: "Request a weekly payout", Icon: ArrowUpFromLine },
  { href: "/app/tickets", label: "Help", desc: "Open a support ticket", Icon: LifeBuoy },
];

export default async function DashboardPage() {
  const user = await requireUser();

  const [metrics, seriesData, recentLedger, firstEntry] = await Promise.all([
    getPortfolioMetrics(user.id),
    getPortfolioSeries(user.id),
    prisma.ledgerEntry.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.ledgerEntry.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ]);

  const currentValue = toNumber(metrics.currentValue);
  const bookedProfit = toNumber(metrics.bookedProfit);
  const firstActivityDate = (firstEntry?.createdAt ?? new Date()).toISOString().slice(0, 10);

  const tiles = [
    { label: "Total net deposits", value: toNumber(metrics.totalDeposits), signed: false },
    { label: "Net withdrawals", value: toNumber(metrics.netWithdrawals), signed: false },
    { label: "Net investment in pool", value: toNumber(metrics.netInvestedInPool), signed: false },
    { label: "Net booked profit", value: bookedProfit, signed: true },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Headline figure */}
      <section className="glass-card relative overflow-hidden rounded-2xl p-6 sm:p-8">
        <div className="absolute inset-0 -z-10 gold-aura" aria-hidden />
        <p className="eyebrow">Your funds</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-serif text-4xl tracking-tight text-ink sm:text-6xl">
              <Counter value={currentValue} decimals={2} />{" "}
              <span className="text-xl text-ink-faint sm:text-2xl">USDT</span>
            </p>
            <p className="mt-2 text-sm text-ink-dim">
              Current <em className="font-serif italic text-gold-400">value</em> — pool holdings at
              live NAV plus your queued balance.
            </p>
          </div>
          <div className="text-sm">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs",
                metrics.navLive
                  ? "border-positive/40 bg-positive/10 text-positive"
                  : "border-gold-500/30 bg-gold-600/8 text-ink-faint",
              )}
            >
              <span className={cn("size-1.5 rounded-full", metrics.navLive ? "bg-positive" : "bg-ink-faint")} aria-hidden />
              {metrics.navLive ? "Live MT5 NAV" : "Last settled NAV"}
            </span>
          </div>
        </div>
      </section>

      {/* Metric tiles */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Key figures">
        {tiles.map((t) => (
          <div key={t.label} className="glass-card rounded-xl p-4 sm:p-5">
            <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint sm:text-[11px]">{t.label}</p>
            <p
              className={cn(
                "mt-1.5 font-mono text-base sm:text-lg",
                t.signed ? (t.value >= 0 ? "text-positive" : "text-negative") : "text-ink",
              )}
            >
              {t.signed && t.value >= 0 ? "+" : ""}
              {formatUsdt(t.value)}
            </p>
          </div>
        ))}
      </section>

      {/* Chart */}
      <PortfolioChart
        initialSeries={seriesData.series}
        initialProfit={seriesData.profitInRange}
        firstActivityDate={firstActivityDate}
      />

      {/* Donut + MT5 access */}
      <section className="grid gap-6 *:min-w-0 lg:grid-cols-2">
        <CompositionDonut
          principal={toNumber(metrics.netInvestedInPool.add(metrics.queued))}
          profit={toNumber(metrics.unrealizedProfit)}
        />
        <Mt5AccessCard
          server={mt5Access.server}
          login={mt5Access.login}
          investorPassword={mt5Access.investorPassword}
          webTerminalUrl={mt5Access.webTerminalUrl}
        />
      </section>

      {/* Quick actions + recent activity */}
      <section className="grid gap-6 *:min-w-0 lg:grid-cols-[1fr_1.6fr]">
        <div className="space-y-3">
          {quickActions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="glass-card glass-card-hover flex items-center gap-4 rounded-xl p-4"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-gold-600/25 bg-gold-600/10">
                <a.Icon className="size-4.5 text-gold-400" aria-hidden />
              </span>
              <span>
                <span className="block font-serif text-base text-ink">{a.label}</span>
                <span className="block text-xs text-ink-faint">{a.desc}</span>
              </span>
            </Link>
          ))}
        </div>

        <div className="glass-card rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Ledger</p>
              <h2 className="mt-1.5 font-serif text-xl text-ink">Recent activity</h2>
            </div>
          </div>
          <div className="mt-2">
            <LedgerList entries={recentLedger} />
          </div>
        </div>
      </section>
    </div>
  );
}
