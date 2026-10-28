import "server-only";

import { randomBytes } from "node:crypto";
import type { Prisma, TradingAdjustmentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { D, ZERO, type Dec } from "@/lib/money";

const COMMISSION_BASIS_TYPES = [
  "TRADING_PROFIT",
  "TRADING_LOSS",
  "SERVER_FEE",
  "ADMIN_SHARE",
] as const satisfies readonly TradingAdjustmentType[];

export const REFERRAL_COMMISSION_RATE_KEY =
  "REFERRAL_COMMISSION_RATE_PERCENT";
export const DEFAULT_REFERRAL_COMMISSION_RATE = D(5);
export const MINIMUM_COMMISSION_INVESTMENT = D(500);
export const COMMISSION_DEPOSIT_NETWORK = "COMMISSION_WALLET";

export type ReferralCommissionPreviewRow = {
  referralId: string;
  referrerId: string;
  referrerName: string;
  referrerPublicId: string;
  referredUserId: string;
  referredName: string;
  eligibleProfit: Dec;
  suggestedCommission: Dec;
  distributedAmount: Dec | null;
};

export function newPublicUserId(): string {
  return "CC-" + randomBytes(5).toString("hex").toUpperCase();
}

export async function ensurePublicUserId(userId: string): Promise<string> {
  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { publicId: true },
  });
  if (!current) throw new Error("Account not found.");
  if (current.publicId) return current.publicId;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const publicId = newPublicUserId();
    try {
      await prisma.user.update({ where: { id: userId }, data: { publicId } });
      return publicId;
    } catch (error) {
      if ((error as { code?: string }).code !== "P2002") throw error;
    }
  }
  throw new Error("A unique investor ID could not be generated.");
}

export async function getReferralCommissionRate(): Promise<Dec> {
  const setting = await prisma.setting.findUnique({
    where: { key: REFERRAL_COMMISSION_RATE_KEY },
    select: { value: true },
  });
  if (!setting) return DEFAULT_REFERRAL_COMMISSION_RATE;
  try {
    const rate = D(setting.value);
    return rate.gte(0) && rate.lte(100)
      ? rate
      : DEFAULT_REFERRAL_COMMISSION_RATE;
  } catch {
    return DEFAULT_REFERRAL_COMMISSION_RATE;
  }
}

export async function setReferralCommissionRate(rate: Dec): Promise<void> {
  if (rate.lt(0) || rate.gt(100)) {
    throw new Error("Commission rate must be between 0% and 100%.");
  }
  await prisma.setting.upsert({
    where: { key: REFERRAL_COMMISSION_RATE_KEY },
    create: { key: REFERRAL_COMMISSION_RATE_KEY, value: rate.toString() },
    update: { value: rate.toString() },
  });
}

export async function calculateReferralCommissionPreview(input: {
  periodStart: string;
  periodEnd: string;
  from: Date;
  to: Date;
  rate: Dec;
}): Promise<ReferralCommissionPreviewRow[]> {
  const referrals = await prisma.referral.findMany({
    where: {
      referrer: {
        role: "USER",
        isCompanyAccount: false,
        referralEnabled: true,
      },
    },
    orderBy: [
      { referrer: { fullName: "asc" } },
      { referredUser: { fullName: "asc" } },
    ],
    include: {
      referrer: {
        select: { id: true, fullName: true, email: true, publicId: true },
      },
      referredUser: {
        select: { id: true, fullName: true, email: true },
      },
      commissions: {
        where: {
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
        },
        select: { amount: true },
        take: 1,
      },
    },
  });
  if (referrals.length === 0) return [];

  const referredIds = new Set(
    referrals.map((referral) => referral.referredUserId),
  );
  const [entries, unitEvents] = await Promise.all([
    prisma.tradingAccountEntry.findMany({
      where: {
        type: { in: [...COMMISSION_BASIS_TYPES] },
        createdAt: { gte: input.from, lte: input.to },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, amount: true, createdAt: true },
    }),
    prisma.ledgerEntry.findMany({
      where: {
        units: { not: null },
        createdAt: { lte: input.to },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, userId: true, units: true, createdAt: true },
    }),
  ]);

  let poolUnits = ZERO;
  let eventCursor = 0;
  const userUnits = new Map<string, Dec>();
  const netProfit = new Map<string, Dec>();

  for (const entry of entries) {
    while (
      eventCursor < unitEvents.length &&
      unitEvents[eventCursor].createdAt <= entry.createdAt
    ) {
      const event = unitEvents[eventCursor];
      const units = D(event.units ?? 0);
      poolUnits = poolUnits.add(units);
      if (referredIds.has(event.userId)) {
        userUnits.set(
          event.userId,
          (userUnits.get(event.userId) ?? ZERO).add(units),
        );
      }
      eventCursor += 1;
    }
    if (poolUnits.lte(0)) continue;
    for (const referredUserId of referredIds) {
      const units = userUnits.get(referredUserId) ?? ZERO;
      if (units.lte(0)) continue;
      const userMovement = D(entry.amount).mul(units.div(poolUnits));
      netProfit.set(
        referredUserId,
        (netProfit.get(referredUserId) ?? ZERO).add(userMovement),
      );
    }
  }

  return referrals.map((referral) => {
    const rawProfit = netProfit.get(referral.referredUserId) ?? ZERO;
    const eligibleProfit = rawProfit.gt(0) ? rawProfit : ZERO;
    return {
      referralId: referral.id,
      referrerId: referral.referrerId,
      referrerName:
        referral.referrer.fullName ?? referral.referrer.email,
      referrerPublicId: referral.referrer.publicId ?? "Not assigned",
      referredUserId: referral.referredUserId,
      referredName:
        referral.referredUser.fullName ?? referral.referredUser.email,
      eligibleProfit,
      suggestedCommission: eligibleProfit.mul(input.rate).div(100),
      distributedAmount: referral.commissions[0]?.amount
        ? D(referral.commissions[0].amount)
        : null,
    };
  });
}

