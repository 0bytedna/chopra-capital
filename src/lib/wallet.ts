// Every balance mutation goes through this module. Each operation updates the
// wallet/pool AND writes append-only LedgerEntry rows inside one transaction,
// so the books always balance and history can be reconstructed exactly.

import "server-only";
import { prisma } from "@/lib/prisma";
import { D, ZERO, type Dec } from "@/lib/money";
import { getCurrentNav, getSettingDecimal, upsertDailySnapshot } from "@/lib/nav";
import { withdrawalProcessingWindowMessage, withdrawalsProcessableNow } from "@/lib/config";

export async function ensureWallet(userId: string) {
  return prisma.wallet.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

/** Admin confirms a pending deposit: credit queued, write DEPOSIT entry. */
export async function confirmDeposit(depositId: string, landedAmount: Dec, adminNote?: string) {
  return prisma.$transaction(async (tx) => {
    const deposit = await tx.deposit.findUniqueOrThrow({ where: { id: depositId } });
    if (deposit.status !== "PENDING") throw new Error("Deposit is not pending");
    if (landedAmount.lte(0)) throw new Error("Landed amount must be positive");

    const methodLabel =
      deposit.method === "CRYPTO"
        ? deposit.network ?? "Crypto"
        : deposit.method === "BANK"
          ? "Bank transfer"
          : "Cash";

    await tx.deposit.update({
      where: { id: depositId },
      data: {
        status: "CONFIRMED",
        amount: landedAmount,
        adminNote: adminNote || null,
        confirmedAt: new Date(),
      },
    });
    await tx.wallet.upsert({
      where: { userId: deposit.userId },
      update: { queued: { increment: landedAmount } },
      create: { userId: deposit.userId, queued: landedAmount },
    });
    await tx.ledgerEntry.create({
      data: {
        userId: deposit.userId,
        type: "DEPOSIT",
        amount: landedAmount,
        reference: deposit.id,
        note: `Deposit confirmed (${methodLabel})`,
      },
    });
  });
}

export async function rejectDeposit(depositId: string, adminNote?: string) {
  const deposit = await prisma.deposit.findUniqueOrThrow({ where: { id: depositId } });
  if (deposit.status !== "PENDING") throw new Error("Deposit is not pending");
  await prisma.deposit.update({
    where: { id: depositId },
    data: { status: "REJECTED", adminNote: adminNote || null },
  });
}

/**
 * Weekly invest run: convert every queued balance into pool units at the
 * current NAV. An optional invest fee (Setting INVEST_FEE_PERCENT, default 0)
 * is taken from the queued amount first.
 */
export async function runWeeklyInvest(): Promise<{ invested: Dec; investors: number; nav: Dec }> {
  const { nav } = await getCurrentNav();
  const feePercent = await getSettingDecimal("INVEST_FEE_PERCENT", "0");

  return prisma.$transaction(async (tx) => {
    const wallets = await tx.wallet.findMany({ where: { queued: { gt: 0 } } });
    let investedTotal = ZERO;
    let unitsIssued = ZERO;

    for (const wallet of wallets) {
      const queued = D(wallet.queued);
      const fee = queued.mul(feePercent).div(100);
      const net = queued.sub(fee);
      if (net.lte(0)) continue;
      const units = net.div(nav);

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { queued: ZERO, units: { increment: units } },
      });
      if (fee.gt(0)) {
        await tx.ledgerEntry.create({
          data: {
            userId: wallet.userId,
            type: "FEE",
            amount: fee.neg(),
            note: `Invest fee (${feePercent.toString()}%)`,
          },
        });
      }
      await tx.ledgerEntry.create({
        data: {
          userId: wallet.userId,
          type: "INVEST",
          amount: net,
          units,
          navPrice: nav,
          note: "Weekly invest run",
        },
      });
      investedTotal = investedTotal.add(net);
      unitsIssued = unitsIssued.add(units);
    }

    const pool = await tx.poolState.upsert({
      where: { id: "pool" },
      update: { totalUnits: { increment: unitsIssued }, lastNav: nav },
      create: { id: "pool", totalUnits: unitsIssued, lastNav: nav },
    });

    // Keep today's snapshot in sync so charts pick up the new pool size.
    const equity = D(pool.totalUnits).mul(nav);
    const day = new Date().toISOString().slice(0, 10);
    await tx.navSnapshot.upsert({
      where: { day },
      update: { nav, totalUnits: pool.totalUnits },
      create: { day, nav, equity, totalUnits: pool.totalUnits },
    });

    return { invested: investedTotal, investors: wallets.length, nav };
  });
}

