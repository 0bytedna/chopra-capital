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
        {[
          { label: "Balance", value: `${formatUsdt(poolNav.balance)} USD` },
          { label: "Profits", value: `${formatUsdt(tradingProfit)} USD` },
          {
            label: "Issued units",
            value: formatUsdt(poolNav.totalUnits, 6),
          },
          { label: "NAV / unit", value: formatUsdt(poolNav.nav) },
        ].map((item) => (
          <div
            key={item.label}
            className="glass-card flex h-28 flex-col justify-center rounded-xl p-4 sm:h-32 sm:p-5"
          >
            <p className="text-xs uppercase tracking-[0.14em] text-ink-faint">
              {item.label}
            </p>
            <p className="currency-value mt-2 break-words text-lg text-ink sm:text-xl">
              {item.value}
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
            className="glass-card glass-card-hover flex aspect-square flex-col items-center justify-center rounded-2xl p-4 text-center sm:p-6 lg:aspect-auto lg:min-h-32 lg:p-4"
          >
            <span
              className={cn(
                "flex size-16 shrink-0 items-center justify-center rounded-full border font-mono text-2xl font-semibold shadow-lg sm:size-20 sm:text-3xl lg:size-14 lg:text-2xl",
                queue.count > 0
                  ? "border-gold-600 bg-gold-600 text-white shadow-gold-600/20"
                  : "border-slate-200 bg-slate-100 text-ink-faint shadow-slate-200/40",
              )}
              aria-label={`${queue.count} pending`}
            >
              {queue.count}
            </span>
            <p className="mt-4 text-base font-semibold leading-tight text-ink sm:text-lg lg:mt-3">
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
