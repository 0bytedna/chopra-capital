// Every balance mutation goes through this module. Each operation updates the
// wallet/pool AND writes append-only LedgerEntry rows inside one transaction,
// so the books always balance and history can be reconstructed exactly.

import "server-only";
import { randomUUID } from "node:crypto";
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

export async function createInternalTransfer({
  fromUserId,
  toUserId,
  adminId,
  amount,
  note,
}: {
  fromUserId: string;
  toUserId: string;
  adminId: string;
  amount: Dec;
  note?: string;
}) {
  if (!fromUserId || !toUserId) throw new Error("Choose both investor accounts");
  if (fromUserId === toUserId) throw new Error("Choose two different investor accounts");
  if (amount.lte(0)) throw new Error("Transfer amount must be greater than zero");
  if (!amount.eq(amount.toDecimalPlaces(8))) {
    throw new Error("Transfer amount can have at most 8 decimal places");
  }

  const cleanNote = note?.trim() || null;
  if (cleanNote && cleanNote.length > 500) {
    throw new Error("Transfer note must be 500 characters or fewer");
  }

  const { nav } = await getCurrentNav();
  if (nav.lte(0)) throw new Error("A positive NAV is required before transferring invested funds");

  return prisma.$transaction(async (tx) => {
    const investors = await tx.user.findMany({
      where: { id: { in: [fromUserId, toUserId] }, role: "USER" },
      select: { id: true, fullName: true, email: true },
    });
    if (investors.length !== 2) throw new Error("One or both investor accounts could not be found");

    const fromInvestor = investors.find((investor) => investor.id === fromUserId);
    const toInvestor = investors.find((investor) => investor.id === toUserId);
    if (!fromInvestor || !toInvestor) throw new Error("Choose valid investor accounts");

    const [fromWallet, toWallet] = await Promise.all([
      tx.wallet.upsert({
        where: { userId: fromUserId },
        update: {},
        create: { userId: fromUserId },
      }),
      tx.wallet.upsert({
        where: { userId: toUserId },
        update: {},
        create: { userId: toUserId },
      }),
    ]);

    const sourceQueued = D(fromWallet.queued);
    const sourceUnits = D(fromWallet.units);
    const sourceValue = sourceQueued.add(sourceUnits.mul(nav));
    if (amount.gt(sourceValue)) {
      throw new Error(
        `Transfer exceeds the source account balance of ${sourceValue.toFixed(2)} USD`,
      );
    }

    const queuedAmount = sourceQueued.lt(amount) ? sourceQueued : amount;
    const investedAmount = amount.sub(queuedAmount);
    const units = investedAmount.gt(0) ? investedAmount.div(nav) : ZERO;
    if (units.gt(sourceUnits)) throw new Error("The source account has insufficient invested units");

    await tx.wallet.update({
      where: { id: fromWallet.id },
      data: {
        queued: sourceQueued.sub(queuedAmount),
        units: sourceUnits.sub(units),
      },
    });
    await tx.wallet.update({
      where: { id: toWallet.id },
      data: {
        queued: D(toWallet.queued).add(queuedAmount),
        units: D(toWallet.units).add(units),
      },
    });

    const transferId = randomUUID();
    const transfer = await tx.internalTransfer.create({
      data: {
        id: transferId,
        fromUserId,
        toUserId,
        adminId,
        amount,
        queuedAmount,
        investedAmount,
        units,
        navPrice: nav,
        note: cleanNote,
      },
    });

    const ledgerBaseTime = Date.now();
    let ledgerSequence = 0;
    const sourceName = fromInvestor.fullName ?? fromInvestor.email;
    const recipientName = toInvestor.fullName ?? toInvestor.email;

    if (queuedAmount.gt(0)) {
      await tx.ledgerEntry.create({
        data: {
          userId: fromUserId,
          type: "ADJUSTMENT",
          amount: queuedAmount.neg(),
          reference: transferId,
          note: `Internal transfer to ${recipientName} (queued funds)`,
          createdAt: new Date(ledgerBaseTime + ledgerSequence++),
        },
      });
      await tx.ledgerEntry.create({
        data: {
          userId: toUserId,
          type: "ADJUSTMENT",
          amount: queuedAmount,
          reference: transferId,
          note: `Internal transfer from ${sourceName} (queued funds)`,
          createdAt: new Date(ledgerBaseTime + ledgerSequence++),
        },
      });
    }

    if (investedAmount.gt(0)) {
      await tx.ledgerEntry.create({
        data: {
          userId: fromUserId,
          type: "ADJUSTMENT",
          amount: investedAmount.neg(),
          units: units.neg(),
          navPrice: nav,
          reference: transferId,
          note: `Internal transfer to ${recipientName} (invested units)`,
          createdAt: new Date(ledgerBaseTime + ledgerSequence++),
        },
      });
      await tx.ledgerEntry.create({
        data: {
          userId: toUserId,
          type: "ADJUSTMENT",
          amount: investedAmount,
          units,
          navPrice: nav,
          reference: transferId,
          note: `Internal transfer from ${sourceName} (invested units)`,
          createdAt: new Date(ledgerBaseTime + ledgerSequence++),
        },
      });
    }

    return {
      transfer,
      fromInvestor,
      toInvestor,
      sourceBalanceAfter: sourceValue.sub(amount),
    };
  });
}

