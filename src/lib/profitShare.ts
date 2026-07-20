import "server-only";
import { prisma } from "@/lib/prisma";
import { D, ZERO, type Dec } from "@/lib/money";
import { getCurrentNav } from "@/lib/nav";
import { getPortfolioMetrics } from "@/lib/portfolio";

export const COMPANY_TRADING_ACCOUNT_ID = "company-trading-account";
export const COMPANY_TRADING_ACCOUNT_EMAIL =
  "company.trading@chopracapital.internal";

export type ProfitShareFrequency = "WEEKLY" | "MONTHLY";
export type ProfitShareMode = "PERCENTAGE" | "FIXED_TOTAL";

export type ProfitShareInput = {
  frequency: ProfitShareFrequency;
  mode: ProfitShareMode;
  value: Dec;
};

export type ProfitShareAllocationPreview = {
  userId: string;
  name: string;
  email: string;
  profitBeforeShare: Dec;
  highWaterBefore: Dec;
  eligibleProfit: Dec;
  companyShare: Dec;
  unitsTransferred: Dec;
  highWaterAfter: Dec;
  balanceBefore: Dec;
  balanceAfter: Dec;
};

export type ProfitSharePreview = {
  frequency: ProfitShareFrequency;
  periodKey: string;
  periodLabel: string;
  cutoffDate: string;
  mode: ProfitShareMode;
  value: Dec;
  navPrice: Dec;
  totalEligibleProfit: Dec;
  totalCompanyShare: Dec;
  allocations: ProfitShareAllocationPreview[];
};

function indiaDayKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function isoWeek(day: string): { year: number; week: number } {
  const date = new Date(`${day}T00:00:00Z`);
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - weekday);
  const year = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year, week };
}

export function currentProfitSharePeriod(frequency: ProfitShareFrequency) {
  const cutoffDate = indiaDayKey();
  if (frequency === "MONTHLY") {
    const date = new Date(`${cutoffDate}T00:00:00Z`);
    return {
      cutoffDate,
      periodKey: cutoffDate.slice(0, 7),
      periodLabel: date.toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }),
    };
  }

  const { year, week } = isoWeek(cutoffDate);
  return {
    cutoffDate,
    periodKey: `${year}-W${String(week).padStart(2, "0")}`,
    periodLabel: `Week ${week}, ${year}`,
  };
}

export function validateProfitShareInput(input: ProfitShareInput): void {
  if (input.frequency !== "WEEKLY" && input.frequency !== "MONTHLY") {
    throw new Error("Choose weekly or monthly profit sharing");
  }
  if (input.mode !== "PERCENTAGE" && input.mode !== "FIXED_TOTAL") {
    throw new Error("Choose percentage or fixed-total profit sharing");
  }
  if (input.value.lte(0)) {
    throw new Error(
      input.mode === "PERCENTAGE"
        ? "Enter a percentage greater than zero"
        : "Enter a fixed company share greater than zero",
    );
  }
  if (input.mode === "PERCENTAGE" && input.value.gt(100)) {
    throw new Error("Percentage cannot exceed 100%");
  }
  const decimals = input.mode === "PERCENTAGE" ? 4 : 8;
  if (!input.value.eq(input.value.toDecimalPlaces(decimals))) {
    throw new Error(
      input.mode === "PERCENTAGE"
        ? "Percentage can have at most 4 decimal places"
        : "Fixed company share can have at most 8 decimal places",
    );
  }
}

export async function ensureCompanyTradingAccount() {
  const account = await prisma.user.upsert({
    where: { id: COMPANY_TRADING_ACCOUNT_ID },
    update: {
      isCompanyAccount: true,
      fullName: "Chopra Capital Company Trading Account",
      kycStatus: "APPROVED",
    },
    create: {
      id: COMPANY_TRADING_ACCOUNT_ID,
      email: COMPANY_TRADING_ACCOUNT_EMAIL,
      passwordHash: "!INTERNAL_ACCOUNT_NO_LOGIN!",
      role: "USER",
      isCompanyAccount: true,
      fullName: "Chopra Capital Company Trading Account",
      kycStatus: "APPROVED",
    },
  });
  await prisma.wallet.upsert({
    where: { userId: account.id },
    update: {},
    create: { id: "company-trading-wallet", userId: account.id },
  });
  return account;
}

