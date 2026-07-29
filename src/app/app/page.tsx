import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getPortfolioMetrics, getPortfolioSeries } from "@/lib/portfolio";
import { toNumber } from "@/lib/money";
import { getUserNotificationCenter } from "@/lib/userNotifications";
import { AccountMetricCards } from "@/components/app/AccountMetricCards";
import { PortfolioChart } from "@/components/app/PortfolioChart";
import { AttentionPanel } from "@/components/app/UserNotifications";
import { Mt5AccountDetails, type Mt5Detail } from "@/components/mt5/Mt5AccountDetails";
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
  const accountDetails: Mt5Detail[] = [
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
        <div className="border-b border-slate-200 px-4 py-3">
          <p className="eyebrow">Company trading account</p>
          <h2 id="trading-account-title" className="mt-0.5 font-serif text-lg text-ink">
            MT5 live account details
          </h2>
        </div>
        <Mt5AccountDetails details={accountDetails} />
      </section>
    </div>
  );
}