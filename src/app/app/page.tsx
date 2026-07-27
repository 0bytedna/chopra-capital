import type { Metadata } from "next";
import { Activity, Clock3, Scale, WalletCards } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getPortfolioMetrics, getPortfolioSeries } from "@/lib/portfolio";
import { D, ZERO, formatSignedUsdt, formatUsdt, type Dec } from "@/lib/money";
import { getCurrentNav } from "@/lib/nav";
import { PortfolioChart } from "@/components/app/PortfolioChart";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Dashboard" };
type MetricCardProps = { label: string; value: Dec; signed?: boolean; Icon: typeof Activity };
function MetricCard({ label, value, signed = false, Icon }: MetricCardProps) { const valueTone = signed ? value.gt(0) ? "text-positive" : value.lt(0) ? "text-negative" : "text-ink" : "text-ink"; return <article className="glass-card rounded-xl p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><p className="text-[11px] uppercase tracking-[0.14em] text-ink-faint">{label}</p><span className="flex size-9 items-center justify-center rounded-full border border-gold-600/25 bg-gold-600/10"><Icon className="size-4 text-gold-400"/></span></div><p className={cn("mt-3 font-mono text-2xl sm:text-3xl", valueTone)}>{signed ? formatSignedUsdt(value) : formatUsdt(value)}<span className="ml-1.5 text-xs text-ink-faint">USD</span></p></article>; }

export default async function DashboardPage() {
  const user = await requireUser();
  const [metrics, pool, performance] = await Promise.all([getPortfolioMetrics(user.id), getCurrentNav(), getPortfolioSeries(user.id)]);
  const investorShare = pool.totalUnits.gt(0) ? metrics.units.div(pool.totalUnits) : ZERO;
  const balance = pool.balance.mul(investorShare);
  const equity = pool.equity.mul(investorShare);
  const floating = equity.sub(balance);
  const cards: MetricCardProps[] = [
    { label: "Floating P/L", value: floating, signed: true, Icon: Activity },
    { label: "Equity", value: equity, Icon: Scale },
    { label: "Balance", value: balance, Icon: WalletCards },
    { label: "In queue", value: D(metrics.queued), Icon: Clock3 },
  ];
  return <div className="mx-auto max-w-5xl space-y-6"><section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Account figures">{cards.map((card) => <MetricCard key={card.label} {...card}/>)}</section><PortfolioChart initialSeries={performance.series} firstActivityDate={performance.firstActivityDate}/><p className="rounded-xl border border-gold-600/15 bg-black/10 px-4 py-3 text-xs leading-5 text-ink-faint">Balance and equity are maintained by the operations team from verified deposits, withdrawals, trading results, fees and profit-share settlements. Every administrator change is recorded in the audit trail.</p></div>;
}