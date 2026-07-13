"use client";

// Interactive portfolio chart: preset ranges AND custom from–to pickers,
// a "profit this period" readout, and 15-second polling of /api/portfolio.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/cn";

export type SeriesPoint = { date: string; value: number; invested: number };

type Props = {
  initialSeries: SeriesPoint[];
  initialProfit: number;
  firstActivityDate: string;
};

const PRESETS = [
  { key: "1W", days: 7 },
  { key: "1M", days: 30 },
  { key: "3M", days: 91 },
  { key: "1Y", days: 365 },
  { key: "ALL", days: null },
] as const;

type PresetKey = (typeof PRESETS)[number]["key"];

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtAxisDate(date: string): string {
  const d = new Date(date + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function fmtAxisMoney(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(0);
}

type TooltipPayloadItem = { dataKey?: string | number; value?: number | string };

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload.find((p) => p.dataKey === "value");
  const invested = payload.find((p) => p.dataKey === "invested");
  return (
    <div className="rounded-lg border border-gold-600/25 bg-vault-900/95 px-3.5 py-2.5 shadow-xl backdrop-blur">
      <p className="text-[11px] uppercase tracking-[0.14em] text-ink-faint">{fmtAxisDate(String(label))}</p>
      {value && (
        <p className="mt-1 font-mono text-sm text-gold-300">{fmtMoney(Number(value.value))} <span className="text-ink-faint">value</span></p>
      )}
      {invested && (
        <p className="font-mono text-xs text-ink-dim">{fmtMoney(Number(invested.value))} <span className="text-ink-faint">net invested</span></p>
      )}
    </div>
  );
}

export function PortfolioChart({ initialSeries, initialProfit, firstActivityDate }: Props) {
  const today = useMemo(() => dayKey(new Date()), []);
  const [preset, setPreset] = useState<PresetKey>("ALL");
  const [from, setFrom] = useState(firstActivityDate);
  const [to, setTo] = useState(today);
  const [series, setSeries] = useState(initialSeries);
  const [profit, setProfit] = useState(initialProfit);
  const [loading, setLoading] = useState(false);

  const fetchRange = useCallback(async (f: string, t: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/portfolio?from=${encodeURIComponent(f)}&to=${encodeURIComponent(t)}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { series: SeriesPoint[]; profitInRange: number };
      setSeries(data.series);
      setProfit(data.profitInRange);
    } catch {
      // Network hiccup — keep showing the last good data.
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // 15-second live polling of the current window.
  useEffect(() => {
    const id = setInterval(() => fetchRange(from, to, true), 15_000);
    return () => clearInterval(id);
  }, [from, to, fetchRange]);

  function applyPreset(key: PresetKey) {
    setPreset(key);
    const found = PRESETS.find((p) => p.key === key);
    const f =
      found?.days == null
        ? firstActivityDate
        : dayKey(new Date(Date.now() - found.days * 86_400_000));
    const finalFrom = f < firstActivityDate ? firstActivityDate : f;
    setFrom(finalFrom);
    setTo(today);
    void fetchRange(finalFrom, today);
  }

  function applyCustom(nextFrom: string, nextTo: string) {
    if (!nextFrom || !nextTo) return;
    setPreset("ALL" as PresetKey);
    setFrom(nextFrom);
    setTo(nextTo);
    void fetchRange(nextFrom, nextTo);
  }

  const positive = profit >= 0;

  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Performance</p>
          <h2 className="mt-1.5 font-serif text-xl text-ink">Portfolio value</h2>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.16em] text-ink-faint">Profit this period</p>
          <p className={cn("font-mono text-lg", positive ? "text-positive" : "text-negative")}>
            {positive ? "+" : "−"}
            {fmtMoney(Math.abs(profit))} <span className="text-xs text-ink-faint">USDT</span>
          </p>
        </div>
      </div>

      {/* Range controls */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="flex rounded-full border border-gold-600/20 p-0.5" role="group" aria-label="Preset ranges">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => applyPreset(p.key)}
              aria-pressed={preset === p.key}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                preset === p.key ? "bg-gold-600/20 text-gold-300" : "text-ink-faint hover:text-ink",
              )}
            >
              {p.key}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-ink-faint">
          <label className="sr-only" htmlFor="chart-from">From date</label>
          <input
            id="chart-from"
            type="date"
            value={from}
            min={firstActivityDate}
            max={to}
            onChange={(e) => applyCustom(e.target.value, to)}
            className="rounded-md border border-gold-600/20 bg-vault-900/80 px-2 py-1 font-mono text-xs text-ink-dim [color-scheme:dark] focus:border-gold-500/50 focus:outline-none"
          />
          <span aria-hidden>–</span>
          <label className="sr-only" htmlFor="chart-to">To date</label>
          <input
            id="chart-to"
            type="date"
            value={to}
            min={from}
            max={today}
            onChange={(e) => applyCustom(from, e.target.value)}
            className="rounded-md border border-gold-600/20 bg-vault-900/80 px-2 py-1 font-mono text-xs text-ink-dim [color-scheme:dark] focus:border-gold-500/50 focus:outline-none"
          />
        </div>

        {loading && <span className="text-[11px] text-ink-faint">Updating…</span>}
      </div>

      <div className="mt-5 h-64 sm:h-72" aria-label="Chart of portfolio value versus net invested over time">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d3ab52" stopOpacity={0.32} />
                <stop offset="100%" stopColor="#d3ab52" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(236,231,219,0.06)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={fmtAxisDate}
              tick={{ fill: "#837b6c", fontSize: 11 }}
              axisLine={{ stroke: "rgba(236,231,219,0.1)" }}
              tickLine={false}
              minTickGap={36}
            />
            <YAxis
              tickFormatter={fmtAxisMoney}
              tick={{ fill: "#837b6c", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={44}
              domain={["auto", "auto"]}
            />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="invested"
              name="Net invested"
              stroke="rgba(184,176,160,0.55)"
              strokeDasharray="5 4"
              strokeWidth={1.5}
              fill="none"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="value"
              name="Portfolio value"
              stroke="#d3ab52"
              strokeWidth={2}
              fill="url(#goldFill)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-ink-faint">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-0.5 w-4 rounded bg-gold-500" /> Portfolio value
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-0.5 w-4 rounded bg-ink-dim/60 [background-image:repeating-linear-gradient(90deg,currentColor_0_4px,transparent_4px_7px)]" />{" "}
          Net invested
        </span>
        <span className="ml-auto">Refreshes every 15s</span>
      </div>
    </div>
  );
}
