"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withdrawSchema } from "@/lib/validation";
import { currentWeekKey, withdrawalRequestWindowMessage, withdrawalsOpenNow, NETWORKS } from "@/lib/config";
import { getPortfolioMetrics } from "@/lib/portfolio";
import { getSettingDecimal } from "@/lib/nav";
import { D, toNumber } from "@/lib/money";
import {
  getDepositEligibility,
  getWithdrawalEligibility,
  type FinancialRestriction,
} from "@/lib/financialEligibility";

type WithdrawalMethod = "CRYPTO" | "BANK" | "CASH";
type BankingDetail = {
  accountNumber: string | null;
  ifsc: string | null;
  accountType: string | null;
  usdtAddress: string | null;
  usdtNetwork: string | null;
};

export type WithdrawFormState = {
  error?: string;
  success?: string;
  windowError?: string;
  restriction?: FinancialRestriction;
};

function profileDestination(method: WithdrawalMethod, banking: BankingDetail | null): { network: string; address: string } | null {
  if (method === "CASH") return { network: "CASH", address: "Cash collection" };
  if (!banking) return null;

  if (method === "CRYPTO") {
    const network = banking.usdtNetwork?.trim() ?? "";
    const address = banking.usdtAddress?.trim() ?? "";
    if (!address || !(NETWORKS as readonly string[]).includes(network)) return null;
    return { network, address };
  }

  const accountNumber = banking.accountNumber?.trim() ?? "";
  const ifsc = banking.ifsc?.trim() ?? "";
  if (!accountNumber || !ifsc) return null;
  return { network: "BANK", address: `Bank account ending ${accountNumber.slice(-4)}` };
}

function missingPayoutDetailsMessage(method: WithdrawalMethod): string {
  if (method === "CRYPTO") return "Add a USDT address and network in Profile & Security before requesting a crypto withdrawal.";
  if (method === "BANK") return "Add your bank account number, IFSC, and account type in Profile & Security before requesting a bank withdrawal.";
  return "";
}

function balanceError(available: number, alreadyReserved: number): WithdrawFormState {
  return {
    error: `That request exceeds your available balance of ${available.toLocaleString("en-US", {
      maximumFractionDigits: 2,
    })} USD${alreadyReserved > 0 ? ` after ${alreadyReserved.toLocaleString("en-US", { maximumFractionDigits: 2 })} USD already reserved for other withdrawals` : ""}.`,
  };
}

async function validateWithdrawalAmount(
  userId: string,
  usdAmount: number,
  excludingId?: string,
): Promise<WithdrawFormState | null> {
  const [metrics, pendingAgg] = await Promise.all([
    getPortfolioMetrics(userId),
    prisma.withdrawal.aggregate({
      where: {
        userId,
        status: { in: ["REQUESTED", "APPROVED"] },
        ...(excludingId ? { id: { not: excludingId } } : {}),
      },
      _sum: { amount: true },
    }),
  ]);
  const available = toNumber(metrics.currentValue);
  const alreadyReserved = toNumber(pendingAgg._sum.amount ?? 0);

  return usdAmount + alreadyReserved > available + 0.01
    ? balanceError(available, alreadyReserved)
    : null;
}

async function getBankingDetail(userId: string): Promise<BankingDetail | null> {
  return prisma.bankingDetail.findUnique({
    where: { userId },
    select: { accountNumber: true, ifsc: true, accountType: true, usdtAddress: true, usdtNetwork: true },
  });
}

function parsedRequest(formData: FormData) {
  return withdrawSchema.safeParse({ amount: formData.get("amount"), method: formData.get("method") });
}

async function getWithdrawalReferenceRate() {
  const rate = await getSettingDecimal("WITHDRAWAL_INR_PER_USD", "85");
  return rate.gt(0) ? rate : D(85);
}

function requestedUsdAmount(amount: number) {
  return D(amount).toDecimalPlaces(8);
}

