import "server-only";

import { prisma } from "@/lib/prisma";
import { D, ZERO, type Dec } from "@/lib/money";
import { utcDayKey } from "@/lib/nav";

function requiredReason(reason: string) {
  const clean = reason.trim();
  if (!clean) throw new Error("Enter a reason for this administrative change");
  if (clean.length > 500) throw new Error("The reason must be 500 characters or fewer");
  return clean;
}

function validateTotal(value: Dec, label: string) {
  if (value.lte(0)) throw new Error(label + " must be positive");
  if (!value.eq(value.toDecimalPlaces(8))) {
    throw new Error(label + " can have at most 8 decimal places");
  }
}

export async function editDepositAllocationBatch(
  batchId: string,
  newTotalUsdt: Dec,
  adminId: string,
  reason: string,
) {
  const cleanReason = requiredReason(reason);
  validateTotal(newTotalUsdt, "The corrected conversion total");

  return prisma.$transaction(async (tx) => {
    const batch = await tx.depositAllocationBatch.findUnique({
      where: { id: batchId },
      include: { deposits: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] } },
    });
    if (!batch) throw new Error("This conversion batch no longer exists");
    if (batch.deposits.length === 0) throw new Error("This conversion batch has no deposits");

    const previousTotal = D(batch.totalUsdt);
    if (newTotalUsdt.eq(previousTotal)) throw new Error("Enter a different conversion total");

    const sourceAmounts = batch.deposits.map((deposit) => D(deposit.inrAmount ?? 0));
    if (sourceAmounts.some((amount) => amount.lte(0))) {
      throw new Error("One or more source INR amounts are invalid");
    }
    const totalSource = sourceAmounts.reduce((sum, amount) => sum.add(amount), ZERO);
    let remaining = newTotalUsdt;
    const changes = batch.deposits.map((deposit, index) => {
      const next = index === batch.deposits.length - 1
        ? remaining
        : newTotalUsdt.mul(sourceAmounts[index]).div(totalSource).toDecimalPlaces(8);
      remaining = remaining.sub(next);
      if (next.lte(0)) throw new Error("The corrected total is too small for every deposit");
      const previous = D(deposit.queuedUsdtAmount ?? 0);
      if (previous.lte(0)) throw new Error("One or more conversion allocations are invalid");
      if (deposit.status !== "QUEUED" && deposit.status !== "CONFIRMED") {
        throw new Error("This batch contains a deposit that can no longer be corrected safely");
      }
      if (deposit.status === "CONFIRMED" && (!deposit.brokerTransferBatchId || next.lt(deposit.amount))) {
        throw new Error("A corrected conversion cannot be lower than USDT already received by the broker");
      }
      return { deposit, previous, next, delta: next.sub(previous) };
    });

    const brokerDeltas = new Map<string, Dec>();
    for (const change of changes) {
      if (change.deposit.brokerTransferBatchId) {
        const id = change.deposit.brokerTransferBatchId;
        brokerDeltas.set(id, (brokerDeltas.get(id) ?? ZERO).add(change.delta));
      }
    }
    for (const [id, delta] of brokerDeltas) {
      const brokerBatch = await tx.brokerTransferBatch.findUniqueOrThrow({ where: { id } });
      const correctedQueued = D(brokerBatch.totalQueuedUsdt).add(delta);
      if (correctedQueued.lt(brokerBatch.totalReceivedUsdt)) {
        throw new Error("The correction would make a broker batch fee negative");
      }
      await tx.brokerTransferBatch.update({
        where: { id },
        data: { totalQueuedUsdt: correctedQueued },
      });
    }

    for (const { deposit, previous, next, delta } of changes) {
      await tx.deposit.update({ where: { id: deposit.id }, data: { queuedUsdtAmount: next } });
      if (deposit.status === "QUEUED") {
        const wallet = await tx.wallet.findUnique({ where: { userId: deposit.userId } });
        if (!wallet || D(wallet.queued).add(delta).lt(0)) {
          throw new Error("An investor queue no longer matches this conversion");
        }
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { queued: { increment: delta } },
        });
      } else {
        const fee = next.sub(deposit.amount);
        const feeNote = "Broker transfer fee (batch " + deposit.brokerTransferBatchId + ")";
        const feeEntry = await tx.ledgerEntry.findFirst({
          where: { userId: deposit.userId, reference: deposit.id, type: "FEE", note: feeNote },
        });
        if (fee.eq(0) && feeEntry) {
          await tx.ledgerEntry.delete({ where: { id: feeEntry.id } });
        } else if (fee.gt(0) && feeEntry) {
          await tx.ledgerEntry.update({ where: { id: feeEntry.id }, data: { amount: fee.neg() } });
        } else if (fee.gt(0)) {
          await tx.ledgerEntry.create({
            data: { userId: deposit.userId, type: "FEE", amount: fee.neg(), reference: deposit.id, note: feeNote },
          });
        }
      }

      await tx.ledgerEntry.create({
        data: {
          userId: deposit.userId,
          type: "DEPOSIT",
          amount: delta,
          reference: deposit.id,
          note: "INR-to-USDT batch corrected by admin: " + cleanReason,
        },
      });
      await tx.financialOperationAudit.create({
        data: {
          adminId,
          userId: deposit.userId,
          sourceType: "DEPOSIT",
          sourceId: deposit.id,
          action: "CONVERSION_BATCH_EDITED",
          beforeState: previous.toFixed(8),
          afterState: next.toFixed(8),
          reason: cleanReason,
        },
      });
      await tx.accountNotification.create({
        data: {
          userId: deposit.userId,
          kind: "UPDATE",
          title: "Deposit conversion updated",
          message: cleanReason,
          href: "/app/history",
          actionLabel: "View deposit",
          sourceType: "DEPOSIT",
          sourceId: deposit.id,
          eventCode: "DEPOSIT_CONVERSION_BATCH_EDITED",
        },
      });
    }

    await tx.depositAllocationBatch.update({
      where: { id: batch.id },
      data: { totalUsdt: newTotalUsdt, adminId },
    });
    return { previousTotal, newTotalUsdt };
  });
}

