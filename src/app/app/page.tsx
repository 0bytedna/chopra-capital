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
import { prisma } from "@/lib/prisma";
import { ChevronDown } from "lucide-react";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const [metrics, performance, notifications, commissionWallet] = await Promise.all([
    getPortfolioMetrics(user.id),
    getPortfolioSeries(user.id),
    getUserNotificationCenter(user.id),
    prisma.commissionWallet.findUnique({ where: { userId: user.id } }),
  ]);
  const balance = metrics.units.mul(metrics.nav);
  const totalProfit = metrics.bookedProfit.add(metrics.unrealizedProfit);
  const latestPoint = performance.series.at(-1);
  const previousPoint = performance.series.at(-2) ?? latestPoint;
  const profitTrend =
    Number(latestPoint?.profit ?? 0) - Number(previousPoint?.profit ?? 0);
  const balanceTrend =
    Number(latestPoint?.value ?? 0) - Number(previousPoint?.value ?? 0);
  const mt5 = mt5InvestorAccount();
  const accountDetails: Mt5Detail[] = [
    ["Broker Name", mt5.brokerName],
    ["Server", mt5.server],
    ["MT5 ID", mt5.accountId],
    ["Investor access", "ChopraCapital@1"],
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <AttentionPanel center={notifications} />
      <AccountMetricCards
        initialProfit={toNumber(totalProfit)}
        initialBalance={toNumber(balance)}
        initialDeposits={toNumber(metrics.totalDeposits)}
        initialWithdrawals={toNumber(metrics.netWithdrawals)}
        initialQueued={toNumber(metrics.queued)}
        initialPendingInr={toNumber(metrics.pendingInr)}
        initialCommission={toNumber(commissionWallet?.balance)}
        initialProfitTrend={profitTrend}
        initialBalanceTrend={balanceTrend}
      />
      <PortfolioChart
        initialSeries={performance.series}
        firstActivityDate={performance.firstActivityDate}
      />
      <p className="rounded-xl border border-gold-600/15 bg-stone-50 px-4 py-3 text-xs leading-5 text-ink-faint">
        Balance is maintained by the operations team from verified deposits, withdrawals,
        trading results, fees and company profit-share entries. Every administrator change
        is recorded in the audit trail.
      </p>
      <details className="group glass-card overflow-hidden rounded-2xl">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 select-none [&::-webkit-details-marker]:hidden">
          <div>
            <p className="eyebrow">Company trading account</p>
            <h2 className="mt-1 font-serif text-lg text-ink">MT5 live account details</h2>
          </div>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-gold-600/20 bg-white text-gold-600">
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
            <span className="sr-only">Expand or collapse MT5 account details</span>
          </span>
        </summary>
        <div className="border-t border-stone-200">
          <Mt5AccountDetails details={accountDetails} />
        </div>
      </details>
    </div>
  );
}
