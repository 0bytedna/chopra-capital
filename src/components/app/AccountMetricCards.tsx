"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CircleDollarSign,
  Clock3,
  WalletCards,
  Gift,
  type LucideIcon,
} from "lucide-react";

type AccountMetrics = {
  profit: number;
  balance: number;
  deposits: number;
  withdrawals: number;
  queuedUsd: number;
  pendingInr: number;
  commission: number;
};

type PortfolioResponse = {
  metrics?: {
    inPool?: number;
    totalDeposits?: number;
    netWithdrawals?: number;
    bookedProfit?: number;
    unrealizedProfit?: number;
    queued?: number;
    pendingInr?: number;
    commission?: number;
  };
};

function formattedUsd(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formattedInr(value: number): string {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function signedUsd(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formattedUsd(Math.abs(value))}`;
}

function MetricSummary({
  label,
  children,
  Icon,
}: {
  label: string;
  children: ReactNode;
  Icon: LucideIcon;
}) {
  return (
    <article className="glass-card min-w-0 rounded-xl p-3 [container-type:inline-size] sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 text-[clamp(0.68rem,7.5cqi,0.8125rem)] leading-tight uppercase tracking-[0.12em] text-ink-faint">{label}</p>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-gold-600/25 bg-gold-600/10">
          <Icon className="size-4 text-gold-400" aria-hidden />
        </span>
      </div>
      {children}
    </article>
  );
}

export function AccountMetricCards({
  initialProfit,
  initialBalance,
  initialDeposits,
  initialWithdrawals,
  initialQueued,
  initialPendingInr,
  initialCommission,
}: {
  initialProfit: number;
  initialBalance: number;
  initialDeposits: number;
  initialWithdrawals: number;
  initialQueued: number;
  initialPendingInr: number;
  initialCommission: number;
}) {
  const [metrics, setMetrics] = useState<AccountMetrics>({
    profit: initialProfit,
    balance: initialBalance,
    deposits: initialDeposits,
    withdrawals: initialWithdrawals,
    queuedUsd: initialQueued,
    pendingInr: initialPendingInr,
    commission: initialCommission,
  });

  useEffect(() => {
    let active = true;

    async function refresh() {
      try {
        const response = await fetch("/api/portfolio", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as PortfolioResponse;
        const balance = payload.metrics?.inPool;
        const deposits = payload.metrics?.totalDeposits;
        const withdrawals = payload.metrics?.netWithdrawals;
        const bookedProfit = payload.metrics?.bookedProfit;
        const unrealizedProfit = payload.metrics?.unrealizedProfit;
        const queuedUsd = payload.metrics?.queued;
        const pendingInr = payload.metrics?.pendingInr;
        const commission = payload.metrics?.commission;
        if (
          !active ||
          !Number.isFinite(balance) ||
          !Number.isFinite(deposits) ||
          !Number.isFinite(withdrawals) ||
          !Number.isFinite(bookedProfit) ||
          !Number.isFinite(unrealizedProfit) ||
          !Number.isFinite(queuedUsd) ||
          !Number.isFinite(pendingInr)
          || !Number.isFinite(commission)
        ) return;
        setMetrics({
          profit: Number(bookedProfit) + Number(unrealizedProfit),
          balance: Number(balance),
          deposits: Number(deposits),
          withdrawals: Number(withdrawals),
          queuedUsd: Number(queuedUsd),
          pendingInr: Number(pendingInr),
          commission: Number(commission),
        });
      } catch {
        // Preserve the last valid figures during a temporary network failure.
      }
    }

    void refresh();
    const interval = window.setInterval(() => void refresh(), 15_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <section
      className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6"
      aria-label="Account figures"
    >
      <MetricSummary label="Profits" Icon={CircleDollarSign}>
        <p
          className={`currency-value mt-2 max-w-full whitespace-nowrap text-[clamp(0.72rem,9.5cqi,1.35rem)] leading-tight tracking-[-0.035em] ${
            metrics.profit > 0
              ? "text-positive"
              : metrics.profit < 0
                ? "text-negative"
                : "text-ink"
          }`}
          aria-live="polite"
        >
          {signedUsd(metrics.profit)}
          <span className="ml-1 text-[0.65rem] text-ink-faint sm:text-xs">USD</span>
        </p>
      </MetricSummary>
      <MetricSummary label="Balance" Icon={WalletCards}>
        <p
          className="currency-value mt-2 max-w-full whitespace-nowrap text-[clamp(0.72rem,9.5cqi,1.5rem)] leading-tight tracking-[-0.035em] text-ink"
          aria-live="polite"
        >
          {formattedUsd(metrics.balance)}
          <span className="ml-1 text-[0.65rem] text-ink-faint sm:text-xs">USD</span>
        </p>
      </MetricSummary>
      <MetricSummary label="Deposits" Icon={ArrowDownToLine}>
        <p
          className="currency-value mt-2 max-w-full whitespace-nowrap text-[clamp(0.72rem,9.5cqi,1.35rem)] leading-tight tracking-[-0.035em] text-ink"
          aria-live="polite"
        >
          {formattedUsd(metrics.deposits)}
          <span className="ml-1 text-[0.65rem] text-ink-faint sm:text-xs">USD</span>
        </p>
      </MetricSummary>
      <MetricSummary label="Withdrawals" Icon={ArrowUpFromLine}>
        <p
          className="currency-value mt-2 max-w-full whitespace-nowrap text-[clamp(0.72rem,9.5cqi,1.35rem)] leading-tight tracking-[-0.035em] text-ink"
          aria-live="polite"
        >
          {formattedUsd(metrics.withdrawals)}
          <span className="ml-1 text-[0.65rem] text-ink-faint sm:text-xs">USD</span>
        </p>
      </MetricSummary>
      <MetricSummary label="Commission" Icon={Gift}>
        <p
          className="currency-value mt-2 max-w-full whitespace-nowrap text-[clamp(0.72rem,9.5cqi,1.35rem)] leading-tight tracking-[-0.035em] text-positive"
          aria-live="polite"
        >
          {formattedUsd(metrics.commission)}
          <span className="ml-1 text-[0.65rem] text-ink-faint sm:text-xs">USD</span>
        </p>
      </MetricSummary>
      <div className="col-span-2 min-w-0 md:col-span-1">
        <MetricSummary label="In queue" Icon={Clock3}>
          <div className="mt-2 space-y-1" aria-live="polite">
            <p className="currency-value max-w-full whitespace-nowrap text-[clamp(0.72rem,9.5cqi,1.5rem)] leading-tight tracking-[-0.035em] text-ink">
              {formattedUsd(metrics.queuedUsd)}
              <span className="ml-1 text-[0.65rem] text-ink-faint sm:text-xs">USD</span>
            </p>
            <p className="currency-value max-w-full whitespace-nowrap text-[clamp(0.72rem,9.5cqi,1.5rem)] leading-tight tracking-[-0.035em] text-ink">
              {formattedInr(metrics.pendingInr)}
              <span className="ml-1 text-[0.65rem] text-ink-faint sm:text-xs">INR</span>
            </p>
          </div>
        </MetricSummary>
      </div>
    </section>
  );
}
