// Portfolio maths: replays the investor's append-only ledger to compute
// metrics and an honest day-by-day value series. NAV history comes from real
// NavSnapshot rows — days between snapshots are linearly interpolated, and
// nothing is ever extrapolated into the past before data existed.

import "server-only";
import { prisma } from "@/lib/prisma";
import { D, ZERO, toNumber, type Dec } from "@/lib/money";
import { getCurrentNav } from "@/lib/nav";
import type { LedgerEntry } from "@/generated/prisma";

export type PortfolioMetrics = {
  queued: Dec;
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
    bookedProfit: ZERO,
    totalFees: ZERO,
  };
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
      // amount > 0 invested, units > 0 issued
      s.queued = s.queued.sub(amount);
      s.basis = s.basis.add(amount);
      s.units = s.units.add(D(e.units ?? 0));
      return;
    }
    case "WITHDRAWAL":
    case "FEE":
    case "ADJUSTMENT": {
      const isRedemption = e.units !== null && e.navPrice !== null;
      if (isRedemption) {
        const unitsMoved = D(e.units ?? 0); // negative when redeeming
        const redeemed = unitsMoved.neg();
        if (redeemed.gt(0) && s.units.gt(0)) {
          const fraction = redeemed.div(s.units);
          const basisRemoved = s.basis.mul(fraction.gt(1) ? D(1) : fraction);
          const value = redeemed.mul(D(e.navPrice ?? 0));
          s.bookedProfit = s.bookedProfit.add(value.sub(basisRemoved));
          s.basis = s.basis.sub(basisRemoved);
        }
        s.units = s.units.add(unitsMoved);
        if (s.units.lt(0)) s.units = ZERO;
        if (s.basis.lt(0)) s.basis = ZERO;
      } else {
        s.queued = s.queued.add(amount); // amount is signed
      }
      if (e.type === "WITHDRAWAL") {
        s.netWithdrawals = s.netWithdrawals.add(amount.neg());
      }
      if (e.type === "FEE") {
        const fee = amount.neg();
        s.totalFees = s.totalFees.add(fee);
        s.bookedProfit = s.bookedProfit.sub(fee);
      }
      return;
    }
  }
}

export async function getPortfolioMetrics(userId: string): Promise<PortfolioMetrics> {
  const [entries, { nav, live }] = await Promise.all([
    prisma.ledgerEntry.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    getCurrentNav().then((r) => ({ nav: r.nav, live: r.live })),
  ]);

  const s = freshState();
  for (const e of entries) applyEntry(s, e);

  const poolValue = s.units.mul(nav);
  return {
    queued: s.queued,
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
};

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

/** NAV per day from real snapshots, linearly interpolated between them. */
function buildNavLookup(
  snapshots: Array<{ day: string; nav: Dec }>,
  fallback: Dec,
): (day: string) => Dec {
  if (snapshots.length === 0) return () => fallback;
  const days = snapshots.map((s) => s.day);
  const navs = snapshots.map((s) => D(s.nav));

  return (day: string) => {
    if (day <= days[0]) return navs[0];
    if (day >= days[days.length - 1]) {
      // After the last snapshot the freshest figure is the live/last NAV.
      return day > days[days.length - 1] ? fallback : navs[navs.length - 1];
    }
    let lo = 0;
    for (let i = 0; i < days.length; i++) {
      if (days[i] <= day) lo = i;
      else break;
    }
    if (days[lo] === day) return navs[lo];
    const hi = lo + 1;
    const t0 = new Date(days[lo] + "T00:00:00Z").getTime();
    const t1 = new Date(days[hi] + "T00:00:00Z").getTime();
    const t = new Date(day + "T00:00:00Z").getTime();
    const frac = (t - t0) / (t1 - t0);
    return navs[lo].add(navs[hi].sub(navs[lo]).mul(D(frac)));
  };
}

export async function getPortfolioSeries(
  userId: string,
  from?: string,
  to?: string,
): Promise<{ series: SeriesPoint[]; profitInRange: number }> {
  const [entries, snapshots, { nav: currentNav }] = await Promise.all([
    prisma.ledgerEntry.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.navSnapshot.findMany({ orderBy: { day: "asc" }, select: { day: true, nav: true } }),
    getCurrentNav(),
  ]);

  const today = dayKey(new Date());
  const firstActivity = entries.length > 0 ? dayKey(entries[0].createdAt) : today;

  let start = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : firstActivity;
  let end = to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : today;
  if (start < firstActivity) start = firstActivity;
  if (end > today) end = today;
  if (end < start) end = start;

  const navOn = buildNavLookup(snapshots, currentNav);

  const startDate = new Date(start + "T00:00:00Z");
  const endDate = new Date(end + "T00:00:00Z");
  const totalDays = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 86400000));
  // Keep the payload sane on long ranges; always include the final day.
  const step = Math.max(1, Math.ceil((totalDays + 1) / 400));

  const s = freshState();
  let cursor = 0;

  const series: SeriesPoint[] = [];
  for (let i = 0; i <= totalDays; i += step) {
    const day = dayKey(addDays(startDate, i));
    const dayEnd = new Date(day + "T23:59:59.999Z");
    while (cursor < entries.length && entries[cursor].createdAt <= dayEnd) {
      applyEntry(s, entries[cursor]);
      cursor++;
    }
    const nav = day === today ? currentNav : navOn(day);
    series.push({
      date: day,
      value: toNumber(s.queued.add(s.units.mul(nav))),
      invested: toNumber(s.queued.add(s.basis)),
    });
  }
  // Make sure the last point is the end day even when stepping.
  if (series.length === 0 || series[series.length - 1].date !== end) {
    while (cursor < entries.length && entries[cursor].createdAt <= new Date(end + "T23:59:59.999Z")) {
      applyEntry(s, entries[cursor]);
      cursor++;
    }
    const nav = end === today ? currentNav : navOn(end);
    series.push({
      date: end,
      value: toNumber(s.queued.add(s.units.mul(nav))),
      invested: toNumber(s.queued.add(s.basis)),
    });
  }

  const first = series[0];
  const last = series[series.length - 1];
  // Profit over the window = growth in value not explained by net contributions.
  const profitInRange =
    series.length > 1 ? last.value - first.value - (last.invested - first.invested) : 0;

  return { series, profitInRange };
}
