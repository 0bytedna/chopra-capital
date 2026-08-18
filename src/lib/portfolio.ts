// Portfolio maths: replays the investor ledger, pool balance events, and unit
// movements to compute an IST-aligned day-by-day value and profit series.
// Legacy NAV snapshots are used only when older event data is unavailable.

import "server-only";
import { prisma } from "@/lib/prisma";
import { D, ZERO, toNumber, type Dec } from "@/lib/money";
import { getCurrentNav } from "@/lib/nav";
import {
  reportingDayEnd,
  reportingDayKey,
  reportingDayStart,
  shiftReportingDay,
} from "@/lib/reportingCalendar";
import type { LedgerEntry } from "@/generated/prisma";

export type PortfolioMetrics = {
  queued: Dec;
  pendingInr: Dec;
  units: Dec;
  nav: Dec;
  navLive: boolean;
  currentValue: Dec; // queued + units × NAV
  totalDeposits: Dec; // confirmed deposits, lifetime
  netWithdrawals: Dec; // USDT actually paid out (after fees), lifetime
  netInvestedInPool: Dec; // cost basis of currently-held units
  bookedProfit: Dec; // realized profit from redeemed units, minus all fees
  unrealizedProfit: Dec; // units × NAV − cost basis
  totalFees: Dec;
};

type WalkState = {
  queued: Dec;
  units: Dec;
  basis: Dec;
  totalDeposits: Dec;
  netWithdrawals: Dec;
  netAdjustments: Dec;
  bookedProfit: Dec;
  totalFees: Dec;
};

function freshState(): WalkState {
  return {
    queued: ZERO,
    units: ZERO,
    basis: ZERO,
    totalDeposits: ZERO,
    netWithdrawals: ZERO,
    netAdjustments: ZERO,
    bookedProfit: ZERO,
    totalFees: ZERO,
  };
}

function removeUnits(s: WalkState, unitsMoved: Dec, navPrice: Dec): void {
  const redeemed = unitsMoved.neg();
  if (redeemed.gt(0) && s.units.gt(0)) {
    const fraction = redeemed.div(s.units);
    const basisRemoved = s.basis.mul(fraction.gt(1) ? D(1) : fraction);
    const value = redeemed.mul(navPrice);
    s.bookedProfit = s.bookedProfit.add(value.sub(basisRemoved));
    s.basis = s.basis.sub(basisRemoved);
  }
  s.units = s.units.add(unitsMoved);
  if (s.units.lt(0)) s.units = ZERO;
  if (s.basis.lt(0)) s.basis = ZERO;
}

