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
  balance: Dec;
  equity: Dec;
  totalUnits: Dec;
  live: boolean;
};

export async function getCurrentNav(): Promise<PoolNav> {
  const pool = await getPoolState();
  const totalUnits = D(pool.totalUnits);
  const balance = D(pool.tradingBalance);
  const equity = D(pool.tradingEquity);
  const nav = totalUnits.gt(0) && equity.gt(0) ? equity.div(totalUnits) : D(pool.lastNav);
  return { nav, balance, equity, totalUnits, live: false };
}

export function utcDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

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