function allocateFixedTotal(
  allocations: Array<{ eligibleProfit: Dec }>,
  totalEligibleProfit: Dec,
  target: Dec,
): Dec[] {
  const result = allocations.map(() => ZERO);
  const eligibleIndexes = allocations
    .map((allocation, index) => ({ allocation, index }))
    .filter(({ allocation }) => allocation.eligibleProfit.gt(0));

  let remaining = target;
  for (const [position, { allocation, index }] of eligibleIndexes.entries()) {
    const isLast = position === eligibleIndexes.length - 1;
    const share = isLast
      ? remaining
      : target
          .mul(allocation.eligibleProfit)
          .div(totalEligibleProfit)
          .toDecimalPlaces(8);
    result[index] = share;
    remaining = remaining.sub(share);
  }
  return result;
}

export async function getProfitSharePreview(
  input: ProfitShareInput,
): Promise<ProfitSharePreview> {
  validateProfitShareInput(input);
  await ensureCompanyTradingAccount();

  const period = currentProfitSharePeriod(input.frequency);
  const [existingRun, navState, investors] = await Promise.all([
    prisma.profitShareRun.findUnique({
      where: { activePeriodKey: `${input.frequency}:${period.periodKey}` },
      select: { id: true },
    }),
    getCurrentNav(),
    prisma.user.findMany({
      where: { role: "USER", isCompanyAccount: false },
      orderBy: [{ fullName: "asc" }, { email: "asc" }],
      select: {
        id: true,
        fullName: true,
        email: true,
        profitSharePosition: { select: { highWaterProfit: true } },
      },
    }),
  ]);

  if (existingRun) {
    throw new Error(
      `${period.periodLabel} has already been processed. A settled period cannot be charged twice.`,
    );
  }
  if (navState.nav.lte(0)) {
    throw new Error("A positive NAV is required before profit sharing");
  }

  const metrics = await Promise.all(
    investors.map((investor) => getPortfolioMetrics(investor.id)),
  );

  const baseAllocations = investors.map((investor, index) => {
    const metric = metrics[index];
    const investedValue = metric.units.mul(navState.nav);
    const profitBeforeShare = metric.bookedProfit
      .add(investedValue)
      .sub(metric.netInvestedInPool);
    const highWaterBefore = D(
      investor.profitSharePosition?.highWaterProfit ?? 0,
    );
    const profitAboveHighWater = profitBeforeShare.sub(highWaterBefore);
    const eligibleProfit = profitAboveHighWater.gt(0)
      ? profitAboveHighWater
      : ZERO;

    return {
      userId: investor.id,
      name: investor.fullName ?? investor.email,
      email: investor.email,
      profitBeforeShare,
      highWaterBefore,
      eligibleProfit,
      investedValue,
      balanceBefore: investedValue.add(metric.queued),
    };
  });

  const totalEligibleProfit = baseAllocations.reduce(
    (sum, allocation) => sum.add(allocation.eligibleProfit),
    ZERO,
  );

  if (input.mode === "FIXED_TOTAL" && input.value.gt(totalEligibleProfit)) {
    throw new Error(
      `Fixed company share cannot exceed the eligible profit of ${totalEligibleProfit.toFixed(2)} USD`,
    );
  }

  const fixedShares =
    input.mode === "FIXED_TOTAL"
      ? allocateFixedTotal(baseAllocations, totalEligibleProfit, input.value)
      : [];

  const allocations: ProfitShareAllocationPreview[] = baseAllocations.map(
    (allocation, index) => {
      const companyShare =
        input.mode === "PERCENTAGE"
          ? allocation.eligibleProfit.mul(input.value).div(100).toDecimalPlaces(8)
          : fixedShares[index];

      if (companyShare.gt(allocation.investedValue)) {
        throw new Error(
          `${allocation.name} no longer has enough invested value to settle the company share. Run profit sharing before processing withdrawals.`,
        );
      }

      const unitsTransferred = companyShare.gt(0)
        ? companyShare.div(navState.nav)
        : ZERO;
      const highWaterAfter = companyShare.gt(0)
        ? allocation.profitBeforeShare.sub(companyShare)
        : allocation.highWaterBefore;

      return {
        userId: allocation.userId,
        name: allocation.name,
        email: allocation.email,
        profitBeforeShare: allocation.profitBeforeShare,
        highWaterBefore: allocation.highWaterBefore,
        eligibleProfit: allocation.eligibleProfit,
        companyShare,
        unitsTransferred,
        highWaterAfter,
        balanceBefore: allocation.balanceBefore,
        balanceAfter: allocation.balanceBefore.sub(companyShare),
      };
    },
  );

  const totalCompanyShare = allocations.reduce(
    (sum, allocation) => sum.add(allocation.companyShare),
    ZERO,
  );

  return {
    frequency: input.frequency,
    periodKey: period.periodKey,
    periodLabel: period.periodLabel,
    cutoffDate: period.cutoffDate,
    mode: input.mode,
    value: input.value,
    navPrice: navState.nav,
    totalEligibleProfit,
    totalCompanyShare,
    allocations,
  };
}

