import "server-only";
import type { TradingAdjustmentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { D, type Dec } from "@/lib/money";
import { snapshotDayKey } from "@/lib/nav";

const DECREASE_TYPES = new Set<TradingAdjustmentType>([
  "TRADING_LOSS",
  "SERVER_FEE",
  "ADMIN_SHARE",
  "OTHER_DECREASE",
]);

export const EDITABLE_TRADING_TYPES = [
  "TRADING_PROFIT",
  "TRADING_LOSS",
  "SERVER_FEE",
  "ADMIN_SHARE",
  "OTHER_INCREASE",
  "OTHER_DECREASE",
] as const;

export type EditableTradingAdjustmentType =
  (typeof EDITABLE_TRADING_TYPES)[number];

const EDITABLE_TYPE_SET = new Set<TradingAdjustmentType>(
  EDITABLE_TRADING_TYPES,
);

function signedAmount(type: EditableTradingAdjustmentType, amount: Dec) {
  return DECREASE_TYPES.has(type) ? amount.neg() : amount;
}

function isProtectedManualEntry(type: TradingAdjustmentType, note: string) {
  return (
    !EDITABLE_TYPE_SET.has(type) || note.startsWith("Investor correction:")
  );
}

export async function recordTradingAdjustment(input: {
  type: EditableTradingAdjustmentType;
  amount: Dec;
  note: string;
  adminId: string;
  effectiveAt?: Date;
}) {
  if (input.amount.lte(0)) throw new Error("Enter an amount greater than zero.");
  if (!input.note.trim()) throw new Error("Enter an audit note for this adjustment.");
  const signed = signedAmount(input.type, input.amount);

  const effectiveAt = input.effectiveAt ?? new Date();
  if (Number.isNaN(effectiveAt.getTime())) throw new Error("Choose a valid effective date.");
  if (effectiveAt.getTime() > Date.now() + 60_000) {
    throw new Error("The effective date cannot be in the future.");
  }

  return prisma.$transaction(async (tx) => {
    const [pool, entries] = await Promise.all([
      tx.poolState.upsert({
        where: { id: "pool" },
        update: {},
        create: { id: "pool" },
      }),
      tx.tradingAccountEntry.findMany({
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
    ]);

    const insertionIndex = entries.findIndex(
      (entry) => entry.createdAt.getTime() > effectiveAt.getTime(),
    );
    const laterEntries =
      insertionIndex < 0 ? [] : entries.slice(insertionIndex);
    const balanceBefore =
      insertionIndex < 0
        ? D(pool.tradingBalance)
        : D(entries[insertionIndex].balanceBefore);
    const entryBalanceAfter = balanceBefore.add(signed);
    if (entryBalanceAfter.lt(0)) {
      throw new Error("This adjustment would make the trading account negative on the selected date.");
    }
    for (const entry of laterEntries) {
      if (
        D(entry.balanceBefore).add(signed).lt(0) ||
        D(entry.balanceAfter).add(signed).lt(0) ||
        D(entry.equityBefore).add(signed).lt(0) ||
        D(entry.equityAfter).add(signed).lt(0)
      ) {
        throw new Error("This adjustment would make a later account balance negative.");
      }
    }

    await tx.tradingAccountEntry.create({
      data: {
        type: input.type,
        amount: signed,
        balanceBefore,
        balanceAfter: entryBalanceAfter,
        equityBefore: balanceBefore,
        equityAfter: entryBalanceAfter,
        note: input.note.trim(),
        adminId: input.adminId,
        createdAt: effectiveAt,
      },
    });

    for (const entry of laterEntries) {
      await tx.tradingAccountEntry.update({
        where: { id: entry.id },
        data: {
          balanceBefore: D(entry.balanceBefore).add(signed),
          balanceAfter: D(entry.balanceAfter).add(signed),
          equityBefore: D(entry.equityBefore).add(signed),
          equityAfter: D(entry.equityAfter).add(signed),
        },
      });
    }

    const finalBalance = D(pool.tradingBalance).add(signed);
    const totalUnits = D(pool.totalUnits);
    const nav =
      totalUnits.gt(0) && finalBalance.gt(0)
        ? finalBalance.div(totalUnits)
        : D(pool.lastNav);
    const after = await tx.poolState.update({
      where: { id: "pool" },
      data: {
        tradingBalance: finalBalance,
        tradingEquity: finalBalance,
        lastNav: nav,
      },
    });

    const effectiveDay = snapshotDayKey(effectiveAt);
    const snapshots = await tx.navSnapshot.findMany({
      where: { day: { gte: effectiveDay } },
    });
    for (const snapshot of snapshots) {
      const equity = D(snapshot.equity).add(signed);
      const snapshotUnits = D(snapshot.totalUnits);
      await tx.navSnapshot.update({
        where: { day: snapshot.day },
        data: {
          equity,
          nav:
            snapshotUnits.gt(0) && equity.gt(0)
              ? equity.div(snapshotUnits)
              : snapshot.nav,
        },
      });
    }
    await tx.navSnapshot.upsert({
      where: { day: snapshotDayKey() },
      update: { nav, equity: finalBalance, totalUnits },
      create: { day: snapshotDayKey(), nav, equity: finalBalance, totalUnits },
    });
    return after;
  });
}

async function reviseTradingAdjustment(input: {
  id: string;
  replacement?: {
    type: EditableTradingAdjustmentType;
    amount: Dec;
    note: string;
  };
  adminId: string;
}) {
  if (!input.id) throw new Error("Choose an audit entry.");
  if (input.replacement) {
    if (input.replacement.amount.lte(0)) {
      throw new Error("Enter an amount greater than zero.");
    }
    if (!input.replacement.note.trim()) {
      throw new Error("Enter an audit note for this adjustment.");
    }
  }

  return prisma.$transaction(async (tx) => {
    const [pool, entries] = await Promise.all([
      tx.poolState.upsert({
        where: { id: "pool" },
        update: {},
        create: { id: "pool" },
      }),
      tx.tradingAccountEntry.findMany({
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
    ]);

    const targetIndex = entries.findIndex((entry) => entry.id === input.id);
    if (targetIndex < 0) throw new Error("This audit entry no longer exists.");
    const target = entries[targetIndex];
    if (isProtectedManualEntry(target.type, target.note)) {
      throw new Error(
        "This entry belongs to a verified account workflow and cannot be changed here.",
      );
    }

    const replacementAmount = input.replacement
      ? signedAmount(input.replacement.type, input.replacement.amount)
      : D(0);
    const delta = replacementAmount.sub(target.amount);
    const finalBalance = D(pool.tradingBalance).add(delta);
    if (finalBalance.lt(0)) {
      throw new Error("This change would make the trading account negative.");
    }

    if (input.replacement) {
      await tx.tradingAccountEntry.update({
        where: { id: target.id },
        data: {
          type: input.replacement.type,
          amount: replacementAmount,
          balanceAfter: D(target.balanceAfter).add(delta),
          equityAfter: D(target.equityAfter).add(delta),
          note: input.replacement.note.trim(),
          adminId: input.adminId,
        },
      });
    } else {
      await tx.tradingAccountEntry.delete({ where: { id: target.id } });
    }

    for (const entry of entries.slice(targetIndex + 1)) {
      const balanceBefore = D(entry.balanceBefore).add(delta);
      const balanceAfter = D(entry.balanceAfter).add(delta);
      const equityBefore = D(entry.equityBefore).add(delta);
      const equityAfter = D(entry.equityAfter).add(delta);
      if (
        balanceBefore.lt(0) ||
        balanceAfter.lt(0) ||
        equityBefore.lt(0) ||
        equityAfter.lt(0)
      ) {
        throw new Error(
          "This change would make a later account balance negative.",
        );
      }
      await tx.tradingAccountEntry.update({
        where: { id: entry.id },
        data: { balanceBefore, balanceAfter, equityBefore, equityAfter },
      });
    }

    const totalUnits = D(pool.totalUnits);
    const nav =
      totalUnits.gt(0) && finalBalance.gt(0)
        ? finalBalance.div(totalUnits)
        : D(pool.lastNav);
    await tx.poolState.update({
      where: { id: "pool" },
      data: {
        tradingBalance: finalBalance,
        tradingEquity: finalBalance,
        lastNav: nav,
      },
    });

    const snapshots = await tx.navSnapshot.findMany({
      where: { day: { gte: snapshotDayKey(target.createdAt) } },
      orderBy: { day: "asc" },
    });
    for (const snapshot of snapshots) {
      const equity = D(snapshot.equity).add(delta);
      if (equity.lt(0)) {
        throw new Error("This change would make a historical balance negative.");
      }
      const snapshotUnits = D(snapshot.totalUnits);
      await tx.navSnapshot.update({
        where: { day: snapshot.day },
        data: {
          equity,
          nav:
            snapshotUnits.gt(0) && equity.gt(0)
              ? equity.div(snapshotUnits)
              : snapshot.nav,
        },
      });
    }

    return { delta, finalBalance };
  });
}

export function editTradingAdjustment(input: {
  id: string;
  type: EditableTradingAdjustmentType;
  amount: Dec;
  note: string;
  adminId: string;
}) {
  return reviseTradingAdjustment({
    id: input.id,
    replacement: {
      type: input.type,
      amount: input.amount,
      note: input.note,
    },
    adminId: input.adminId,
  });
}

export function deleteTradingAdjustment(input: {
  id: string;
  adminId: string;
}) {
  return reviseTradingAdjustment(input);
}
