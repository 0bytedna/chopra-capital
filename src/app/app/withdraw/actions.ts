"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { totpCodeSchema, withdrawSchema } from "@/lib/validation";
import { currentWeekKey, withdrawalRequestWindowMessage, withdrawalsOpenNow, NETWORKS } from "@/lib/config";
import { getPortfolioMetrics } from "@/lib/portfolio";
import { D, toNumber } from "@/lib/money";
import { verifyTotp } from "@/lib/totp";
import {
  getDepositEligibility,
  getWithdrawalEligibility,
  type FinancialRestriction,
} from "@/lib/financialEligibility";

type WithdrawalMethod = "CRYPTO" | "BANK" | "CASH";
type BankingDetail = {
  accountNumber: string | null;
  ifsc: string | null;
  upiId: string | null;
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

async function withdrawalTwoFactorError(
  user: { twoFactorEnabled: boolean; twoFactorSecret: string | null },
  formData: FormData,
): Promise<string | null> {
  if (!user.twoFactorEnabled) return null;
  if (!user.twoFactorSecret) return "Two-factor authentication is enabled but not configured correctly. Contact support before withdrawing.";

  const parsed = totpCodeSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Enter the 6-digit authenticator code.";
  if (!(await verifyTotp(parsed.data.code, user.twoFactorSecret))) {
    return "That authenticator code is incorrect or has expired. Enter the current 6-digit code.";
  }
  return null;
}
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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} USD${alreadyReserved > 0 ? ` after ${alreadyReserved.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD already reserved for other withdrawals` : ""}.`,
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
    select: { accountNumber: true, ifsc: true, upiId: true, accountType: true, usdtAddress: true, usdtNetwork: true },
  });
}

function parsedRequest(formData: FormData) {
  return withdrawSchema.safeParse({ amount: formData.get("amount"), method: formData.get("method") });
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

  const usdAmount = requestedUsdAmount(amount);
  const amountError = await validateWithdrawalAmount(user.id, toNumber(usdAmount));
  const destination = profileDestination(method, banking);
  if (!destination) return { error: missingPayoutDetailsMessage(method) };
  if (amountError) return amountError;

  const twoFactorError = await withdrawalTwoFactorError(user, formData);
  if (twoFactorError) return { error: twoFactorError };

  await prisma.withdrawal.create({
    data: {
      userId: user.id,
      method,
      amount: usdAmount,
      requestedInrAmount: null,
      requestExchangeRate: null,
      network: destination.network,
      address: destination.address,
      weekKey: currentWeekKey(),
      ...(method === "BANK" && banking
        ? {
            payoutAccountNumber: banking.accountNumber,
            payoutIfsc: banking.ifsc,
            payoutUpiId: banking.upiId,
            payoutAccountType: banking.accountType,
            payoutDetailsApprovedAt: new Date(),
            payoutDetailAudits: {
              create: {
                action: "REQUEST_SNAPSHOT",
                actorId: user.id,
                actorRole: "USER",
                accountNumber: banking.accountNumber,
                ifsc: banking.ifsc,
                upiId: banking.upiId,
                accountType: banking.accountType,
              },
            },
          }
        : {}),
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

  const usdAmount = requestedUsdAmount(amount);
  const amountError = await validateWithdrawalAmount(user.id, toNumber(usdAmount), id);
  const destination = profileDestination(method, banking);
  if (!destination) return { error: missingPayoutDetailsMessage(method) };
  if (amountError) return amountError;

  const twoFactorError = await withdrawalTwoFactorError(user, formData);
  if (twoFactorError) return { error: twoFactorError };

  const result = await prisma.withdrawal.updateMany({
    where: { id, userId: user.id, status: "REQUESTED" },
    data: {
      method,
      amount: usdAmount,
      requestedInrAmount: null,
      requestExchangeRate: null,
      network: destination.network,
      address: destination.address,
      payoutAccountNumber: method === "BANK" ? banking?.accountNumber : null,
      payoutIfsc: method === "BANK" ? banking?.ifsc : null,
      payoutUpiId: method === "BANK" ? banking?.upiId : null,
      payoutAccountType: method === "BANK" ? banking?.accountType : null,
      payoutDetailsApprovedAt: method === "BANK" ? new Date() : null,
      proposedAccountNumber: null,
      proposedIfsc: null,
      proposedUpiId: null,
      proposedAccountType: null,
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