type DepositMethod = "CRYPTO" | "BANK" | "CASH";

/**
 * Confirm that payment reached the company. Crypto is already USDT, so it can
 * enter the company-wallet queue immediately. INR waits for conversion first.
 */
export async function confirmDepositReceipt(depositId: string, adminNote?: string) {
  return prisma.$transaction(async (tx) => {
    const deposit = await tx.deposit.findUniqueOrThrow({ where: { id: depositId } });
    if (deposit.status !== "PENDING") throw new Error("Deposit is not pending receipt verification");

    const cryptoQueuedAmount =
      deposit.method === "CRYPTO" ? D(deposit.reportedUsdtAmount ?? deposit.amount) : null;
    if (cryptoQueuedAmount && cryptoQueuedAmount.lte(0)) {
      throw new Error("The confirmed crypto amount must be positive");
    }

    const result = await tx.deposit.updateMany({
      where: { id: depositId, status: "PENDING" },
      data: {
        status: deposit.method === "CRYPTO" ? "QUEUED" : "RECEIVED",
        queuedUsdtAmount: cryptoQueuedAmount,
        receivedAt: new Date(),
        adminNote: adminNote || null,
      },
    });
    if (result.count !== 1) throw new Error("Deposit is no longer pending receipt verification");

    if (cryptoQueuedAmount) {
      await tx.wallet.upsert({
        where: { userId: deposit.userId },
        update: { queued: { increment: cryptoQueuedAmount } },
        create: { userId: deposit.userId, queued: cryptoQueuedAmount },
      });
      await tx.ledgerEntry.create({
        data: {
          userId: deposit.userId,
          type: "DEPOSIT",
          amount: cryptoQueuedAmount,
          reference: deposit.id,
          note: `Crypto confirmed in company wallet (${deposit.network ?? "USDT"})`,
        },
      });
    }

    return { method: deposit.method, status: deposit.method === "CRYPTO" ? "QUEUED" : "RECEIVED" };
  });
}

/**
 * Convert a group of received INR deposits into USDT in the company wallet.
 * Each share is proportional to the original INR amount and enters QUEUED.
 */
