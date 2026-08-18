import "server-only";

import type { TradingAdjustmentType } from "@/generated/prisma/client";
import { D, ZERO, toNumber, type Dec } from "@/lib/money";
import { getCurrentNav } from "@/lib/nav";
import { prisma } from "@/lib/prisma";
import {
  reportingDayEnd,
  reportingDayKey,
  reportingDayStart,
  shiftReportingDay,
} from "@/lib/reportingCalendar";
import type { SeriesPoint } from "@/lib/portfolio";

const PROFIT_TYPES = [
  "TRADING_PROFIT",
  "TRADING_LOSS",
  "SERVER_FEE",
  "ADMIN_SHARE",
  "OTHER_INCREASE",
  "OTHER_DECREASE",
] as const satisfies readonly TradingAdjustmentType[];

const PROFIT_TYPE_SET = new Set<TradingAdjustmentType>(PROFIT_TYPES);
const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function dayDistance(from: string, to: string): number {
  const fromTime = new Date(`${from}T00:00:00Z`).getTime();
  const toTime = new Date(`${to}T00:00:00Z`).getTime();
  return Math.max(0, Math.round((toTime - fromTime) / 86_400_000));
}

/**
 * Builds the whole-pool chart from the audited trading account ledger.
 * External deposits and withdrawals move Balance but are excluded from Profit.
 */
export async function getPoolPortfolioSeries(
  from?: string,
  to?: string,
): Promise<{
  series: SeriesPoint[];
  profitInRange: number;
  firstActivityDate: string;
}> {
  const [entries, currentNav] = await Promise.all([
    prisma.tradingAccountEntry.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        type: true,
        amount: true,
        balanceBefore: true,
        balanceAfter: true,
        createdAt: true,
      },
    }),
    getCurrentNav(),
  ]);

  const today = reportingDayKey();
  const firstDeposit = entries.find((entry) => entry.type === "USER_DEPOSIT");
  const firstActivity = reportingDayKey(
    (firstDeposit ?? entries[0])?.createdAt ?? new Date(),
  );

  let start = from && DAY_KEY_PATTERN.test(from) ? from : firstActivity;
  let end = to && DAY_KEY_PATTERN.test(to) ? to : today;
  if (start < firstActivity) start = firstActivity;
  if (end > today) end = today;
  if (end < start) end = start;

  const startInstant = reportingDayStart(start);
  const totalDays = dayDistance(start, end);
  const step = Math.max(1, Math.ceil((totalDays + 1) / 400));

  let cursor = 0;
  let balance: Dec = entries.length > 0 ? D(entries[0].balanceBefore) : ZERO;
  let profit = ZERO;

  while (cursor < entries.length && entries[cursor].createdAt < startInstant) {
    balance = D(entries[cursor].balanceAfter);
    cursor += 1;
  }

  function advanceThrough(day: string): void {
    const dayEnd = reportingDayEnd(day);
    while (cursor < entries.length && entries[cursor].createdAt <= dayEnd) {
      const entry = entries[cursor];
      balance = D(entry.balanceAfter);
      if (PROFIT_TYPE_SET.has(entry.type)) {
        profit = profit.add(entry.amount);
      }
      cursor += 1;
    }
  }

  function buildPoint(day: string): SeriesPoint {
    advanceThrough(day);
    const dayBalance = day === today ? currentNav.balance : balance;
    return {
      date: day,
      value: toNumber(dayBalance),
      invested: toNumber(dayBalance),
      profit: toNumber(profit),
    };
  }

  const series: SeriesPoint[] = [];
  for (let index = 0; index <= totalDays; index += step) {
    series.push(buildPoint(shiftReportingDay(start, index)));
  }
  if (series.length === 0 || series[series.length - 1].date !== end) {
    series.push(buildPoint(end));
  }

  return {
    series,
    profitInRange: series.at(-1)?.profit ?? 0,
    firstActivityDate: firstActivity,
  };
}