export async function editBrokerTransferBatch(
  batchId: string,
  newTotalReceivedUsdt: Dec,
  adminId: string,
  reason: string,
) {
  const cleanReason = requiredReason(reason);
  validateTotal(newTotalReceivedUsdt, "The corrected broker total");

  return prisma.$transaction(async (tx) => {
    const batch = await tx.brokerTransferBatch.findUnique({
      where: { id: batchId },
      include: { deposits: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] } },
    });
    if (!batch) throw new Error("This broker transfer batch no longer exists");
    if (batch.deposits.length === 0) throw new Error("This broker transfer batch has no deposits");
    if (newTotalReceivedUsdt.gt(batch.totalQueuedUsdt)) {
      throw new Error("Broker-received USDT cannot exceed the queued USDT");
    }

    const previousTotal = D(batch.totalReceivedUsdt);
    if (newTotalReceivedUsdt.eq(previousTotal)) throw new Error("Enter a different broker total");
    if (batch.deposits.some((deposit) => deposit.status !== "CONFIRMED" || deposit.brokerTransferBatchId !== batch.id)) {
      throw new Error("This broker batch contains a deposit that cannot be corrected safely");
    }

    const queuedAmounts = batch.deposits.map((deposit) => D(deposit.queuedUsdtAmount ?? 0));
    if (queuedAmounts.some((amount) => amount.lte(0))) throw new Error("One or more queued amounts are invalid");
    const totalQueued = queuedAmounts.reduce((sum, amount) => sum.add(amount), ZERO);
    let remaining = newTotalReceivedUsdt;
    let totalUnitDelta = ZERO;

    for (let index = 0; index < batch.deposits.length; index += 1) {
      const deposit = batch.deposits[index];
      const queued = queuedAmounts[index];
      const next = index === batch.deposits.length - 1
        ? remaining
        : newTotalReceivedUsdt.mul(queued).div(totalQueued).toDecimalPlaces(8);
      remaining = remaining.sub(next);
      if (next.lte(0)) throw new Error("The corrected total is too small for every deposit");

      const previous = D(deposit.amount);
      const previousUnits = previous.div(batch.navPrice);
      const nextUnits = next.div(batch.navPrice);
      const unitDelta = nextUnits.sub(previousUnits);
      totalUnitDelta = totalUnitDelta.add(unitDelta);

      const wallet = await tx.wallet.findUnique({ where: { userId: deposit.userId } });
      if (!wallet || D(wallet.units).add(unitDelta).lt(0)) {
        throw new Error("An investor unit balance no longer matches this broker batch");
      }
      await tx.wallet.update({ where: { id: wallet.id }, data: { units: { increment: unitDelta } } });
      await tx.deposit.update({ where: { id: deposit.id }, data: { amount: next } });

      const investNote = "Weekend broker transfer (batch " + batch.id + ")";
      const investEntry = await tx.ledgerEntry.findFirst({
        where: { userId: deposit.userId, reference: deposit.id, type: "INVEST", note: investNote },
      });
      if (!investEntry) throw new Error("The original broker investment ledger entry is missing");
      await tx.ledgerEntry.update({
        where: { id: investEntry.id },
        data: { amount: next, units: nextUnits },
      });

      const fee = queued.sub(next);
      const feeNote = "Broker transfer fee (batch " + batch.id + ")";
      const feeEntry = await tx.ledgerEntry.findFirst({
        where: { userId: deposit.userId, reference: deposit.id, type: "FEE", note: feeNote },
      });
      if (fee.eq(0) && feeEntry) {
        await tx.ledgerEntry.delete({ where: { id: feeEntry.id } });
      } else if (fee.gt(0) && feeEntry) {
        await tx.ledgerEntry.update({ where: { id: feeEntry.id }, data: { amount: fee.neg() } });
      } else if (fee.gt(0)) {
        await tx.ledgerEntry.create({
          data: { userId: deposit.userId, type: "FEE", amount: fee.neg(), reference: deposit.id, note: feeNote },
        });
      }

      await tx.financialOperationAudit.create({
        data: {
          adminId,
          userId: deposit.userId,
          sourceType: "DEPOSIT",
          sourceId: deposit.id,
          action: "BROKER_TRANSFER_BATCH_EDITED",
          beforeState: previous.toFixed(8),
          afterState: next.toFixed(8),
          reason: cleanReason,
        },
      });
      await tx.accountNotification.create({
        data: {
          userId: deposit.userId,
          kind: "UPDATE",
          title: "Invested deposit updated",
          message: cleanReason,
          href: "/app/history",
          actionLabel: "View deposit",
          sourceType: "DEPOSIT",
          sourceId: deposit.id,
          eventCode: "BROKER_TRANSFER_BATCH_EDITED",
        },
      });
    }

    const delta = newTotalReceivedUsdt.sub(previousTotal);
    const pool = await tx.poolState.upsert({ where: { id: "pool" }, update: {}, create: { id: "pool" } });
    const finalBalance = D(pool.tradingBalance).add(delta);
    const finalUnits = D(pool.totalUnits).add(totalUnitDelta);
    if (finalBalance.lt(0) || finalUnits.lt(0)) throw new Error("This correction would make the pool negative");
    const finalNav = finalUnits.gt(0) && finalBalance.gt(0) ? finalBalance.div(finalUnits) : D(pool.lastNav);

    const entries = await tx.tradingAccountEntry.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
    const targetIndex = entries.findIndex((entry) => entry.type === "USER_DEPOSIT" && entry.note === "Broker deposit batch " + batch.id);
    if (targetIndex < 0) throw new Error("The broker batch account entry is missing");
    const target = entries[targetIndex];
    await tx.tradingAccountEntry.update({
      where: { id: target.id },
      data: {
        amount: newTotalReceivedUsdt,
        balanceAfter: D(target.balanceAfter).add(delta),
        equityAfter: D(target.equityAfter).add(delta),
        adminId,
      },
    });
    for (const entry of entries.slice(targetIndex + 1)) {
      const balanceBefore = D(entry.balanceBefore).add(delta);
      const balanceAfter = D(entry.balanceAfter).add(delta);
      if (balanceBefore.lt(0) || balanceAfter.lt(0)) {
        throw new Error("This correction would make a later account balance negative");
      }
      await tx.tradingAccountEntry.update({
        where: { id: entry.id },
        data: {
          balanceBefore,
          balanceAfter,
          equityBefore: D(entry.equityBefore).add(delta),
          equityAfter: D(entry.equityAfter).add(delta),
        },
      });
    }

    await tx.poolState.update({
      where: { id: "pool" },
      data: { tradingBalance: finalBalance, tradingEquity: finalBalance, totalUnits: finalUnits, lastNav: finalNav },
    });
    await tx.brokerTransferBatch.update({
      where: { id: batch.id },
      data: { totalReceivedUsdt: newTotalReceivedUsdt, adminId },
    });

    const snapshots = await tx.navSnapshot.findMany({
      where: { day: { gte: utcDayKey(batch.createdAt) } },
      orderBy: { day: "asc" },
    });
    for (const snapshot of snapshots) {
      const equity = D(snapshot.equity).add(delta);
      const units = D(snapshot.totalUnits).add(totalUnitDelta);
      if (equity.lt(0) || units.lt(0)) throw new Error("This correction would invalidate historical NAV data");
      await tx.navSnapshot.update({
        where: { day: snapshot.day },
        data: { equity, totalUnits: units, nav: units.gt(0) && equity.gt(0) ? equity.div(units) : snapshot.nav },
      });
    }

    return { previousTotal, newTotalReceivedUsdt };
  });
}