/** Applies one ledger entry to the running state. */
function applyEntry(s: WalkState, e: LedgerEntry): void {
  const amount = D(e.amount);

  switch (e.type) {
    case "DEPOSIT": {
      s.queued = s.queued.add(amount);
      s.totalDeposits = s.totalDeposits.add(amount);
      return;
    }
    case "INVEST": {
      s.queued = s.queued.sub(amount);
      s.basis = s.basis.add(amount);
      s.units = s.units.add(D(e.units ?? 0));
      return;
    }
    case "WITHDRAWAL": {
      const hasUnits = e.units !== null && e.navPrice !== null;
      if (hasUnits) {
        removeUnits(s, D(e.units ?? 0), D(e.navPrice ?? 0));
      } else {
        s.queued = s.queued.add(amount);
      }
      s.netWithdrawals = s.netWithdrawals.add(amount.neg());
      return;
    }
    case "FEE": {
      const hasUnits = e.units !== null && e.navPrice !== null;
      if (hasUnits) {
        removeUnits(s, D(e.units ?? 0), D(e.navPrice ?? 0));
      } else {
        s.queued = s.queued.add(amount);
      }
      const fee = amount.neg();
      s.totalFees = s.totalFees.add(fee);
      s.bookedProfit = s.bookedProfit.sub(fee);
      return;
    }
    case "ADJUSTMENT": {
      const unitsMoved = D(e.units ?? 0);
      const hasUnits = e.units !== null && e.navPrice !== null;
      if (!hasUnits) {
        s.queued = s.queued.add(amount);
      } else if (unitsMoved.lt(0)) {
        removeUnits(s, unitsMoved, D(e.navPrice ?? 0));
      } else if (unitsMoved.gt(0)) {
        s.units = s.units.add(unitsMoved);
        // Incoming internal-transfer units start at their transfer-time market
        // value, so only future movement is attributed to the recipient.
        s.basis = s.basis.add(amount.gt(0) ? amount : unitsMoved.mul(D(e.navPrice ?? 0)));
      }
      // Adjustments are account contributions/distributions, not trading P/L.
      s.netAdjustments = s.netAdjustments.add(amount);
      return;
    }
  }
}
export async function getPortfolioMetrics(userId: string): Promise<PortfolioMetrics> {
  const [entries, { nav, live }, pendingInr] = await Promise.all([
    prisma.ledgerEntry.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    getCurrentNav().then((r) => ({ nav: r.nav, live: r.live })),
    prisma.deposit.aggregate({
      where: {
        userId,
        method: { in: ["BANK", "CASH"] },
        status: { in: ["PENDING", "NEEDS_CORRECTION", "RECEIVED"] },
      },
      _sum: { inrAmount: true },
    }),
  ]);

  const s = freshState();
  for (const e of entries) applyEntry(s, e);

  const poolValue = s.units.mul(nav);
  return {
    queued: s.queued,
    pendingInr: D(pendingInr._sum.inrAmount ?? 0),
    units: s.units,
    nav,
    navLive: live,
    currentValue: s.queued.add(poolValue),
    totalDeposits: s.totalDeposits,
    netWithdrawals: s.netWithdrawals,
    netInvestedInPool: s.basis,
    bookedProfit: s.bookedProfit,
    unrealizedProfit: poolValue.sub(s.basis),
    totalFees: s.totalFees,
  };
}

// ---------------------------------------------------------------------------
// Time series for the dashboard chart
// ---------------------------------------------------------------------------

export type SeriesPoint = {
  date: string; // YYYY-MM-DD
  value: number; // queued + units × nav(day)
  invested: number; // queued + cost basis (net money at work)
  profit: number; // cumulative P/L with external deposits and withdrawals removed
};

/** NAV per day from stored snapshots, used only as a legacy fallback. */
function buildNavLookup(
  snapshots: Array<{ day: string; nav: Dec }>,
  fallback: Dec,
): (day: string) => Dec {
  if (snapshots.length === 0) return () => fallback;
  const days = snapshots.map((snapshot) => snapshot.day);
  const navs = snapshots.map((snapshot) => D(snapshot.nav));

  return (day: string) => {
    if (day <= days[0]) return navs[0];
    if (day >= days[days.length - 1]) {
      return day > days[days.length - 1] ? fallback : navs[navs.length - 1];
    }
    let lowerIndex = 0;
    for (let index = 0; index < days.length; index += 1) {
      if (days[index] <= day) lowerIndex = index;
      else break;
    }
    if (days[lowerIndex] === day) return navs[lowerIndex];
    const upperIndex = lowerIndex + 1;
    const lowerTime = new Date(`${days[lowerIndex]}T00:00:00Z`).getTime();
    const upperTime = new Date(`${days[upperIndex]}T00:00:00Z`).getTime();
    const requestedTime = new Date(`${day}T00:00:00Z`).getTime();
    const fraction = (requestedTime - lowerTime) / (upperTime - lowerTime);
    return navs[lowerIndex].add(
      navs[upperIndex].sub(navs[lowerIndex]).mul(D(fraction)),
    );
  };
}

function dayDistance(from: string, to: string): number {
  const fromTime = new Date(`${from}T00:00:00Z`).getTime();
  const toTime = new Date(`${to}T00:00:00Z`).getTime();
  return Math.max(0, Math.round((toTime - fromTime) / 86_400_000));
}

