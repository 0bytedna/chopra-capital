import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentNav } from "@/lib/nav";
import { formatUsdt } from "@/lib/money";
import { cn } from "@/lib/cn";
import { PortfolioChart } from "@/components/app/PortfolioChart";
import { getPoolPortfolioSeries } from "@/lib/poolPortfolio";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  CircleAlert,
  Gift,
  Landmark,
  RefreshCcw,
  WalletCards,
} from "lucide-react";
import {
  calculateReferralCommissionPreview,
  getReferralCommissionRate,
} from "@/lib/referrals";
import {
  reportingDayEnd,
  reportingDayKey,
  reportingDayStart,
  reportingWeekStart,
} from "@/lib/reportingCalendar";

export const metadata: Metadata = { title: "Admin · Overview" };

export default async function AdminOverviewPage() {
  const today = reportingDayKey();
  const weekStart = reportingWeekStart(today);
  const commissionRate = await getReferralCommissionRate();
  const [
    poolNav,
    tradingProfitAgg,
    pendingKyc,
    openTickets,
    poolPortfolio,
    depositApproval,
    depositConversion,
    depositBroker,
    withdrawalApproval,
    withdrawalBroker,
    withdrawalPayout,
    depositExceptions,
    withdrawalExceptions,
    commissionPreview,
  ] = await Promise.all([
    getCurrentNav(),
    prisma.tradingAccountEntry.aggregate({
      where: { type: { in: ["TRADING_PROFIT", "TRADING_LOSS"] } },
      _sum: { amount: true },
    }),
    prisma.user.count({
      where: {
        role: "USER",
        kycStatus: "PENDING",
        isCompanyAccount: false,
      },
    }),
    prisma.ticket.count({ where: { status: "OPEN" } }),
    getPoolPortfolioSeries(),
    prisma.deposit.count({ where: { status: "PENDING" } }),
    prisma.deposit.count({ where: { status: "RECEIVED" } }),
    prisma.deposit.count({ where: { status: "QUEUED" } }),
    prisma.withdrawal.count({ where: { status: "REQUESTED" } }),
    prisma.withdrawal.count({ where: { status: "APPROVED" } }),
    prisma.withdrawal.count({
      where: {
        status: {
          in: ["BROKER_RECEIVED", "INR_READY", "PAYOUT_DETAILS_REVIEW"],
        },
      },
    }),
    prisma.deposit.count({ where: { status: "NEEDS_CORRECTION" } }),
    prisma.withdrawal.count({ where: { status: "PAYOUT_DETAILS_REQUIRED" } }),
    calculateReferralCommissionPreview({
      periodStart: weekStart,
      periodEnd: today,
      from: reportingDayStart(weekStart),
      to: reportingDayEnd(today),
      rate: commissionRate,
    }),
  ]);

  const tradingProfit = tradingProfitAgg._sum.amount ?? 0;
  const queues = [
    { href: "/admin/kyc", label: "KYCs", count: pendingKyc },
    { href: "/admin/tickets", label: "Tickets", count: openTickets },
  ];
  const poolSnapshot = [
    { label: "Balance", value: formatUsdt(poolNav.balance), suffix: "USD" },
    { label: "Profits", value: formatUsdt(tradingProfit), suffix: "USD" },
    { label: "Issued units", value: formatUsdt(poolNav.totalUnits, 6) },
    { label: "NAV / unit", value: formatUsdt(poolNav.nav) },
  ];
  const operationStages = [
    { href: "/admin/deposits", label: "Deposit approvals", count: depositApproval, Icon: ArrowDownToLine },
    { href: "/admin/deposits", label: "INR conversions", count: depositConversion, Icon: RefreshCcw },
    { href: "/admin/deposits", label: "Broker deposits", count: depositBroker, Icon: WalletCards },
    { href: "/admin/withdrawals", label: "Withdrawal approvals", count: withdrawalApproval, Icon: ArrowUpFromLine },
    { href: "/admin/withdrawals", label: "Broker withdrawals", count: withdrawalBroker, Icon: Landmark },
    { href: "/admin/withdrawals", label: "Payouts ready", count: withdrawalPayout, Icon: WalletCards },
    {
      href: `/admin/commissions?from=${weekStart}&to=${today}`,
      label: "Commission distributions",
      count: commissionPreview.filter(
        (row) => row.distributedAmount === null && row.suggestedCommission.gt(0),
      ).length,
      Icon: Gift,
    },
  ];
  const exceptions = [
    { href: "/admin/deposits", label: "Deposits needing correction", count: depositExceptions },
    { href: "/admin/withdrawals", label: "Payout details on hold", count: withdrawalExceptions },
  ].filter((item) => item.count > 0);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header>
        <p className="eyebrow">Operations</p>
        <h1 className="mt-2 font-serif text-3xl text-ink">
          Pool <em className="gold-text italic">overview</em>
        </h1>
      </header>

      <section
        className="grid auto-rows-fr grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
        aria-label="Pool snapshot"
      >
        {poolSnapshot.map((item) => (
          <div
            key={item.label}
            className="glass-card flex min-h-24 min-w-0 flex-col justify-center rounded-xl px-4 py-4 [container-type:inline-size] sm:min-h-28 sm:p-5"
          >
            <p className="text-[clamp(0.75rem,7cqi,0.9rem)] leading-tight uppercase tracking-[0.12em] text-ink-faint">
              {item.label}
            </p>
            <p
              className={cn(
                "currency-value mt-2 max-w-full whitespace-nowrap leading-none tracking-[-0.035em] text-ink",
                item.value.length > 10
                  ? "text-[clamp(0.95rem,9.5cqi,1.2rem)]"
                  : "text-[clamp(1.15rem,12cqi,1.65rem)]",
              )}
            >
              {item.value}
              {item.suffix && (
                <span className="ml-1 text-[0.7em] font-semibold tracking-normal text-ink-dim">
                  {item.suffix}
                </span>
              )}
            </p>
          </div>
        ))}
      </section>

      <section aria-labelledby="operations-strip-heading" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Active work</p>
            <h2 id="operations-strip-heading" className="mt-1 font-serif text-xl text-ink">
              Operations queue
            </h2>
          </div>
          <p className="text-xs text-ink-faint">Open a stage to continue processing</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {operationStages.map(({ href, label, count, Icon }) => (
            <Link key={label} href={href} className="glass-card glass-card-hover flex min-w-0 items-center gap-3 rounded-xl p-4">
              <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full border", count > 0 ? "border-gold-500 bg-gold-600 text-white" : "border-stone-200 bg-stone-100 text-ink-faint")}>
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">{label}</span>
                <span className="mt-0.5 block text-xs text-ink-faint">{count} waiting</span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-gold-600" aria-hidden />
            </Link>
          ))}
        </div>
      </section>

      {exceptions.length > 0 && (
        <section className="rounded-2xl border-2 border-rose-300 bg-rose-50 p-4" aria-labelledby="exceptions-heading">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white">
              <CircleAlert className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="eyebrow text-rose-700">Needs intervention</p>
              <h2 id="exceptions-heading" className="mt-1 font-serif text-xl text-rose-950">Resolve operational exceptions</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {exceptions.map((item) => (
                  <Link key={item.label} href={item.href} className="rounded-full border border-rose-300 bg-white px-3 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100">
                    {item.count} {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <section
        className="grid w-full grid-cols-2 gap-3 sm:gap-4"
        aria-label="KYC and support queues"
      >
        {queues.map((queue) => (
          <Link
            key={queue.href}
            href={queue.href}
            className="glass-card glass-card-hover flex min-h-32 flex-col items-center justify-center rounded-2xl p-4 text-center sm:min-h-36 sm:p-5 lg:min-h-32 lg:p-4"
          >
            <span
              className={cn(
                "flex size-16 shrink-0 items-center justify-center rounded-full border font-mono text-2xl font-semibold shadow-lg sm:size-20 sm:text-3xl lg:size-14 lg:text-2xl",
                queue.count > 0
                  ? "border-gold-600 bg-gold-600 text-white shadow-gold-600/20"
                  : "border-stone-200 bg-stone-100 text-ink-faint shadow-stone-200/40",
              )}
              aria-label={`${queue.count} pending`}
            >
              {queue.count}
            </span>
            <p className="mt-3 text-lg font-semibold leading-tight text-ink">
              {queue.label}
            </p>
          </Link>
        ))}
      </section>

      <PortfolioChart
        initialSeries={poolPortfolio.series}
        firstActivityDate={poolPortfolio.firstActivityDate}
        endpoint="/api/admin/portfolio"
        ariaLabel="Pool profit and balance graphs"
        balanceCaption="Includes verified deposits, withdrawals, trading results, fees and company share."
      />
    </div>
  );
}
