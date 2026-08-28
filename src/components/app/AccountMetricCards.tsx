"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Clock3, WalletCards, type LucideIcon } from "lucide-react";

type AccountMetrics = {
  balance: number;
  queuedUsd: number;
  pendingInr: number;
};

type PortfolioResponse = {
  metrics?: {
    inPool?: number;
    queued?: number;
    pendingInr?: number;
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
    <article className="min-w-0 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.14em] text-ink-faint">{label}</p>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-gold-600/25 bg-gold-600/10">
          <Icon className="size-4 text-gold-400" aria-hidden />
        </span>
      </div>
      {children}
    </article>
  );
}

export function AccountMetricCards({
  initialBalance,
  initialQueued,
  initialPendingInr,
}: {
  initialBalance: number;
  initialQueued: number;
  initialPendingInr: number;
}) {
  const [metrics, setMetrics] = useState<AccountMetrics>({
    balance: initialBalance,
    queuedUsd: initialQueued,
    pendingInr: initialPendingInr,
  });

  useEffect(() => {
    let active = true;

    async function refresh() {
      try {
        const response = await fetch("/api/portfolio", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as PortfolioResponse;
        const balance = payload.metrics?.inPool;
        const queuedUsd = payload.metrics?.queued;
        const pendingInr = payload.metrics?.pendingInr;
        if (
          !active ||
          !Number.isFinite(balance) ||
          !Number.isFinite(queuedUsd) ||
          !Number.isFinite(pendingInr)
        ) return;
        setMetrics({
          balance: Number(balance),
          queuedUsd: Number(queuedUsd),
          pendingInr: Number(pendingInr),
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
      className="glass-card grid grid-cols-2 divide-x divide-stone-200 overflow-hidden rounded-xl"
      aria-label="Account figures"
    >
      <MetricSummary label="Balance" Icon={WalletCards}>
        <p
          className="currency-value mt-2 min-w-0 text-lg text-ink sm:text-2xl"
          aria-live="polite"
        >
          {formattedUsd(metrics.balance)}
          <span className="ml-1 text-[0.65rem] text-ink-faint sm:text-xs">USD</span>
        </p>
      </MetricSummary>
      <MetricSummary label="In queue" Icon={Clock3}>
        <div className="mt-2 space-y-1" aria-live="polite">
          <p className="currency-value min-w-0 text-lg text-ink sm:text-2xl">
            {formattedUsd(metrics.queuedUsd)}
            <span className="ml-1 text-[0.65rem] text-ink-faint sm:text-xs">USD</span>
          </p>
          <p className="currency-value min-w-0 text-lg text-ink sm:text-2xl">
            {formattedInr(metrics.pendingInr)}
            <span className="ml-1 text-[0.65rem] text-ink-faint sm:text-xs">INR</span>
          </p>
        </div>
      </MetricSummary>
    </section>
  );
}