export async function applyProfitShareRun(
  input: ProfitShareInput,
  adminId: string,
) {
  const preview = await getProfitSharePreview(input);
  if (preview.totalCompanyShare.lte(0)) {
    throw new Error("There is no eligible profit to share in this period");
  }

  const company = await ensureCompanyTradingAccount();

  return prisma.$transaction(async (tx) => {
    const run = await tx.profitShareRun.create({
      data: {
        frequency: preview.frequency,
        periodKey: preview.periodKey,
        cutoffDate: preview.cutoffDate,
        mode: preview.mode,
        ratePercent:
          preview.mode === "PERCENTAGE" ? preview.value : null,
        fixedAmount:
          preview.mode === "FIXED_TOTAL" ? preview.value : null,
        navPrice: preview.navPrice,
        totalEligibleProfit: preview.totalEligibleProfit,
        totalCompanyShare: preview.totalCompanyShare,
        activePeriodKey: `${preview.frequency}:${preview.periodKey}`,
        companyUserId: company.id,
        adminId,
      },
    });

    const companyWallet = await tx.wallet.upsert({
      where: { userId: company.id },
      update: {},
      create: { id: "company-trading-wallet", userId: company.id },
    });
    const totalUnitsTransferred = preview.allocations.reduce(
      (sum, allocation) => sum.add(allocation.unitsTransferred),
      ZERO,
    );
    if (totalUnitsTransferred.gt(0)) {
      await tx.wallet.update({
        where: { id: companyWallet.id },
        data: { units: { increment: totalUnitsTransferred } },
      });
    }

    const settledAt = new Date();
    let ledgerSequence = 0;

    for (const allocation of preview.allocations) {
      if (allocation.companyShare.gt(0)) {
        const wallet = await tx.wallet.findUnique({
          where: { userId: allocation.userId },
        });
        if (!wallet || D(wallet.units).lt(allocation.unitsTransferred)) {
          throw new Error(
            `${allocation.name}'s invested balance changed before confirmation. Preview the run again.`,
          );
        }

        await tx.wallet.update({
          where: { id: wallet.id },
          data: { units: { decrement: allocation.unitsTransferred } },
        });

        await tx.ledgerEntry.create({
          data: {
            userId: allocation.userId,
            type: "FEE",
            amount: allocation.companyShare.neg(),
            units: allocation.unitsTransferred.neg(),
            navPrice: preview.navPrice,
            reference: run.id,
            note: `Company profit share · ${preview.periodLabel}`,
            createdAt: new Date(settledAt.getTime() + ledgerSequence++),
          },
        });
        await tx.ledgerEntry.create({
          data: {
            userId: company.id,
            type: "ADJUSTMENT",
            amount: allocation.companyShare,
            units: allocation.unitsTransferred,
            navPrice: preview.navPrice,
            reference: run.id,
            note: `Profit share received from ${allocation.name} · ${preview.periodLabel}`,
            createdAt: new Date(settledAt.getTime() + ledgerSequence++),
          },
        });
      }

      await tx.profitSharePosition.upsert({
        where: { userId: allocation.userId },
        update: {
          highWaterProfit: allocation.highWaterAfter,
          lastRunAt: settledAt,
        },
        create: {
          userId: allocation.userId,
          highWaterProfit: allocation.highWaterAfter,
          lastRunAt: settledAt,
        },
      });

      await tx.profitShareAllocation.create({
        data: {
          runId: run.id,
          userId: allocation.userId,
          profitBeforeShare: allocation.profitBeforeShare,
          highWaterBefore: allocation.highWaterBefore,
          eligibleProfit: allocation.eligibleProfit,
          companyShare: allocation.companyShare,
          unitsTransferred: allocation.unitsTransferred,
          highWaterAfter: allocation.highWaterAfter,
        },
      });
    }

    return {
      run,
      company,
      allocationCount: preview.allocations.filter((allocation) =>
        allocation.companyShare.gt(0),
      ).length,
    };
  });
}
/** Reverses the newest active settlement using matching, auditable unit transfers. */
export async function reverseProfitShareRun(runId: string, adminId: string) {
  return prisma.$transaction(async (tx) => {
    const run = await tx.profitShareRun.findUnique({
      where: { id: runId },
      include: { allocations: { orderBy: { createdAt: "asc" } } },
    });
    if (!run || !run.activePeriodKey) {
      throw new Error("This profit-share settlement has already been reversed");
    }

    const newestActive = await tx.profitShareRun.findFirst({
      where: { activePeriodKey: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (newestActive?.id !== run.id) {
      throw new Error("Reverse newer active profit-share settlements first");
    }

    const companyWallet = await tx.wallet.findUnique({ where: { userId: run.companyUserId } });
    const totalUnits = run.allocations.reduce(
      (sum, allocation) => sum.add(D(allocation.unitsTransferred)),
      ZERO,
    );
    if (!companyWallet || D(companyWallet.units).lt(totalUnits)) {
      throw new Error("The company account no longer holds these units. Reverse its later account activity before undoing this settlement.");
    }

    const reversedAt = new Date();
    let ledgerSequence = 0;
    for (const allocation of run.allocations) {
      const units = D(allocation.unitsTransferred);
      const amount = D(allocation.companyShare);
      if (units.gt(0)) {
        const investorWallet = await tx.wallet.findUnique({ where: { userId: allocation.userId } });
        if (!investorWallet) throw new Error("An investor wallet is missing");
        await tx.wallet.update({ where: { id: investorWallet.id }, data: { units: { increment: units } } });
        await tx.ledgerEntry.create({ data: {
          userId: allocation.userId, type: "ADJUSTMENT", amount, units, navPrice: run.navPrice,
          reference: run.id, note: `Profit share reversal · ${run.periodKey}`,
          createdAt: new Date(reversedAt.getTime() + ledgerSequence++),
        } });
        await tx.ledgerEntry.create({ data: {
          userId: run.companyUserId, type: "ADJUSTMENT", amount: amount.neg(), units: units.neg(), navPrice: run.navPrice,
          reference: run.id, note: `Profit share returned · ${run.periodKey}`,
          createdAt: new Date(reversedAt.getTime() + ledgerSequence++),
        } });
      }
      await tx.profitSharePosition.upsert({
        where: { userId: allocation.userId },
        update: { highWaterProfit: allocation.highWaterBefore, lastRunAt: null },
        create: { userId: allocation.userId, highWaterProfit: allocation.highWaterBefore },
      });
    }
    if (totalUnits.gt(0)) {
      await tx.wallet.update({ where: { id: companyWallet.id }, data: { units: { decrement: totalUnits } } });
    }
    await tx.profitShareRun.update({
      where: { id: run.id },
      data: { activePeriodKey: null, reversedAt, reversedById: adminId },
    });
    return { run, allocationCount: run.allocations.filter((item) => D(item.companyShare).gt(0)).length };
  });
}