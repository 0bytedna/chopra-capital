"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/cn";

export type SeriesPoint = {
  date: string;
  value: number;
  invested: number;
  profit: number;
};

type Props = {
  initialSeries: SeriesPoint[];
  firstActivityDate: string;
  endpoint?: string;
};

const PRESETS = [
  { key: "1W", days: 7 },
  { key: "1M", days: 30 },
  { key: "3M", days: 91 },
  { key: "1Y", days: 365 },
  { key: "ALL", days: null },
] as const;

type PresetKey = (typeof PRESETS)[number]["key"];
type GraphKey = "profit" | "value";

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function fmtAxisDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function fmtMoney(value: number, signed = false): string {
  const sign = signed ? (value > 0 ? "+" : value < 0 ? "−" : "") : "";
  return `${sign}${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtAxisMoney(value: number): string {
  const absolute = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (absolute >= 1_000_000) return `${sign}${(absolute / 1_000_000).toFixed(1)}M`;
  if (absolute >= 1_000) return `${sign}${(absolute / 1_000).toFixed(1)}K`;
  return `${sign}${absolute.toFixed(0)}`;
}

type TooltipPayloadItem = {
  dataKey?: string | number;
  value?: number | string;
};

function ChartTooltip({
  active,
  payload,
  label,
  dataKey,
  signed,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  dataKey: GraphKey;
  signed?: boolean;
  emphasizeSummary?: boolean;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload.find((entry) => entry.dataKey === dataKey);
  if (!item) return null;

  return (
    <div className="rounded-lg border border-gold-600/25 bg-vault-900/95 px-3.5 py-2.5 shadow-xl backdrop-blur">
      <p className="text-xs uppercase tracking-[0.14em] text-ink-faint">
        {fmtAxisDate(String(label))}
      </p>
      <p className="currency-value mt-1 text-sm text-gold-300">
        {fmtMoney(Number(item.value), signed)} <span className="text-ink-faint">USD</span>
      </p>
    </div>
  );
}

function GraphCard({
  title,
  eyebrow,
  caption,
  summaryLabel,
  dataKey,
  initialSeries,
  firstActivityDate,
  stroke,
  gradientId,
  endpoint,
  signed = false,
  emphasizeSummary = false,
}: {
  title: string;
  eyebrow: string;
  caption: string;
  summaryLabel: string;
  dataKey: GraphKey;
  initialSeries: SeriesPoint[];
  firstActivityDate: string;
  stroke: string;
  gradientId: string;
  endpoint: string;
  signed?: boolean;
  emphasizeSummary?: boolean;
}) {
  const today = useMemo(() => dayKey(new Date()), []);
  const [preset, setPreset] = useState<PresetKey | "CUSTOM">("ALL");
  const [from, setFrom] = useState(firstActivityDate);
  const [to, setTo] = useState(today);
  const [series, setSeries] = useState(initialSeries);
  const [loading, setLoading] = useState(false);

  const fetchRange = useCallback(async (nextFrom: string, nextTo: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch(
        `${endpoint}?from=${encodeURIComponent(nextFrom)}&to=${encodeURIComponent(nextTo)}`,
        { cache: "no-store" },
      );
      if (!response.ok) return;
      const data = (await response.json()) as { series: SeriesPoint[] };
      setSeries(data.series);
    } catch {
      // Keep the last valid graph during a temporary bridge or network interruption.
    } finally {
      if (!silent) setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    const id = setInterval(() => void fetchRange(from, to, true), 15_000);
    return () => clearInterval(id);
  }, [from, to, fetchRange]);

  function applyPreset(key: PresetKey) {
    const found = PRESETS.find((item) => item.key === key);
    const presetStart = new Date(`${today}T00:00:00Z`);
    if (found?.days != null) presetStart.setUTCDate(presetStart.getUTCDate() - found.days);
    const requestedFrom = found?.days == null ? firstActivityDate : dayKey(presetStart);
    const nextFrom = requestedFrom < firstActivityDate ? firstActivityDate : requestedFrom;

    setPreset(key);
    setFrom(nextFrom);
    setTo(today);
    void fetchRange(nextFrom, today);
  }

  function changeFrom(nextFrom: string) {
    if (!nextFrom || nextFrom > to) return;
    setPreset("CUSTOM");
    setFrom(nextFrom);
    void fetchRange(nextFrom, to);
  }

  function changeTo(nextTo: string) {
    if (!nextTo || nextTo < from) return;
    setPreset("CUSTOM");
    setTo(nextTo);
    void fetchRange(from, nextTo);
  }

  const latest = series.at(-1)?.[dataKey] ?? 0;
  const valueTone = signed
    ? latest > 0
      ? "text-positive"
      : latest < 0
        ? "text-negative"
        : "text-ink"
    : "text-ink";

  return (
    <article className="glass-card min-w-0 rounded-2xl p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="mt-1.5 font-serif text-xl text-ink">{title}</h2>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-ink-faint">{caption}</p>
        </div>
        <div className="shrink-0 sm:text-right">
          <p className="text-xs uppercase tracking-[0.16em] text-ink-faint">{summaryLabel}</p>
          <p
            className={cn(
              "currency-value mt-1",
              emphasizeSummary
                ? "text-2xl font-bold tracking-tight sm:text-3xl"
                : "text-base sm:text-lg",
              valueTone,
            )}
          >
            {fmtMoney(latest, signed)}{" "}
            <span
              className={cn(
                emphasizeSummary ? "text-sm font-semibold" : "text-xs",
                "text-ink-faint",
              )}
            >
              USD
            </span>
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3 border-t border-gold-600/15 pt-4">
        <div
          className="flex w-fit max-w-full overflow-x-auto rounded-full border border-gold-600/20 p-0.5"
          role="group"
          aria-label={`${title} preset date ranges`}
        >
          {PRESETS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => applyPreset(item.key)}
              aria-pressed={preset === item.key}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                preset === item.key
                  ? "bg-gold-600/20 text-gold-300"
                  : "text-ink-faint hover:text-ink",
              )}
            >
              {item.key}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
          <label className="min-w-0">
            <span className="sr-only">From date</span>
            <input
              type="date"
              value={from}
              min={firstActivityDate}
              max={to}
              onChange={(event) => changeFrom(event.target.value)}
              className="w-full min-w-0 rounded-lg border border-gold-600/20 bg-vault-900/80 px-3 py-2 font-mono text-xs text-ink [color-scheme:light] focus:border-gold-500/50 focus:outline-none focus:ring-2 focus:ring-gold-500/25"
            />
          </label>
          <span className="text-sm font-semibold text-ink-dim" aria-hidden>
            -
          </span>
          <label className="min-w-0">
            <span className="sr-only">To date</span>
            <input
              type="date"
              value={to}
              min={from}
              max={today}
              onChange={(event) => changeTo(event.target.value)}
              className="w-full min-w-0 rounded-lg border border-gold-600/20 bg-vault-900/80 px-3 py-2 font-mono text-xs text-ink [color-scheme:light] focus:border-gold-500/50 focus:outline-none focus:ring-2 focus:ring-gold-500/25"
            />
          </label>
        </div>
        <p className="text-right text-xs text-ink-faint" aria-live="polite">
          {loading ? "Updating…" : "Auto-refreshes every 15 seconds"}
        </p>
      </div>

      <div className="mt-3 h-64 min-w-0" aria-label={`${title} in USD over time`}>
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          minHeight={256}
          initialDimension={{ width: 320, height: 256 }}
        >
          <AreaChart data={series} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.3} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(148,163,184,0.22)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={fmtAxisDate}
              tick={{ fill: "#475569", fontSize: 13 }}
              axisLine={{ stroke: "rgba(148,163,184,0.30)" }}
              tickLine={false}
              minTickGap={36}
            />
            <YAxis
              tickFormatter={fmtAxisMoney}
              tick={{ fill: "#475569", fontSize: 13 }}
              axisLine={false}
              tickLine={false}
              width={52}
              domain={["auto", "auto"]}
            />
            <Tooltip content={<ChartTooltip dataKey={dataKey} signed={signed} />} />
            <Area
              type="monotone"
              dataKey={dataKey}
              name={title}
              stroke={stroke}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

export function PortfolioChart({
  initialSeries,
  firstActivityDate,
  endpoint = "/api/portfolio",
}: Props) {
  const [activeGraph, setActiveGraph] = useState<GraphKey>("profit");
  const showingProfit = activeGraph === "profit";

  return (
    <section className="min-w-0 space-y-3" aria-label="Account history graphs">
      <div
        className="grid grid-cols-2 rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
        role="tablist"
        aria-label="Select account graph"
      >
        <button
          id="portfolio-profit-tab"
          type="button"
          role="tab"
          aria-selected={showingProfit}
          aria-controls="portfolio-graph-panel"
          onClick={() => setActiveGraph("profit")}
          className={cn(
            "rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors",
            showingProfit
              ? "bg-blue-600 text-white shadow-sm"
              : "text-ink-dim hover:bg-blue-50 hover:text-blue-700",
          )}
        >
          Profits
        </button>
        <button
          id="portfolio-balance-tab"
          type="button"
          role="tab"
          aria-selected={!showingProfit}
          aria-controls="portfolio-graph-panel"
          onClick={() => setActiveGraph("value")}
          className={cn(
            "rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors",
            !showingProfit
              ? "bg-blue-600 text-white shadow-sm"
              : "text-ink-dim hover:bg-blue-50 hover:text-blue-700",
          )}
        >
          Balance
        </button>
      </div>

      <div
        id="portfolio-graph-panel"
        role="tabpanel"
        aria-labelledby={
          showingProfit ? "portfolio-profit-tab" : "portfolio-balance-tab"
        }
      >
        <GraphCard
          eyebrow={showingProfit ? "Trading result" : "Total account value"}
          title={showingProfit ? "Profits" : "Balance"}
          caption={
            showingProfit
              ? "Deposits and withdrawals are excluded from this calculation."
              : "Includes deposits, withdrawals, queued funds, profits and losses."
          }
          summaryLabel={showingProfit ? "Selected period" : "Ending balance"}
          dataKey={activeGraph}
          initialSeries={initialSeries}
          firstActivityDate={firstActivityDate}
          stroke={showingProfit ? "#38bdf8" : "#2563eb"}
          gradientId={showingProfit ? "profitGoldFill" : "balanceGreenFill"}
          endpoint={endpoint}
          signed={showingProfit}
          emphasizeSummary={showingProfit}
        />
      </div>
    </section>
  );
}