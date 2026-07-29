"use client";

import { useEffect, useState } from "react";
import { Clock3, WalletCards, type LucideIcon } from "lucide-react";

type AccountMetrics = {
  balance: number;
  queued: number;
};

type PortfolioResponse = {
  metrics?: {
    inPool?: number;
    queued?: number;
  };
};

function formattedUsd(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function MetricCard({
  label,
  value,
  Icon,
}: {
  label: string;
  value: number;
  Icon: LucideIcon;
}) {
  return (
    <article className="glass-card min-w-0 rounded-xl p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.14em] text-ink-faint">{label}</p>
        <span className="flex size-9 items-center justify-center rounded-full border border-gold-600/25 bg-gold-600/10">
          <Icon className="size-4 text-gold-400" aria-hidden />
        </span>
      </div>
      <p className="currency-value mt-3 min-w-0 break-all text-xl text-ink sm:text-3xl" aria-live="polite">
        {formattedUsd(value)}
        <span className="ml-1.5 text-xs text-ink-faint">USD</span>
      </p>
    </article>
  );
}

export function AccountMetricCards({
  initialBalance,
  initialQueued,
}: {
  initialBalance: number;
  initialQueued: number;
}) {
  const [metrics, setMetrics] = useState<AccountMetrics>({
    balance: initialBalance,
    queued: initialQueued,
  });

  useEffect(() => {
    let active = true;

    async function refresh() {
      try {
        const response = await fetch("/api/portfolio", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as PortfolioResponse;
        const balance = payload.metrics?.inPool;
        const queued = payload.metrics?.queued;
        if (!active || !Number.isFinite(balance) || !Number.isFinite(queued)) return;
        setMetrics({ balance: Number(balance), queued: Number(queued) });
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
    <section className="grid gap-4 sm:grid-cols-2" aria-label="Account figures">
      <MetricCard label="Balance" value={metrics.balance} Icon={WalletCards} />
      <MetricCard label="In queue" value={metrics.queued} Icon={Clock3} />
    </section>
  );
}