export async function allocateDepositBatch(
  method: DepositMethod,
  depositIds: string[],
  totalUsdt: Dec,
  adminId: string,
) {
  const uniqueIds = [...new Set(depositIds.filter(Boolean))];
  if (uniqueIds.length === 0) throw new Error("Select at least one verified deposit");
  if (method === "CRYPTO") throw new Error("Confirmed crypto deposits enter the queue automatically");
  if (totalUsdt.lte(0)) throw new Error("Total USDT received must be positive");
  if (!totalUsdt.eq(totalUsdt.toDecimalPlaces(8))) {
    throw new Error("Total USDT received can have at most 8 decimal places");
  }

  return prisma.$transaction(async (tx) => {
    const deposits = await tx.deposit.findMany({
      where: { id: { in: uniqueIds } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });

    if (deposits.length !== uniqueIds.length) throw new Error("One or more selected deposits were not found");
    if (deposits.some((deposit) => deposit.method !== method)) {
      throw new Error("All selected deposits must use the same method");
    }
    if (deposits.some((deposit) => deposit.status !== "RECEIVED" || deposit.allocationBatchId)) {
      throw new Error("One or more selected INR deposits are no longer ready for conversion");
    }

    const sourceAmounts = deposits.map((deposit) => D(deposit.inrAmount ?? 0));
    if (sourceAmounts.some((amount) => amount.lte(0))) {
      throw new Error("Every selected deposit must have a positive source amount");
    }
    const totalSourceAmount = sourceAmounts.reduce((sum, amount) => sum.add(amount), ZERO);

    const batch = await tx.depositAllocationBatch.create({
      data: { method, totalSourceAmount, totalUsdt, adminId },
    });

    let remaining = totalUsdt;
    const allocations: { depositId: string; userId: string; amount: Dec }[] = [];

    for (let index = 0; index < deposits.length; index += 1) {
      const deposit = deposits[index];
      const isLast = index === deposits.length - 1;
      const allocated = isLast
        ? remaining
        : totalUsdt.mul(sourceAmounts[index]).div(totalSourceAmount).toDecimalPlaces(8);
      if (allocated.lte(0)) throw new Error("The total is too small to allocate across all selected deposits");
      remaining = remaining.sub(allocated);

      const result = await tx.deposit.updateMany({
        where: {
          id: deposit.id,
          method,
          status: "RECEIVED",
          allocationBatchId: null,
        },
        data: {
          status: "QUEUED",
          queuedUsdtAmount: allocated,
          allocationBatchId: batch.id,
        },
      });
      if (result.count !== 1) throw new Error("A selected deposit changed while the batch was being allocated");

      await tx.wallet.upsert({
        where: { userId: deposit.userId },
        update: { queued: { increment: allocated } },
        create: { userId: deposit.userId, queued: allocated },
      });
      await tx.ledgerEntry.create({
        data: {
          userId: deposit.userId,
          type: "DEPOSIT",
          amount: allocated,
          reference: deposit.id,
          note: `INR converted to USDT in company wallet (${method.toLowerCase()}, batch ${batch.id})`,
        },
      });
      allocations.push({ depositId: deposit.id, userId: deposit.userId, amount: allocated });
    }

    return { batchId: batch.id, totalSourceAmount, totalUsdt, allocations };
  });
}

/**
 * Transfer selected company-wallet queue deposits to the broker and invest the
 * net USDT received after transfer fees at the pre-transfer NAV.
 */
export async function investQueuedDepositBatch(
  depositIds: string[],
  totalReceivedUsdt: Dec,
  adminId: string,
) {
  const uniqueIds = [...new Set(depositIds.filter(Boolean))];
  if (uniqueIds.length === 0) throw new Error("Select at least one queued deposit");
  if (totalReceivedUsdt.lte(0)) throw new Error("USDT received by the broker must be positive");
  if (!totalReceivedUsdt.eq(totalReceivedUsdt.toDecimalPlaces(8))) {
    throw new Error("USDT received by the broker can have at most 8 decimal places");
  }

  const navState = await getCurrentNav();
  let investmentNav = navState.nav;
  if (navState.live && navState.totalUnits.gt(0)) {
    const equityBeforeTransfer = navState.equity.sub(totalReceivedUsdt);
    if (equityBeforeTransfer.lte(0)) {
      throw new Error("Trading balance is too low to price this transfer. Update the manual balance first");
    }
    investmentNav = equityBeforeTransfer.div(navState.totalUnits);
  }
  if (investmentNav.lte(0)) throw new Error("A positive NAV is required before investing the queue");

  return prisma.$transaction(async (tx) => {
    const deposits = await tx.deposit.findMany({
      where: { id: { in: uniqueIds } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    if (deposits.length !== uniqueIds.length) throw new Error("One or more selected deposits were not found");
    if (deposits.some((deposit) => deposit.status !== "QUEUED" || deposit.brokerTransferBatchId)) {
      throw new Error("One or more selected deposits are no longer in the company-wallet queue");
    }

    const queuedAmounts = deposits.map((deposit) => D(deposit.queuedUsdtAmount ?? 0));
    if (queuedAmounts.some((amount) => amount.lte(0))) {
      throw new Error("Every selected deposit must have a positive queued USDT amount");
    }
    const totalQueuedUsdt = queuedAmounts.reduce((sum, amount) => sum.add(amount), ZERO);
    if (totalReceivedUsdt.gt(totalQueuedUsdt)) {
      throw new Error("Broker-received USDT cannot exceed the selected company-wallet queue");
    }

    const queuedByUser = new Map<string, Dec>();
    for (let index = 0; index < deposits.length; index += 1) {
      const deposit = deposits[index];
      queuedByUser.set(
        deposit.userId,
        (queuedByUser.get(deposit.userId) ?? ZERO).add(queuedAmounts[index]),
      );
    }
    const wallets = await tx.wallet.findMany({ where: { userId: { in: [...queuedByUser.keys()] } } });
    const walletByUser = new Map(wallets.map((wallet) => [wallet.userId, wallet]));
    for (const [userId, required] of queuedByUser) {
      const wallet = walletByUser.get(userId);
      if (!wallet || D(wallet.queued).lt(required)) {
        throw new Error("A selected user's wallet queue does not match their queued deposits");
      }
    }

    const batch = await tx.brokerTransferBatch.create({
      data: { totalQueuedUsdt, totalReceivedUsdt, navPrice: investmentNav, adminId },
    });

    let remainingReceived = totalReceivedUsdt;
    let unitsIssued = ZERO;
    let ledgerSequence = 0;
    const ledgerBaseTime = Date.now();
    const allocations: {
      depositId: string;
      userId: string;
      queued: Dec;
      received: Dec;
      fee: Dec;
      units: Dec;
    }[] = [];

    for (let index = 0; index < deposits.length; index += 1) {
      const deposit = deposits[index];
      const queued = queuedAmounts[index];
      const isLast = index === deposits.length - 1;
      const received = isLast
        ? remainingReceived
        : totalReceivedUsdt.mul(queued).div(totalQueuedUsdt).toDecimalPlaces(8);
      if (received.lte(0)) throw new Error("The broker amount is too small for every selected deposit");
      remainingReceived = remainingReceived.sub(received);

      const transferFee = queued.sub(received);
      const units = received.div(investmentNav);
      unitsIssued = unitsIssued.add(units);

      const result = await tx.deposit.updateMany({
        where: {
          id: deposit.id,
          status: "QUEUED",
          brokerTransferBatchId: null,
        },
        data: {
          status: "CONFIRMED",
          amount: received,
          brokerTransferBatchId: batch.id,
          confirmedAt: new Date(),
        },
      });
      if (result.count !== 1) throw new Error("A queued deposit changed during the broker transfer");

      await tx.wallet.update({
        where: { userId: deposit.userId },
        data: {
          queued: { decrement: queued },
          units: { increment: units },
        },
      });
      if (transferFee.gt(0)) {
        await tx.ledgerEntry.create({
          data: {
            userId: deposit.userId,
            type: "FEE",
            amount: transferFee.neg(),
            reference: deposit.id,
            note: `Broker transfer fee (batch ${batch.id})`,
            createdAt: new Date(ledgerBaseTime + ledgerSequence++),
          },
        });
      }
      await tx.ledgerEntry.create({
        data: {
          userId: deposit.userId,
          type: "INVEST",
          amount: received,
          units,
          navPrice: investmentNav,
          reference: deposit.id,
          note: `Weekend broker transfer (batch ${batch.id})`,
          createdAt: new Date(ledgerBaseTime + ledgerSequence++),
        },
      });

      allocations.push({
        depositId: deposit.id,
        userId: deposit.userId,
        queued,
        received,
        fee: transferFee,
        units,
      });
    }

    const poolBefore = await tx.poolState.upsert({ where: { id: "pool" }, update: {}, create: { id: "pool" } });
    const balanceAfter = D(poolBefore.tradingBalance).add(totalReceivedUsdt);
    const equity = balanceAfter;
    const pool = await tx.poolState.update({
      where: { id: "pool" },
      data: { totalUnits: { increment: unitsIssued }, lastNav: investmentNav, tradingBalance: balanceAfter, tradingEquity: equity },
    });
    await tx.tradingAccountEntry.create({ data: { type: "USER_DEPOSIT", amount: totalReceivedUsdt, balanceBefore: poolBefore.tradingBalance, balanceAfter, equityBefore: poolBefore.tradingBalance, equityAfter: equity, note: `Broker deposit batch ${batch.id}`, adminId } });
    const day = new Date().toISOString().slice(0, 10);
    await tx.navSnapshot.upsert({
      where: { day },
      update: { nav: investmentNav, equity, totalUnits: pool.totalUnits },
      create: { day, nav: investmentNav, equity, totalUnits: pool.totalUnits },
    });

    return {
      batchId: batch.id,
      totalQueuedUsdt,
      totalReceivedUsdt,
      investmentNav,
      unitsIssued,
      allocations,
    };
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
export async function approveWithdrawal(
  withdrawalId: string,
  grossUsd: Dec,
  adminNote?: string,
) {
  if (grossUsd.lte(0)) throw new Error("The approved USD amount must be positive");
  if (!grossUsd.eq(grossUsd.toDecimalPlaces(8))) {
    throw new Error("The approved USD amount can have at most 8 decimal places");
  }

  const [navState, otherReserved] = await Promise.all([
    getCurrentNav(),
    prisma.withdrawal.aggregate({
      where: {
        id: { not: withdrawalId },
        userId: (
          await prisma.withdrawal.findUniqueOrThrow({
            where: { id: withdrawalId },
            select: { userId: true },
          })
        ).userId,
        status: { in: ["REQUESTED", "APPROVED"] },
      },
      _sum: { amount: true },
    }),
  ]);

  return prisma.$transaction(async (tx) => {
    const wd = await tx.withdrawal.findUniqueOrThrow({ where: { id: withdrawalId } });
    if (wd.status !== "REQUESTED") throw new Error("Withdrawal is not awaiting approval");
    if (!grossUsd.eq(D(wd.amount))) {
      throw new Error("Withdrawals must be approved for the investor's requested USD amount");
    }

    const wallet = await tx.wallet.findUnique({ where: { userId: wd.userId } });
    if (!wallet) throw new Error("Investor has no wallet");
    const holdings = D(wallet.queued).add(D(wallet.units).mul(navState.nav));
    const reserved = D(otherReserved._sum.amount ?? 0);
    if (grossUsd.add(reserved).gt(holdings.add(D("0.01")))) {
      throw new Error("The approved USD amount exceeds the investor's available balance");
    }

    return tx.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: "APPROVED",
        amount: grossUsd,
        adminNote: adminNote || null,
        approvedAt: new Date(),
      },
    });
  });
}

/**
 * Settle selected approved USD withdrawals as one atomic broker batch, then
 * move every request to its individual wallet or INR payout stage.
 */
export async function recordBrokerWithdrawalBatch(withdrawalIds: string[], adminId: string) {
  if (!withdrawalsProcessableNow()) throw new Error(withdrawalProcessingWindowMessage());

  const uniqueIds = [...new Set(withdrawalIds.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) throw new Error("Select at least one approved withdrawal");

  const previews = await prisma.withdrawal.findMany({
    where: { id: { in: uniqueIds } },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { wallet: true } } },
  });
  if (previews.length !== uniqueIds.length) {
    throw new Error("One or more selected withdrawals could not be found");
  }

  const totalsByUser = new Map<string, { gross: Dec; queued: Dec }>();
  let totalUsd = ZERO;
  for (const withdrawal of previews) {
    if (withdrawal.status !== "APPROVED") {
      throw new Error("Every selected withdrawal must be approved first");
    }
    if (!withdrawal.user.wallet) throw new Error("An investor has no wallet");

    const gross = D(withdrawal.amount);
    totalUsd = totalUsd.add(gross);
    const current = totalsByUser.get(withdrawal.userId);
    totalsByUser.set(withdrawal.userId, {
      gross: (current?.gross ?? ZERO).add(gross),
      queued: current?.queued ?? D(withdrawal.user.wallet.queued),
    });
  }

  let investedGross = ZERO;
  for (const totals of totalsByUser.values()) {
    const queuedDraw = totals.queued.lt(totals.gross) ? totals.queued : totals.gross;
    investedGross = investedGross.add(totals.gross.sub(queuedDraw));
  }

  const navState = await getCurrentNav();
  let redemptionNav = navState.nav;
  if (navState.live && navState.totalUnits.gt(0) && investedGross.gt(0)) {
    redemptionNav = navState.equity.add(investedGross).div(navState.totalUnits);
  }
  if (redemptionNav.lte(0)) throw new Error("A positive NAV is required before withdrawing");

  const result = await prisma.$transaction(async (tx) => {
    let totalUnitsRedeemed = ZERO;
    const settledAt = new Date();

    for (const withdrawalId of uniqueIds) {
      const withdrawal = await tx.withdrawal.findUniqueOrThrow({
        where: { id: withdrawalId },
      });
      if (withdrawal.status !== "APPROVED") {
        throw new Error("A selected withdrawal is no longer awaiting broker settlement");
      }

      const wallet = await tx.wallet.findUnique({
        where: { userId: withdrawal.userId },
      });
      if (!wallet) throw new Error("An investor has no wallet");

      const gross = D(withdrawal.amount);
      const queued = D(wallet.queued);
      const units = D(wallet.units);
      const holdings = queued.add(units.mul(redemptionNav));
      if (gross.gt(holdings)) {
        throw new Error("Insufficient balance to settle a selected withdrawal");
      }

      const queuedDraw = queued.lt(gross) ? queued : gross;
      const investedDraw = gross.sub(queuedDraw);
      const unitsRedeemed = investedDraw.gt(0) ? investedDraw.div(redemptionNav) : ZERO;
      if (unitsRedeemed.gt(units)) {
        throw new Error("Insufficient invested units to settle a selected withdrawal");
      }

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          queued: queued.sub(queuedDraw),
          units: units.sub(unitsRedeemed),
        },
      });

      if (queuedDraw.gt(0)) {
        await tx.ledgerEntry.create({
          data: {
            userId: withdrawal.userId,
            type: "WITHDRAWAL",
            amount: queuedDraw.neg(),
            reference: withdrawal.id,
            note: "Bulk broker withdrawal",
          },
        });
      }
      if (investedDraw.gt(0)) {
        await tx.ledgerEntry.create({
          data: {
            userId: withdrawal.userId,
            type: "WITHDRAWAL",
            amount: investedDraw.neg(),
            units: unitsRedeemed.neg(),
            navPrice: redemptionNav,
            reference: withdrawal.id,
            note: "Bulk broker withdrawal",
          },
        });
      }

      await tx.withdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: "BROKER_RECEIVED",
          fee: ZERO,
          brokerReceivedUsdt: gross,
          unitsRedeemed,
          brokerReference: null,
          brokerReceivedAt: settledAt,
        },
      });
      totalUnitsRedeemed = totalUnitsRedeemed.add(unitsRedeemed);
    }

    const poolBefore = await tx.poolState.findUniqueOrThrow({ where: { id: "pool" } });
    const balanceAfter = D(poolBefore.tradingBalance).sub(totalUsd);
    const equityAfter = balanceAfter;
    if (balanceAfter.lt(0) || equityAfter.lt(0)) throw new Error("The central trading account is too low for this withdrawal batch.");
    const pool = await tx.poolState.update({
      where: { id: "pool" },
      data: { totalUnits: { decrement: totalUnitsRedeemed }, lastNav: redemptionNav, tradingBalance: balanceAfter, tradingEquity: equityAfter },
    });
    await tx.tradingAccountEntry.create({ data: { type: "USER_WITHDRAWAL", amount: totalUsd.neg(), balanceBefore: poolBefore.tradingBalance, balanceAfter, equityBefore: poolBefore.tradingBalance, equityAfter, note: `Bulk user withdrawal (${uniqueIds.length} requests)`, adminId } });

    return {
      count: uniqueIds.length,
      totalUsd,
      totalUnitsRedeemed,
      redemptionNav,
      poolTotalUnits: D(pool.totalUnits),
    };
  });

  const equity = navState.live
    ? navState.equity
    : result.poolTotalUnits.mul(redemptionNav);
  await upsertDailySnapshot(redemptionNav, equity, result.poolTotalUnits);
  return result;
}
export async function recordWithdrawalConversionBatch(
  withdrawalIds: string[],
  totalInrReceived: Dec,
) {
  const uniqueIds = [...new Set(withdrawalIds.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) throw new Error("Select at least one withdrawal to convert");
  if (totalInrReceived.lte(0)) throw new Error("Total INR received must be positive");
  if (!totalInrReceived.eq(totalInrReceived.toDecimalPlaces(2))) {
    throw new Error("Total INR received can have at most 2 decimal places");
  }

  return prisma.$transaction(async (tx) => {
    const withdrawals = await tx.withdrawal.findMany({
      where: { id: { in: uniqueIds } },
      orderBy: { createdAt: "asc" },
    });
    if (withdrawals.length !== uniqueIds.length) {
      throw new Error("One or more selected withdrawals could not be found");
    }

    const method = withdrawals[0]?.method;
    if (!method || method === "CRYPTO") {
      throw new Error("Only bank and cash withdrawals require INR conversion");
    }
    if (withdrawals.some((withdrawal) => withdrawal.method !== method)) {
      throw new Error("Convert bank and cash withdrawal batches separately");
    }
    if (withdrawals.some((withdrawal) => withdrawal.status !== "BROKER_RECEIVED")) {
      throw new Error("Every selected withdrawal must be awaiting INR conversion");
    }

    const totalUsd = withdrawals.reduce(
      (sum, withdrawal) => sum.add(D(withdrawal.brokerReceivedUsdt ?? 0)),
      ZERO,
    );
    if (totalUsd.lte(0)) throw new Error("The selected batch has no broker funds");
    if (totalInrReceived.mul(100).lt(withdrawals.length)) {
      throw new Error("Total INR is too small to allocate at least one paise per withdrawal");
    }

    let allocatedInr = ZERO;
    const convertedAt = new Date();
    for (const [index, withdrawal] of withdrawals.entries()) {
      const usdWeight = D(withdrawal.brokerReceivedUsdt ?? 0);
      if (usdWeight.lte(0)) throw new Error("A selected withdrawal has no broker funds");

      const isLast = index === withdrawals.length - 1;
      const convertedInrAmount = isLast
        ? totalInrReceived.sub(allocatedInr)
        : totalInrReceived.mul(usdWeight).div(totalUsd).toDecimalPlaces(2, 1);
      if (convertedInrAmount.lte(0)) {
        throw new Error("Total INR is too small to distribute across the selected withdrawals");
      }

      const updated = await tx.withdrawal.updateMany({
        where: {
          id: withdrawal.id,
          status: "BROKER_RECEIVED",
          method,
        },
        data: {
          status: "INR_READY",
          convertedInrAmount,
          conversionReference: `Bulk ${method.toLowerCase()} conversion`,
          convertedAt,
        },
      });
      if (updated.count !== 1) {
        throw new Error("A selected withdrawal changed before the batch was saved");
      }
      allocatedInr = allocatedInr.add(convertedInrAmount);
    }

    return {
      count: withdrawals.length,
      method,
      totalUsd,
      totalInrReceived,
    };
  });
}
export async function completeWithdrawalPayout(withdrawalId: string, payoutReference: string) {
  const reference = payoutReference.trim();
  if (!reference) throw new Error("Enter the payout UTR, receipt, or transaction hash");

  const withdrawal = await prisma.withdrawal.findUniqueOrThrow({ where: { id: withdrawalId } });
  const expectedStatus = withdrawal.method === "CRYPTO" ? "BROKER_RECEIVED" : "INR_READY";
  if (withdrawal.status !== expectedStatus) {
    throw new Error(
      withdrawal.method === "CRYPTO"
        ? "Receive USDT from the broker before sending it to the investor"
        : "Convert the broker USDT to INR before recording the payout",
    );
  }

  if (
    withdrawal.method === "BANK" &&
    (!withdrawal.payoutAccountNumber ||
      !withdrawal.payoutIfsc ||
      !withdrawal.payoutAccountType)
  ) {
    throw new Error(
      "The approved bank destination is incomplete. Request corrected bank details before paying.",
    );
  }
  return prisma.withdrawal.update({
    where: { id: withdrawalId },
    data: {
      status: "PROCESSED",
      paidAmount: withdrawal.method === "CRYPTO" ? withdrawal.brokerReceivedUsdt : null,
      paidInrAmount: withdrawal.method === "CRYPTO" ? null : withdrawal.convertedInrAmount,
      txHash: reference,
      processedAt: new Date(),
    },
  });
}

export async function rejectWithdrawal(withdrawalId: string, adminNote?: string) {
  const wd = await prisma.withdrawal.findUniqueOrThrow({ where: { id: withdrawalId } });
  if (wd.status !== "REQUESTED" && wd.status !== "APPROVED") {
    throw new Error("A withdrawal cannot be rejected after funds leave the investor's holdings");
  }
  const result = await prisma.withdrawal.updateMany({
    where: {
      id: withdrawalId,
      status: { in: ["REQUESTED", "APPROVED"] },
    },
    data: { status: "REJECTED", adminNote: adminNote || null },
  });
  if (result.count !== 1) throw new Error("Withdrawal is no longer rejectable");
}

export { upsertDailySnapshot };