export async function distributeReferralCommissions(input: {
  adminId: string;
  periodStart: string;
  periodEnd: string;
  from: Date;
  to: Date;
  rate: Dec;
  note: string;
  amounts: Array<{ referralId: string; amount: Dec }>;
}): Promise<{ count: number; total: Dec }> {
  if (!input.note.trim()) throw new Error("Enter a distribution note.");
  const preview = await calculateReferralCommissionPreview(input);
  const previewById = new Map(preview.map((row) => [row.referralId, row]));
  const selected = input.amounts.filter((row) => row.amount.gt(0));
  if (selected.length === 0) {
    throw new Error("Select at least one positive commission amount.");
  }

  for (const row of selected) {
    const source = previewById.get(row.referralId);
    if (!source) throw new Error("A selected referral is no longer eligible.");
    if (source.distributedAmount !== null) {
      throw new Error(
        "Commission for " +
          source.referredName +
          " was already distributed for this period.",
      );
    }
    if (row.amount.gt(source.eligibleProfit)) {
      throw new Error(
        "Commission for " +
          source.referredName +
          " cannot exceed their eligible profit.",
      );
    }
  }

  let total = ZERO;
  await prisma.$transaction(async (tx) => {
    for (const row of selected) {
      const source = previewById.get(row.referralId);
      if (!source) throw new Error("A selected referral is no longer eligible.");
      await tx.referralCommission.create({
        data: {
          referralId: source.referralId,
          referrerId: source.referrerId,
          referredUserId: source.referredUserId,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          ratePercent: input.rate,
          eligibleProfit: source.eligibleProfit,
          amount: row.amount,
          note: input.note.trim(),
          adminId: input.adminId,
        },
      });
      await tx.commissionWallet.upsert({
        where: { userId: source.referrerId },
        create: {
          userId: source.referrerId,
          balance: row.amount,
          totalEarned: row.amount,
        },
        update: {
          balance: { increment: row.amount },
          totalEarned: { increment: row.amount },
        },
      });
      await tx.accountNotification.create({
        data: {
          userId: source.referrerId,
          kind: "UPDATE",
          title: "Referral commission credited",
          message:
            row.amount.toFixed(2) +
            " USD was added to your commission wallet for referring " +
            source.referredName +
            ".",
          href: "/app/referrals",
          actionLabel: "View commissions",
          sourceType: "REFERRAL_COMMISSION",
          sourceId: source.referralId,
          eventCode: "REFERRAL_COMMISSION_CREDITED",
        },
      });
      total = total.add(row.amount);
    }
  });
  return { count: selected.length, total };
}

export type ReferralCreateInput = {
  referrerId: string;
  referredUserId: string;
};

export function createReferral(
  tx: Prisma.TransactionClient,
  input: ReferralCreateInput,
) {
  return tx.referral.create({ data: input });
}

export async function createCommissionInvestmentDeposit(
  userId: string,
): Promise<{ depositId: string; amount: Dec }> {
  return prisma.$transaction(async (tx) => {
    const wallet = await tx.commissionWallet.findUnique({ where: { userId } });
    const amount = D(wallet?.balance ?? 0);
    if (amount.lt(MINIMUM_COMMISSION_INVESTMENT)) {
      throw new Error(
        `A minimum commission balance of ${MINIMUM_COMMISSION_INVESTMENT.toFixed(2)} USD is required to invest.`,
      );
    }

    const reserved = await tx.commissionWallet.updateMany({
      where: { userId, balance: amount },
      data: { balance: { decrement: amount } },
    });
    if (reserved.count !== 1) {
      throw new Error("Your commission balance changed. Refresh and try again.");
    }

    const deposit = await tx.deposit.create({
      data: {
        userId,
        method: "CRYPTO",
        amount,
        reportedUsdtAmount: amount,
        network: COMMISSION_DEPOSIT_NETWORK,
        adminNote: "Funded from referral commission wallet",
      },
    });
    await tx.accountNotification.create({
      data: {
        userId,
        kind: "UPDATE",
        title: "Commission investment submitted",
        message:
          amount.toFixed(2) +
          " USD was moved from your commission wallet into a new deposit request.",
        href: "/app/history",
        actionLabel: "Track deposit",
        sourceType: "DEPOSIT",
        sourceId: deposit.id,
        eventCode: "COMMISSION_INVESTMENT_SUBMITTED",
      },
    });
    return { depositId: deposit.id, amount };
  });
}

export function isCommissionInvestmentDeposit(deposit: {
  method: string;
  network: string | null;
}): boolean {
  return (
    deposit.method === "CRYPTO" &&
    deposit.network === COMMISSION_DEPOSIT_NETWORK
  );
}

export async function refundCommissionInvestmentDeposit(
  tx: Prisma.TransactionClient,
  deposit: {
    userId: string;
    method: string;
    network: string | null;
    reportedUsdtAmount: Prisma.Decimal | null;
    amount: Prisma.Decimal;
  },
): Promise<void> {
  if (!isCommissionInvestmentDeposit(deposit)) return;
  const amount = D(deposit.reportedUsdtAmount ?? deposit.amount);
  if (amount.lte(0)) return;
  await tx.commissionWallet.upsert({
    where: { userId: deposit.userId },
    create: { userId: deposit.userId, balance: amount },
    update: { balance: { increment: amount } },
  });
}
