import type { Metadata } from "next";
import { Activity, Clock3, Scale, WalletCards } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPortfolioMetrics, getPortfolioSeries } from "@/lib/portfolio";
import { D, ZERO, formatSignedUsdt, formatUsdt, type Dec } from "@/lib/money";
import { mt5Access } from "@/lib/config";
import { Mt5AccessCard } from "@/components/app/Mt5AccessCard";
import { PortfolioChart } from "@/components/app/PortfolioChart";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Dashboard" };

type MetricCardProps = {
  label: string;
  value: Dec | null;
  signed?: boolean;
  Icon: typeof Activity;
};

function MetricCard({ label, value, signed = false, Icon }: MetricCardProps) {
  const numericValue = value?.toNumber() ?? 0;
  const valueTone = signed
    ? numericValue > 0
      ? "text-positive"
      : numericValue < 0
        ? "text-negative"
        : "text-ink"
    : "text-ink";

  return (
    <article className="glass-card rounded-xl p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.14em] text-ink-faint">{label}</p>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-gold-600/25 bg-gold-600/10">
          <Icon className="size-4 text-gold-400" aria-hidden />
        </span>
      </div>
      <p className={cn("mt-3 font-mono text-2xl sm:text-3xl", valueTone)}>
        {value === null ? "—" : signed ? formatSignedUsdt(value) : formatUsdt(value)}
        {value !== null && <span className="ml-1.5 text-xs text-ink-faint">USD</span>}
      </p>
    </article>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();

  const [metrics, account, pool, performance] = await Promise.all([
    getPortfolioMetrics(user.id),
    prisma.mt5Account.findFirst({ orderBy: { updatedAt: "desc" } }),
    prisma.poolState.findUnique({ where: { id: "pool" } }),
    getPortfolioSeries(user.id),
  ]);

  const totalUnits = D(pool?.totalUnits ?? 0);
  const investorShare = totalUnits.gt(0) ? metrics.units.div(totalUnits) : ZERO;
  const investorBalance = account ? D(account.balance).mul(investorShare) : null;
  const investorEquity = account ? D(account.equity).mul(investorShare) : null;
  // Until the bridge sends a dedicated floating P/L field, MT5 equity - balance
  // is the honest account-level approximation. The same pool share is applied.
  const investorFloatingProfit = account
    ? D(account.equity).sub(D(account.balance)).mul(investorShare)
    : null;
  const cards: MetricCardProps[] = [
    {
      label: "Floating P/L",
      value: investorFloatingProfit,
      signed: true,
      Icon: Activity,
    },
    {
      label: "Equity",
      value: investorEquity,
      Icon: Scale,
    },
    {
      label: "Balance",
      value: investorBalance,
      Icon: WalletCards,
    },
    {
      label: "In queue",
      value: metrics.queued,
      Icon: Clock3,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Live account figures">
        {cards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </section>

      <PortfolioChart
        initialSeries={performance.series}
        firstActivityDate={performance.firstActivityDate}
      />

      <Mt5AccessCard
        server={mt5Access.server}
        login={mt5Access.login}
        investorPassword={mt5Access.investorPassword}
        webTerminalUrl={mt5Access.webTerminalUrl}
      />
    </div>
  );
}
