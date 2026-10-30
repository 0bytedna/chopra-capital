import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentNav } from "@/lib/nav";
import { formatUsdt } from "@/lib/money";
import { cn } from "@/lib/cn";
import { PortfolioChart } from "@/components/app/PortfolioChart";
import { getPoolPortfolioSeries } from "@/lib/poolPortfolio";
import { CircleDollarSign, Gauge, Layers3, WalletCards } from "lucide-react";

export const metadata: Metadata = { title: "Admin · Overview" };

export default async function AdminOverviewPage() {
  const [
    poolNav,
    tradingProfitAgg,
    pendingDeposits,
    pendingWithdrawals,
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
      where: { status: { in: ["PENDING", "RECEIVED", "QUEUED"] } },
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
    { href: "/admin/withdrawals", label: "Withdrawals", count: pendingWithdrawals },
    { href: "/admin/kyc", label: "KYCs", count: pendingKyc },
    { href: "/admin/tickets", label: "Tickets", count: openTickets },
  ];
  const poolSnapshot = [
    { label: "Balance", value: formatUsdt(poolNav.balance), suffix: "USD", Icon: WalletCards },
    { label: "Profits", value: formatUsdt(tradingProfit), suffix: "USD", Icon: CircleDollarSign, positive: Number(tradingProfit) > 0 },
    { label: "Issued units", value: formatUsdt(poolNav.totalUnits, 6), Icon: Layers3 },
    { label: "NAV / unit", value: formatUsdt(poolNav.nav), Icon: Gauge },
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
        className="grid auto-rows-fr grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4"
        aria-label="Pool snapshot"
      >
        {poolSnapshot.map((item) => (
          <div
            key={item.label}
            className="glass-card h-full min-w-0 rounded-xl px-4 py-3 [container-type:inline-size] sm:min-h-28 sm:p-4 xl:min-h-32 xl:p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 text-[clamp(0.68rem,7.5cqi,0.8125rem)] leading-tight uppercase tracking-[0.12em] text-ink-faint">{item.label}</p>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-gold-600/25 bg-white">
                <item.Icon className="size-4 text-gold-700" aria-hidden />
              </span>
            </div>
            <p
              className={cn(
                "currency-value mt-2 max-w-full whitespace-nowrap leading-tight tracking-[-0.035em]",
                item.positive ? "text-positive" : "text-ink",
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
        className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4"
        aria-label="Administration queues"
      >
        {queues.map((queue) => (
          <Link
            key={queue.href}
            href={queue.href}
            className="glass-card glass-card-hover flex min-h-20 flex-row items-center gap-4 rounded-xl px-4 py-3 text-left sm:min-h-36 sm:flex-col sm:justify-center sm:gap-0 sm:rounded-2xl sm:p-5 sm:text-center lg:min-h-32 lg:p-4"
          >
            <span
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-full border font-mono text-xl font-semibold shadow-lg sm:size-20 sm:text-3xl lg:size-14 lg:text-2xl",
                queue.count > 0
                  ? "border-gold-600 bg-gold-600 text-white shadow-gold-600/20"
                  : "border-stone-200 bg-stone-100 text-ink-faint shadow-stone-200/40",
              )}
              aria-label={`${queue.count} pending`}
            >
              {queue.count}
            </span>
            <p className="text-base font-semibold leading-tight text-ink sm:mt-3 sm:text-lg">
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
