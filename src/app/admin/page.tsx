import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentNav } from "@/lib/nav";
import { formatUsdt } from "@/lib/money";
import { cn } from "@/lib/cn";
import { PortfolioChart } from "@/components/app/PortfolioChart";
import { getPoolPortfolioSeries } from "@/lib/poolPortfolio";

export const metadata: Metadata = { title: "Admin · Overview" };

export default async function AdminOverviewPage() {
  const [
    poolNav,
    tradingProfitAgg,
    pendingDeposits,
    activeWithdrawals,
    pendingKyc,
    openTickets,
    poolPortfolio,
  ] = await Promise.all([
    getCurrentNav(),
    prisma.tradingAccountEntry.aggregate({
      where: { type: { in: ["TRADING_PROFIT", "TRADING_LOSS"] } },
      _sum: { amount: true },
    }),
    prisma.deposit.count({
      where: {
        status: {
          in: ["PENDING", "NEEDS_CORRECTION", "RECEIVED", "QUEUED"],
        },
      },
    }),
    prisma.withdrawal.count({
      where: {
        status: {
          in: [
            "REQUESTED",
            "APPROVED",
            "BROKER_RECEIVED",
            "INR_READY",
            "PAYOUT_DETAILS_REQUIRED",
            "PAYOUT_DETAILS_REVIEW",
          ],
        },
      },
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
  ]);

  const tradingProfit = tradingProfitAgg._sum.amount ?? 0;
  const queues = [
    { href: "/admin/deposits", label: "Deposits", count: pendingDeposits },
    { href: "/admin/withdrawals", label: "Withdrawals", count: activeWithdrawals },
    { href: "/admin/kyc", label: "KYCs", count: pendingKyc },
    { href: "/admin/tickets", label: "Tickets", count: openTickets },
  ];
  const poolSnapshot = [
    { label: "Balance", value: formatUsdt(poolNav.balance), suffix: "USD" },
    { label: "Profits", value: formatUsdt(tradingProfit), suffix: "USD" },
    { label: "Issued units", value: formatUsdt(poolNav.totalUnits, 6) },
    { label: "NAV / unit", value: formatUsdt(poolNav.nav) },
  ];

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

      <section
        className="mx-auto grid w-full max-w-xl grid-cols-2 gap-3 sm:gap-4 lg:max-w-none lg:grid-cols-4"
        aria-label="Pending administration tasks"
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