export async function requestWithdrawal(_prev: WithdrawFormState, formData: FormData): Promise<WithdrawFormState> {
  const user = await requireUser();
  const kycEligibility = getDepositEligibility(user);
  if (kycEligibility.restriction) return { restriction: kycEligibility.restriction };

  const parsed = parsedRequest(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const { amount, method } = parsed.data;
  const banking = method === "CASH" ? null : await getBankingDetail(user.id);
  const eligibility = getWithdrawalEligibility(user, banking, method);
  if (eligibility.restriction) return { restriction: eligibility.restriction };
  if (!withdrawalsOpenNow()) return { windowError: withdrawalRequestWindowMessage() };

  const referenceRate = method === "CRYPTO" ? null : await getWithdrawalReferenceRate();
  const usdAmount = requestedUsdAmount(amount);
  const estimatedInrAmount =
    method === "CRYPTO" ? null : usdAmount.mul(referenceRate ?? D(1)).toDecimalPlaces(2);
  const amountError = await validateWithdrawalAmount(user.id, toNumber(usdAmount));
  const destination = profileDestination(method, banking);
  if (!destination) return { error: missingPayoutDetailsMessage(method) };
  if (amountError) return amountError;

  await prisma.withdrawal.create({
    data: {
      userId: user.id,
      method,
      amount: usdAmount,
      requestedInrAmount: estimatedInrAmount,
      requestExchangeRate: referenceRate,
      network: destination.network,
      address: destination.address,
      weekKey: currentWeekKey(),
    },
  });

  revalidatePath("/app/withdraw");
  revalidatePath("/app/history");
  revalidatePath("/admin/withdrawals");
  revalidatePath("/admin");
  return {
    success:
      method === "CRYPTO"
        ? "USD withdrawal requested. After approval, the equivalent USDT will be sent to your saved wallet."
        : "USD withdrawal requested. The INR shown is an estimate; the actual INR payout will be recorded after conversion.",
  };
}

export async function editWithdrawal(_prev: WithdrawFormState, formData: FormData): Promise<WithdrawFormState> {
  const user = await requireUser();
  const kycEligibility = getDepositEligibility(user);
  if (kycEligibility.restriction) return { error: kycEligibility.restriction.message };
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Withdrawal request not found." };

  const withdrawal = await prisma.withdrawal.findFirst({
    where: { id, userId: user.id },
    select: { status: true },
  });
  if (!withdrawal) return { error: "Withdrawal request not found." };
  if (withdrawal.status !== "REQUESTED") {
    return { error: "Only pending withdrawal requests can be edited." };
  }

  const parsed = parsedRequest(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const { amount, method } = parsed.data;
  const banking = method === "CASH" ? null : await getBankingDetail(user.id);
  const eligibility = getWithdrawalEligibility(user, banking, method);
  if (eligibility.restriction) return { error: eligibility.restriction.message };

  const referenceRate = method === "CRYPTO" ? null : await getWithdrawalReferenceRate();
  const usdAmount = requestedUsdAmount(amount);
  const estimatedInrAmount =
    method === "CRYPTO" ? null : usdAmount.mul(referenceRate ?? D(1)).toDecimalPlaces(2);
  const amountError = await validateWithdrawalAmount(user.id, toNumber(usdAmount), id);
  const destination = profileDestination(method, banking);
  if (!destination) return { error: missingPayoutDetailsMessage(method) };
  if (amountError) return amountError;

  const result = await prisma.withdrawal.updateMany({
    where: { id, userId: user.id, status: "REQUESTED" },
    data: {
      method,
      amount: usdAmount,
      requestedInrAmount: estimatedInrAmount,
      requestExchangeRate: referenceRate,
      network: destination.network,
      address: destination.address,
    },
  });
  if (result.count === 0) {
    return { error: "This request is no longer pending and cannot be edited." };
  }

  revalidatePath("/app/withdraw");
  revalidatePath("/app/history");
  revalidatePath("/admin/withdrawals");
  revalidatePath("/admin");
  return { success: "Withdrawal request updated." };
}

export async function cancelWithdrawal(_prev: WithdrawFormState, formData: FormData): Promise<WithdrawFormState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Withdrawal request not found." };

  const result = await prisma.withdrawal.updateMany({
    where: { id, userId: user.id, status: "REQUESTED" },
    data: { status: "CANCELLED" },
  });
  if (result.count === 0) return { error: "Only pending withdrawal requests can be cancelled." };

  revalidatePath("/app/withdraw");
  revalidatePath("/app/history");
  revalidatePath("/admin/withdrawals");
  revalidatePath("/admin");
  return { success: "Withdrawal request cancelled." };
}
