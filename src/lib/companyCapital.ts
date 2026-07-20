import "server-only";

import { prisma } from "@/lib/prisma";
import { D, ZERO, type Dec } from "@/lib/money";
import { getCurrentNav } from "@/lib/nav";
import { COMPANY_TRADING_ACCOUNT_ID, ensureCompanyTradingAccount } from "@/lib/profitShare";

export async function queueCompanyCapital(amount: Dec, reference?: string) {
  if (amount.lte(0)) throw new Error("Company capital must be greater than zero.");
  const company = await ensureCompanyTradingAccount();
  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId: company.id } });
    await tx.wallet.update({ where: { id: wallet.id }, data: { queued: { increment: amount } } });
    await tx.ledgerEntry.create({
      data: { userId: company.id, type: "DEPOSIT", amount, reference: reference || null, note: "Company capital added to investment queue" },
    });
    return { amount };
  });
}

export async function investQueuedCompanyCapital() {
  const { nav } = await getCurrentNav();
  if (nav.lte(0)) throw new Error("A positive NAV is required to invest company capital.");
  const company = await ensureCompanyTradingAccount();
  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId: company.id } });
    const queued = D(wallet.queued);
    if (queued.lte(0)) throw new Error("There is no queued company capital to invest.");
    const units = queued.div(nav);
    await tx.wallet.update({ where: { id: wallet.id }, data: { queued: { decrement: queued }, units: { increment: units } } });
    await tx.poolState.upsert({
      where: { id: "pool" },
      update: { totalUnits: { increment: units } },
      create: { id: "pool", totalUnits: units, lastNav: nav },
    });
    await tx.ledgerEntry.create({
      data: { userId: company.id, type: "INVEST", amount: queued, units, navPrice: nav, note: "Company capital invested in pool" },
    });
    return { amount: queued, units, nav };
  });
}

export async function withdrawCompanyCapital(amount: Dec, reference: string) {
  if (amount.lte(0)) throw new Error("Company withdrawal must be greater than zero.");
  if (!reference.trim()) throw new Error("Enter the broker or payout reference.");
  const { nav } = await getCurrentNav();
  if (nav.lte(0)) throw new Error("A positive NAV is required to withdraw company capital.");
  await ensureCompanyTradingAccount();
  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId: COMPANY_TRADING_ACCOUNT_ID } });
    const queued = D(wallet.queued);
    const units = D(wallet.units);
    const queuedUsed = queued.gte(amount) ? amount : queued;
    const investedAmount = amount.sub(queuedUsed);
    const unitsRedeemed = investedAmount.gt(0) ? investedAmount.div(nav) : ZERO;
    if (unitsRedeemed.gt(units)) throw new Error("Company withdrawal exceeds its available balance.");
    await tx.wallet.update({ where: { id: wallet.id }, data: { queued: { decrement: queuedUsed }, units: { decrement: unitsRedeemed } } });
    if (unitsRedeemed.gt(0)) {
      await tx.poolState.update({ where: { id: "pool" }, data: { totalUnits: { decrement: unitsRedeemed } } });
    }
    if (queuedUsed.gt(0)) {
      await tx.ledgerEntry.create({ data: { userId: COMPANY_TRADING_ACCOUNT_ID, type: "WITHDRAWAL", amount: queuedUsed.neg(), reference, note: "Company capital withdrawal from queue" } });
    }
    if (investedAmount.gt(0)) {
      await tx.ledgerEntry.create({
        data: { userId: COMPANY_TRADING_ACCOUNT_ID, type: "WITHDRAWAL", amount: investedAmount.neg(), units: unitsRedeemed.neg(), navPrice: nav, reference, note: "Company capital withdrawal from pool" },
      });
    }
    return { queuedUsed, investedAmount, unitsRedeemed, nav };
  });
}