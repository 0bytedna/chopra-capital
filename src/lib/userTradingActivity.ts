import "server-only";

import type { TradingAdjustmentType } from "@/generated/prisma/client";
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

export type UserTradingActivity = {
  id: string;
  type: (typeof USER_VISIBLE_TRADING_TYPES)[number];
  userAmount: Dec;
  poolAmount: Dec;
  poolShare: Dec;
  note: string;
  createdAt: Date;
};

export async function getUserTradingActivity(
  userId: string,
  limit = 50,
): Promise<UserTradingActivity[]> {
  const recentEntries = await prisma.tradingAccountEntry.findMany({
    where: { type: { in: [...USER_VISIBLE_TRADING_TYPES] } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    select: {
      id: true,
      type: true,
      amount: true,
      note: true,
      createdAt: true,
    },
  });

  if (recentEntries.length === 0) return [];

  const entries = recentEntries.reverse();
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

  return activity.reverse();
}