/** Admin approves a withdrawal and fixes the fee that will be deducted. */
export async function approveWithdrawal(withdrawalId: string, fee: Dec, adminNote?: string) {
  const wd = await prisma.withdrawal.findUniqueOrThrow({ where: { id: withdrawalId } });
  if (wd.status !== "REQUESTED") throw new Error("Withdrawal is not awaiting approval");
  if (fee.lt(0)) throw new Error("Fee cannot be negative");
  if (fee.gte(D(wd.amount))) throw new Error("Fee cannot exceed the requested amount");
  await prisma.withdrawal.update({
    where: { id: withdrawalId },
    data: { status: "APPROVED", fee, adminNote: adminNote || null },
  });
}

/**
 * Settle an approved withdrawal. The full requested amount leaves the
 * investor's holdings — queued balance first, then units redeemed at the
 * current NAV. The investor receives amount − fee.
 */
export async function processWithdrawal(withdrawalId: string, txHash?: string) {
  if (!withdrawalsProcessableNow()) throw new Error(withdrawalProcessingWindowMessage());
  const { nav } = await getCurrentNav();

  return prisma.$transaction(async (tx) => {
    const wd = await tx.withdrawal.findUniqueOrThrow({ where: { id: withdrawalId } });
    if (wd.status !== "APPROVED") throw new Error("Withdrawal must be approved first");

    const wallet = await tx.wallet.findUnique({ where: { userId: wd.userId } });
    if (!wallet) throw new Error("Investor has no wallet");

    const gross = D(wd.amount);
    const fee = D(wd.fee ?? 0);
    const payout = gross.sub(fee);
    if (payout.lte(0)) throw new Error("Payout must be positive");

    const queued = D(wallet.queued);
    const units = D(wallet.units);
    const holdings = queued.add(units.mul(nav));
    if (gross.gt(holdings.add(D("0.01")))) {
      throw new Error("Insufficient balance to settle this withdrawal at current NAV");
    }

    // Draw from queued first, then redeem units. Fee is drawn before payout
    // so each ledger entry maps to exactly one source.
    const queuedDraw = queued.lt(gross) ? queued : gross;
    const feeFromQueued = fee.lt(queuedDraw) ? fee : queuedDraw;
    const payoutFromQueued = queuedDraw.sub(feeFromQueued);
    const remaining = gross.sub(queuedDraw);
    const unitsRedeemed = remaining.gt(0) ? remaining.div(nav) : ZERO;
    const feeFromUnits = fee.sub(feeFromQueued);
    const payoutFromUnits = remaining.sub(feeFromUnits);

    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        queued: queued.sub(queuedDraw),
        units: units.sub(unitsRedeemed),
      },
    });
    if (unitsRedeemed.gt(0)) {
      await tx.poolState.update({
        where: { id: "pool" },
        data: { totalUnits: { decrement: unitsRedeemed }, lastNav: nav },
      });
    }

    if (feeFromQueued.gt(0)) {
      await tx.ledgerEntry.create({
        data: {
          userId: wd.userId,
          type: "FEE",
          amount: feeFromQueued.neg(),
          reference: wd.id,
          note: "Withdrawal fee",
        },
      });
    }
    if (feeFromUnits.gt(0)) {
      await tx.ledgerEntry.create({
        data: {
          userId: wd.userId,
          type: "FEE",
          amount: feeFromUnits.neg(),
          units: feeFromUnits.div(nav).neg(),
          navPrice: nav,
          reference: wd.id,
          note: "Withdrawal fee",
        },
      });
    }
    if (payoutFromQueued.gt(0)) {
      await tx.ledgerEntry.create({
        data: {
          userId: wd.userId,
          type: "WITHDRAWAL",
          amount: payoutFromQueued.neg(),
          reference: wd.id,
          note: `Withdrawal paid (${wd.network})`,
        },
      });
    }
    if (payoutFromUnits.gt(0)) {
      await tx.ledgerEntry.create({
        data: {
          userId: wd.userId,
          type: "WITHDRAWAL",
          amount: payoutFromUnits.neg(),
          units: payoutFromUnits.div(nav).neg(),
          navPrice: nav,
          reference: wd.id,
          note: `Withdrawal paid (${wd.network})`,
        },
      });
    }

    await tx.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: "PROCESSED",
        paidAmount: payout,
        unitsRedeemed,
        txHash: txHash || wd.txHash,
        processedAt: new Date(),
      },
    });

    return { payout, unitsRedeemed };
  });
}

export async function rejectWithdrawal(withdrawalId: string, adminNote?: string) {
  const wd = await prisma.withdrawal.findUniqueOrThrow({ where: { id: withdrawalId } });
  if (wd.status === "PROCESSED") throw new Error("Withdrawal already processed");
  await prisma.withdrawal.update({
    where: { id: withdrawalId },
    data: { status: "REJECTED", adminNote: adminNote || null },
  });
}

export { upsertDailySnapshot };