export async function getPortfolioSeries(
  userId: string,
  from?: string,
  to?: string,
): Promise<{ series: SeriesPoint[]; profitInRange: number; firstActivityDate: string }> {
  const [entries, snapshots, poolEvents, unitEvents, { nav: currentNav }] =
    await Promise.all([
      prisma.ledgerEntry.findMany({
        where: { userId },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
      prisma.navSnapshot.findMany({
        orderBy: { day: "asc" },
        select: { day: true, nav: true },
      }),
      prisma.tradingAccountEntry.findMany({
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          balanceBefore: true,
          balanceAfter: true,
          createdAt: true,
        },
      }),
      prisma.ledgerEntry.findMany({
        where: { units: { not: null } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true, units: true, createdAt: true },
      }),
      getCurrentNav(),
    ]);

  const today = reportingDayKey();
  const firstDeposit = entries.find((entry) => entry.type === "DEPOSIT");
  const firstActivityEntry = firstDeposit ?? entries[0];
  const firstActivity = firstActivityEntry
    ? reportingDayKey(firstActivityEntry.createdAt)
    : today;

  let start = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : firstActivity;
  let end = to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : today;
  if (start < firstActivity) start = firstActivity;
  if (end > today) end = today;
  if (end < start) end = start;

  const legacyNavOn = buildNavLookup(snapshots, currentNav);
  const startInstant = reportingDayStart(start);
  const totalDays = dayDistance(start, end);
  const step = Math.max(1, Math.ceil((totalDays + 1) / 400));

  const state = freshState();
  let entryCursor = 0;
  let poolCursor = 0;
  let unitCursor = 0;
  let poolBalance =
    poolEvents.length > 0 ? D(poolEvents[0].balanceBefore) : ZERO;
  let poolUnits = ZERO;

  while (
    entryCursor < entries.length &&
    entries[entryCursor].createdAt < startInstant
  ) {
    applyEntry(state, entries[entryCursor]);
    entryCursor += 1;
  }
  while (
    poolCursor < poolEvents.length &&
    poolEvents[poolCursor].createdAt < startInstant
  ) {
    poolBalance = D(poolEvents[poolCursor].balanceAfter);
    poolCursor += 1;
  }
  while (
    unitCursor < unitEvents.length &&
    unitEvents[unitCursor].createdAt < startInstant
  ) {
    poolUnits = poolUnits.add(D(unitEvents[unitCursor].units ?? 0));
    unitCursor += 1;
  }

  function navFromEvents(day: string): Dec {
    if (day === today) return currentNav;
    if (poolUnits.gt(0) && poolBalance.gt(0)) {
      return poolBalance.div(poolUnits);
    }
    return legacyNavOn(day);
  }

  function advanceThrough(day: string): void {
    const dayEnd = reportingDayEnd(day);
    while (
      entryCursor < entries.length &&
      entries[entryCursor].createdAt <= dayEnd
    ) {
      applyEntry(state, entries[entryCursor]);
      entryCursor += 1;
    }
    while (
      poolCursor < poolEvents.length &&
      poolEvents[poolCursor].createdAt <= dayEnd
    ) {
      poolBalance = D(poolEvents[poolCursor].balanceAfter);
      poolCursor += 1;
    }
    while (
      unitCursor < unitEvents.length &&
      unitEvents[unitCursor].createdAt <= dayEnd
    ) {
      poolUnits = poolUnits.add(D(unitEvents[unitCursor].units ?? 0));
      unitCursor += 1;
    }
  }

  const baselineNav = navFromEvents(shiftReportingDay(start, -1));
  const baselineProfit = state.queued
    .add(state.units.mul(baselineNav))
    .add(state.netWithdrawals)
    .sub(state.totalDeposits)
    .sub(state.netAdjustments);

  function buildPoint(day: string): SeriesPoint {
    advanceThrough(day);
    const nav = navFromEvents(day);
    const value = state.queued.add(state.units.mul(nav));
    return {
      date: day,
      value: toNumber(value),
      invested: toNumber(state.queued.add(state.basis)),
      profit: toNumber(
        value
          .add(state.netWithdrawals)
          .sub(state.totalDeposits)
          .sub(state.netAdjustments)
          .sub(baselineProfit),
      ),
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
