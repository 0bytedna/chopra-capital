import "server-only";
import type { TradingAdjustmentType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { D, type Dec } from "@/lib/money";
import { utcDayKey } from "@/lib/nav";

const DECREASE_TYPES = new Set<TradingAdjustmentType>([
  "TRADING_LOSS",
  "SERVER_FEE",
  "ADMIN_SHARE",
  "USER_WITHDRAWAL",
  "OTHER_DECREASE",
]);

export async function setTradingSnapshot(input: {
  balance: Dec;
  equity: Dec;
  note: string;
  adminId: string;
}) {
  if (input.balance.lt(0) || input.equity.lt(0)) throw new Error("Balance and equity cannot be negative.");
  if (!input.note.trim()) throw new Error("Enter an audit note explaining this update.");

  return prisma.$transaction(async (tx) => {
    const before = await tx.poolState.upsert({ where: { id: "pool" }, update: {}, create: { id: "pool" } });
    const totalUnits = D(before.totalUnits);
    const nav = totalUnits.gt(0) && input.equity.gt(0) ? input.equity.div(totalUnits) : D(before.lastNav);
    const after = await tx.poolState.update({
      where: { id: "pool" },
      data: { tradingBalance: input.balance, tradingEquity: input.equity, lastNav: nav },
    });
    await tx.tradingAccountEntry.create({ data: {
      type: "MANUAL_SNAPSHOT",
      amount: input.equity.sub(D(before.tradingEquity)),
      balanceBefore: before.tradingBalance,
      balanceAfter: input.balance,
      equityBefore: before.tradingEquity,
      equityAfter: input.equity,
      note: input.note.trim(),
      adminId: input.adminId,
    }});
    await tx.navSnapshot.upsert({
      where: { day: utcDayKey() },
      update: { nav, equity: input.equity, totalUnits },
      create: { day: utcDayKey(), nav, equity: input.equity, totalUnits },
    });
    return after;
  });
}

export async function recordTradingAdjustment(input: {
  type: Exclude<TradingAdjustmentType, "MANUAL_SNAPSHOT">;
  amount: Dec;
  note: string;
  adminId: string;
}) {
  if (input.amount.lte(0)) throw new Error("Enter an amount greater than zero.");
  if (!input.note.trim()) throw new Error("Enter an audit note for this adjustment.");
  const signed = DECREASE_TYPES.has(input.type) ? input.amount.neg() : input.amount;

  return prisma.$transaction(async (tx) => {
    const before = await tx.poolState.upsert({ where: { id: "pool" }, update: {}, create: { id: "pool" } });
    const balanceAfter = D(before.tradingBalance).add(signed);
    const equityAfter = D(before.tradingEquity).add(signed);
    if (balanceAfter.lt(0) || equityAfter.lt(0)) throw new Error("This adjustment would make the trading account negative.");
    const totalUnits = D(before.totalUnits);
    const nav = totalUnits.gt(0) && equityAfter.gt(0) ? equityAfter.div(totalUnits) : D(before.lastNav);
    const after = await tx.poolState.update({
      where: { id: "pool" },
      data: { tradingBalance: balanceAfter, tradingEquity: equityAfter, lastNav: nav },
    });
    await tx.tradingAccountEntry.create({ data: {
      type: input.type,
      amount: signed,
      balanceBefore: before.tradingBalance,
      balanceAfter,
      equityBefore: before.tradingEquity,
      equityAfter,
      note: input.note.trim(),
      adminId: input.adminId,
    }});
    await tx.navSnapshot.upsert({
      where: { day: utcDayKey() },
      update: { nav, equity: equityAfter, totalUnits },
      create: { day: utcDayKey(), nav, equity: equityAfter, totalUnits },
    });
    return after;
  });
}