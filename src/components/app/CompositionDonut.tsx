"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/cn";

type Props = {
  principal: number; // cost basis + queued
  profit: number; // unrealized profit (can be negative)
};

function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Composition of current value: principal vs unrealized profit. */
export function CompositionDonut({ principal, profit }: Props) {
  const inLoss = profit < 0;
  const currentValue = principal + profit;

  // In profit: value splits into principal + growth. In drawdown: show what
  // remains vs what is currently down — never pretend a loss is zero.
  const data = inLoss
    ? [
        { name: "Current value", amount: Math.max(currentValue, 0) },
        { name: "Drawdown", amount: Math.abs(profit) },
      ]
    : [
        { name: "Principal", amount: principal },
        { name: "Profit", amount: profit },
      ];

  const empty = data.every((d) => d.amount <= 0);
  const colors = inLoss ? ["#2563eb", "#fb7185"] : ["#2563eb", "#34d399"];

  return (
    <div className="glass-card flex h-full flex-col rounded-2xl p-5 sm:p-6">
      <p className="eyebrow">Composition</p>
      <h2 className="mt-1.5 font-serif text-xl text-ink">Principal vs profit</h2>

      <div className="relative mx-auto mt-2 h-44 w-44">
        {empty ? (
          <div className="flex h-full items-center justify-center rounded-full border border-dashed border-gold-600/25">
            <p className="px-6 text-center text-xs text-ink-faint">No funds in the pool yet</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={176}
              minHeight={176}
              initialDimension={{ width: 176, height: 176 }}
            >
              <PieChart>
                <Pie
                  data={data}
                  dataKey="amount"
                  nameKey="name"
                  innerRadius={56}
                  outerRadius={76}
                  paddingAngle={2}
                  strokeWidth={0}
                  isAnimationActive={false}
                >
                  {data.map((entry, i) => (
                    <Cell key={entry.name} fill={colors[i]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-xs uppercase tracking-[0.14em] text-ink-faint">Value</p>
              <p className="currency-value text-sm text-ink">{fmtMoney(currentValue)}</p>
            </div>
          </>
        )}
      </div>

      <div className="mt-4 space-y-2 text-sm">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-ink-dim">
              <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: colors[i] }} />
              {d.name}
            </span>
            <span className={cn("currency-value text-xs", i === 1 && inLoss ? "text-negative" : "text-ink")}>
              {fmtMoney(d.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
