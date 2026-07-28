import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getPortfolioMetrics, getPortfolioSeries } from "@/lib/portfolio";
import { toNumber } from "@/lib/money";
import { getUserNotificationCenter } from "@/lib/userNotifications";
import { AccountMetricCards } from "@/components/app/AccountMetricCards";
import { PortfolioChart } from "@/components/app/PortfolioChart";
import { AttentionPanel } from "@/components/app/UserNotifications";
import { mt5InvestorAccount } from "@/lib/mt5";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const [metrics, performance, notifications] = await Promise.all([
    getPortfolioMetrics(user.id),
    getPortfolioSeries(user.id),
    getUserNotificationCenter(user.id),
  ]);
  const balance = metrics.units.mul(metrics.nav);
  const mt5 = mt5InvestorAccount();
  const accountDetails = [
    ["Broker Name", mt5.brokerName],
    ["Server", mt5.server],
    ["MT5 ID", mt5.accountId],
    ["Investor access", "ChopraCapital"],
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AttentionPanel center={notifications} />
      <AccountMetricCards
        initialBalance={toNumber(balance)}
        initialQueued={toNumber(metrics.queued)}
      />
      <PortfolioChart
        initialSeries={performance.series}
        firstActivityDate={performance.firstActivityDate}
      />
      <p className="rounded-xl border border-gold-600/15 bg-slate-50 px-4 py-3 text-xs leading-5 text-ink-faint">
        Balance is maintained by the operations team from verified deposits, withdrawals,
        trading results, fees and company profit-share entries. Every administrator change
        is recorded in the audit trail.
      </p>
      <section
        className="glass-card overflow-hidden rounded-2xl"
        aria-labelledby="trading-account-title"
      >
        <div className="border-b border-gold-600/15 px-5 py-4 sm:px-6">
          <p className="eyebrow">Company trading account</p>
          <h2 id="trading-account-title" className="mt-1 font-serif text-xl text-ink">
            MT5 live account details
          </h2>
          <p className="mt-1 text-xs text-ink-faint">
            Read-only investor access for reviewing the company account history.
          </p>
        </div>
        <dl className="grid sm:grid-cols-2">
          {accountDetails.map(([label, value], index) => (
            <div
              key={label}
              className={`px-5 py-4 sm:px-6 ${
                index < 2 ? "border-b border-gold-600/10" : ""
              } ${index % 2 === 0 ? "sm:border-r sm:border-gold-600/10" : ""}`}
            >
              <dt className="text-xs uppercase tracking-[.15em] text-ink-faint">{label}</dt>
              <dd className="mt-1 break-all font-mono text-sm text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}