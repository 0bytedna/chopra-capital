import type { Metadata } from "next";
import { Clock3, WalletCards } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getPortfolioMetrics, getPortfolioSeries } from "@/lib/portfolio";
import { D, ZERO, formatUsdt, type Dec } from "@/lib/money";
import { getCurrentNav } from "@/lib/nav";
import { PortfolioChart } from "@/components/app/PortfolioChart";

export const metadata: Metadata = { title: "Dashboard" };
type MetricCardProps = { label: string; value: Dec; Icon: typeof WalletCards };
function MetricCard({ label, value, Icon }: MetricCardProps) { return <article className="glass-card rounded-xl p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><p className="text-xs uppercase tracking-[0.14em] text-ink-faint">{label}</p><span className="flex size-9 items-center justify-center rounded-full border border-gold-600/25 bg-gold-600/10"><Icon className="size-4 text-gold-400"/></span></div><p className="mt-3 font-mono text-2xl text-ink sm:text-3xl">{formatUsdt(value)}<span className="ml-1.5 text-xs text-ink-faint">USD</span></p></article>; }

export default async function DashboardPage() {
  const user = await requireUser();
  const [metrics, pool, performance] = await Promise.all([getPortfolioMetrics(user.id), getCurrentNav(), getPortfolioSeries(user.id)]);
  const investorShare = pool.totalUnits.gt(0) ? metrics.units.div(pool.totalUnits) : ZERO;
  const balance = pool.balance.mul(investorShare);
  const cards: MetricCardProps[] = [
    { label: "Balance", value: balance, Icon: WalletCards },
    { label: "In queue", value: D(metrics.queued), Icon: Clock3 },
  ];
  const accountDetails = [
    ["Broker Name", "NewEra Capital"],
    ["Server", "NeweraCapitalMarkets-Live"],
    ["MT5 ID", "250129"],
    ["Investor Password", "Contact administration for read-only access"],
  ];
  return <div className="mx-auto max-w-5xl space-y-6"><section className="grid gap-4 sm:grid-cols-2" aria-label="Account figures">{cards.map((card) => <MetricCard key={card.label} {...card}/>)}</section><PortfolioChart initialSeries={performance.series} firstActivityDate={performance.firstActivityDate}/><p className="rounded-xl border border-gold-600/15 bg-slate-50 px-4 py-3 text-xs leading-5 text-ink-faint">Balance is maintained by the operations team from verified deposits, withdrawals, trading results, fees and company profit-share entries. Every administrator change is recorded in the audit trail.</p><section className="glass-card overflow-hidden rounded-2xl" aria-labelledby="trading-account-title"><div className="border-b border-gold-600/15 px-5 py-4 sm:px-6"><p className="eyebrow">Company trading account</p><h2 id="trading-account-title" className="mt-1 font-serif text-xl text-ink">MT5 live account details</h2><p className="mt-1 text-xs text-ink-faint">Read-only investor access for reviewing the company account history.</p></div><dl className="grid sm:grid-cols-2">{accountDetails.map(([label, value], index) => <div key={label} className={`px-5 py-4 sm:px-6 ${index < 2 ? "border-b border-gold-600/10" : ""} ${index % 2 === 0 ? "sm:border-r sm:border-gold-600/10" : ""}`}><dt className="text-xs uppercase tracking-[.15em] text-ink-faint">{label}</dt><dd className="mt-1 break-all font-mono text-sm text-ink">{value}</dd></div>)}</dl></section></div>;
}