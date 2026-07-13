// Pool NAV: equity at the broker divided by total pool units. When the live
// MT5 feed is unavailable we fall back to the last settled NAV so the app
// never shows fabricated numbers — just the most recent real ones.

import "server-only";
import { prisma } from "@/lib/prisma";
import { D, ZERO, type Dec } from "@/lib/money";

export async function getPoolState() {
  return prisma.poolState.upsert({
    where: { id: "pool" },
    update: {},
    create: { id: "pool" },
  });
}

export type PoolNav = {
  nav: Dec;
  equity: Dec;
  totalUnits: Dec;
  live: boolean; // true when derived from a fresh MT5 equity figure
};

export async function getCurrentNav(): Promise<PoolNav> {
  const pool = await getPoolState();
  const account = await prisma.mt5Account.findFirst({ orderBy: { updatedAt: "desc" } });
  const totalUnits = D(pool.totalUnits);

  if (account && totalUnits.gt(0) && account.equity > 0) {
    const equity = D(account.equity);
    return { nav: equity.div(totalUnits), equity, totalUnits, live: true };
  }

  const nav = D(pool.lastNav);
  return {
    nav,
    equity: account ? D(account.equity) : totalUnits.mul(nav),
    totalUnits,
    live: false,
  };
}

export function utcDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Upserted on every MT5 ingest so each day keeps its latest real NAV. */
export async function upsertDailySnapshot(nav: Dec, equity: Dec, totalUnits: Dec): Promise<void> {
  const day = utcDayKey();
  await prisma.navSnapshot.upsert({
    where: { day },
    update: { nav, equity, totalUnits },
    create: { day, nav, equity, totalUnits },
  });
}

export async function getSetting(key: string, fallback: string): Promise<string> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? fallback;
}

export async function getSettingDecimal(key: string, fallback: string): Promise<Dec> {
  const raw = await getSetting(key, fallback);
  try {
    return D(raw);
  } catch {
    return D(fallback);
  }
}

export { ZERO };
