import "server-only";

import type { LedgerType, TradingAdjustmentType } from "@prisma/client";
import { D, ZERO, type Dec } from "@/lib/money";
import { prisma } from "@/lib/prisma";

const USER_VISIBLE_TRADING_TYPES = [
  "TRADING_PROFIT",
  "TRADING_LOSS",
  "SERVER_FEE",
  "ADMIN_SHARE",
  "OTHER_INCREASE",
  "OTHER_DECREASE",
] as const satisfies readonly TradingAdjustmentType[];

const USER_VISIBLE_LEDGER_TYPES = [
  "DEPOSIT",
  "WITHDRAWAL",
  "FEE",
  "ADJUSTMENT",
] as const satisfies readonly LedgerType[];

export const USER_VISIBLE_ACCOUNT_TYPES = [
  ...USER_VISIBLE_TRADING_TYPES,
  ...USER_VISIBLE_LEDGER_TYPES,
] as const;

export type UserTradingActivityType =
  (typeof USER_VISIBLE_ACCOUNT_TYPES)[number];

export type UserTradingActivity = {
  id: string;
  type: UserTradingActivityType;
  userAmount: Dec;
  balanceAfter: Dec;
  note: string;
  createdAt: Date;
};

export type UserTradingActivityPage = {
  activity: UserTradingActivity[];
  page: number;
  pageCount: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

type UnbalancedActivity = Omit<UserTradingActivity, "balanceAfter">;

export async function getUserTradingActivity(
  userId: string,
  options: {
    page?: number;
    pageSize?: number;
    type?: UserTradingActivityType;
    from?: Date;
    to?: Date;
  } = {},
): Promise<UserTradingActivityPage> {
  const requestedPage = Math.max(1, Math.trunc(options.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.trunc(options.pageSize ?? 25)));

  const [tradingEntries, userLedger, userUnitEvents, poolUnitEvents] =
    await Promise.all([
      prisma.tradingAccountEntry.findMany({
        where: { type: { in: [...USER_VISIBLE_TRADING_TYPES] } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true, type: true, amount: true, note: true, createdAt: true },
      }),
      prisma.ledgerEntry.findMany({
        where: { userId, type: { in: [...USER_VISIBLE_LEDGER_TYPES] } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true, type: true, amount: true, note: true, createdAt: true },
      }),
      prisma.ledgerEntry.findMany({
        where: { userId, units: { not: null } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { units: true, createdAt: true },
      }),
      prisma.ledgerEntry.findMany({
        where: { units: { not: null } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { units: true, createdAt: true },
      }),
    ]);

  let userUnits = ZERO;
  let poolUnits = ZERO;
  let userCursor = 0;
  let poolCursor = 0;
  const events: UnbalancedActivity[] = userLedger.map((entry) => ({
    id: `ledger-${entry.id}`,
    type: entry.type as UserTradingActivityType,
    userAmount: D(entry.amount),
    note: entry.note ?? "Account movement",
    createdAt: entry.createdAt,
  }));

  for (const entry of tradingEntries) {
    while (
      userCursor < userUnitEvents.length &&
      userUnitEvents[userCursor].createdAt <= entry.createdAt
    ) {
      userUnits = userUnits.add(D(userUnitEvents[userCursor].units ?? 0));
      userCursor += 1;
    }
    while (
      poolCursor < poolUnitEvents.length &&
      poolUnitEvents[poolCursor].createdAt <= entry.createdAt
    ) {
      poolUnits = poolUnits.add(D(poolUnitEvents[poolCursor].units ?? 0));
      poolCursor += 1;
    }
    if (userUnits.lte(0) || poolUnits.lte(0)) continue;
    events.push({
      id: `trading-${entry.id}`,
      type: entry.type as UserTradingActivityType,
      userAmount: D(entry.amount).mul(userUnits.div(poolUnits)),
      note: entry.note,
      createdAt: entry.createdAt,
    });
  }

  events.sort((a, b) => {
    const time = a.createdAt.getTime() - b.createdAt.getTime();
    return time || a.id.localeCompare(b.id);
  });

  let balance = ZERO;
  const completeActivity: UserTradingActivity[] = events.map((event) => {
    balance = balance.add(event.userAmount);
    return { ...event, balanceAfter: balance };
  });

  const filtered = completeActivity.filter((entry) => {
    if (options.type && entry.type !== options.type) return false;
    if (options.from && entry.createdAt < options.from) return false;
    if (options.to && entry.createdAt > options.to) return false;
    return true;
  });
  const totalCount = filtered.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const descending = filtered.reverse();
  const activity = descending.slice((page - 1) * pageSize, page * pageSize);

  return {
    activity,
    page,
    pageCount,
    totalCount,
    hasNextPage: page < pageCount,
    hasPreviousPage: page > 1,
  };
}
