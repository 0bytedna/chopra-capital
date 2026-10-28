import "server-only";

import type { Prisma, TradingAdjustmentType } from "@prisma/client";
import { D, ZERO, type Dec } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const USER_VISIBLE_TRADING_TYPES = [
  "TRADING_PROFIT",
  "TRADING_LOSS",
  "SERVER_FEE",
  "ADMIN_SHARE",
  "OTHER_INCREASE",
  "OTHER_DECREASE",
] as const satisfies readonly TradingAdjustmentType[];

export type UserTradingActivityType =
  (typeof USER_VISIBLE_TRADING_TYPES)[number];

export type UserTradingActivity = {
  id: string;
  type: UserTradingActivityType;
  userAmount: Dec;
  poolAmount: Dec;
  poolShare: Dec;
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
  const where: Prisma.TradingAccountEntryWhereInput = {
    type: {
      in: options.type ? [options.type] : [...USER_VISIBLE_TRADING_TYPES],
    },
    ...(options.from || options.to
      ? {
          createdAt: {
            ...(options.from ? { gte: options.from } : {}),
            ...(options.to ? { lte: options.to } : {}),
          },
        }
      : {}),
  };
  const visibleEntryCount = await prisma.tradingAccountEntry.count({
    where,
  });
  const pageCount = Math.max(1, Math.ceil(visibleEntryCount / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const recentEntries = await prisma.tradingAccountEntry.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize + 1,
    select: {
      id: true,
      type: true,
      amount: true,
      note: true,
      createdAt: true,
    },
  });

  const hasNextPage = recentEntries.length > pageSize;
  const pageEntries = recentEntries.slice(0, pageSize);
  if (pageEntries.length === 0) {
    return {
      activity: [],
      page,
      pageCount,
      totalCount: visibleEntryCount,
      hasNextPage: false,
      hasPreviousPage: page > 1,
    };
  }

  const entries = pageEntries.reverse();
  const latestEntryAt = entries[entries.length - 1].createdAt;
  const [userUnitEvents, poolUnitEvents] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where: {
        userId,
        units: { not: null },
        createdAt: { lte: latestEntryAt },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, units: true, createdAt: true },
    }),
    prisma.ledgerEntry.findMany({
      where: {
        units: { not: null },
        createdAt: { lte: latestEntryAt },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, units: true, createdAt: true },
    }),
  ]);

  let userUnits = ZERO;
  let poolUnits = ZERO;
  let userCursor = 0;
  let poolCursor = 0;
  const activity: UserTradingActivity[] = [];

  for (const entry of entries) {
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
    const poolShare = userUnits.div(poolUnits);
    const poolAmount = D(entry.amount);
    activity.push({
      id: entry.id,
      type: entry.type as UserTradingActivity["type"],
      userAmount: poolAmount.mul(poolShare),
      poolAmount,
      poolShare,
      note: entry.note,
      createdAt: entry.createdAt,
    });
  }

  return {
    activity: activity.reverse(),
    page,
    pageCount,
    totalCount: visibleEntryCount,
    hasNextPage,
    hasPreviousPage: page > 1,
  };
}
