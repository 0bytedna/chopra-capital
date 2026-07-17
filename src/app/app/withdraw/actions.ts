"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withdrawSchema } from "@/lib/validation";
import { currentWeekKey, withdrawalRequestWindowMessage, withdrawalsOpenNow, NETWORKS } from "@/lib/config";
import { getPortfolioMetrics } from "@/lib/portfolio";
import { D, toNumber } from "@/lib/money";

type WithdrawalMethod = "CRYPTO" | "BANK" | "CASH";
type BankingDetail = {
  accountNumber: string | null;
  ifsc: string | null;
  upiId: string | null;
  usdtAddress: string | null;
  usdtNetwork: string | null;
};

export type WithdrawFormState = { error?: string; success?: string; windowError?: string };

function profileDestination(method: WithdrawalMethod, banking: BankingDetail | null): { network: string; address: string } | null {
  if (method === "CASH") return { network: "CASH", address: "Cash collection" };
  if (!banking) return null;

  if (method === "CRYPTO") {
    const network = banking.usdtNetwork?.trim() ?? "";
    const address = banking.usdtAddress?.trim() ?? "";
    if (!address || !(NETWORKS as readonly string[]).includes(network)) return null;
    return { network, address };
  }

  const upiId = banking.upiId?.trim() ?? "";
  if (upiId) return { network: "BANK", address: `UPI: ${upiId}` };

  const accountNumber = banking.accountNumber?.trim() ?? "";
  if (!accountNumber) return null;
  return { network: "BANK", address: `Bank account ending ${accountNumber.slice(-4)}` };
}

function missingPayoutDetailsMessage(method: WithdrawalMethod): string {
  if (method === "CRYPTO") return "Add a USDT address and network in Profile & Security before requesting a crypto withdrawal.";
  if (method === "BANK") return "Add your bank account or UPI details in Profile & Security before requesting a bank withdrawal.";
  return "";
}

function balanceError(available: number, alreadyRequested: number): WithdrawFormState {
  return {
    error: `That exceeds your available balance of ${available.toLocaleString("en-US", {
      maximumFractionDigits: 2,
    })} USDT${alreadyRequested > 0 ? ` (you already have ${alreadyRequested.toLocaleString("en-US", { maximumFractionDigits: 2 })} USDT queued for withdrawal)` : ""}.`,
  };
}

async function validateWithdrawalAmount(userId: string, amount: number, excludingId?: string): Promise<WithdrawFormState | null> {
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
  const alreadyRequested = toNumber(pendingAgg._sum.amount ?? 0);

  return amount + alreadyRequested > available + 0.01 ? balanceError(available, alreadyRequested) : null;
}

async function getBankingDetail(userId: string): Promise<BankingDetail | null> {
  return prisma.bankingDetail.findUnique({
    where: { userId },
    select: { accountNumber: true, ifsc: true, upiId: true, usdtAddress: true, usdtNetwork: true },
  });
}

function parsedRequest(formData: FormData) {
  return withdrawSchema.safeParse({ amount: formData.get("amount"), method: formData.get("method") });
}

export async function requestWithdrawal(_prev: WithdrawFormState, formData: FormData): Promise<WithdrawFormState> {
  const user = await requireUser();

  if (!withdrawalsOpenNow()) return { windowError: withdrawalRequestWindowMessage() };

  const parsed = parsedRequest(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const { amount, method } = parsed.data;
  const [banking, amountError] = await Promise.all([getBankingDetail(user.id), validateWithdrawalAmount(user.id, amount)]);
  const destination = profileDestination(method, banking);
  if (!destination) return { error: missingPayoutDetailsMessage(method) };
  if (amountError) return amountError;

  await prisma.withdrawal.create({
    data: {
      userId: user.id,
      method,
      amount: D(amount),
      network: destination.network,
      address: destination.address,
      weekKey: currentWeekKey(),
    },
  });

  revalidatePath("/app/withdraw");
  revalidatePath("/admin/withdrawals");
  revalidatePath("/admin");
  return { success: "Withdrawal requested. Our team will review it and process approved withdrawals on Monday." };
}

export async function editWithdrawal(_prev: WithdrawFormState, formData: FormData): Promise<WithdrawFormState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Withdrawal request not found." };

  const withdrawal = await prisma.withdrawal.findFirst({ where: { id, userId: user.id }, select: { status: true } });
  if (!withdrawal) return { error: "Withdrawal request not found." };
  if (withdrawal.status !== "REQUESTED") return { error: "Only pending withdrawal requests can be edited." };

  const parsed = parsedRequest(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const { amount, method } = parsed.data;
  const [banking, amountError] = await Promise.all([
    getBankingDetail(user.id),
    validateWithdrawalAmount(user.id, amount, id),
  ]);
  const destination = profileDestination(method, banking);
  if (!destination) return { error: missingPayoutDetailsMessage(method) };
  if (amountError) return amountError;

  const result = await prisma.withdrawal.updateMany({
    where: { id, userId: user.id, status: "REQUESTED" },
    data: { method, amount: D(amount), network: destination.network, address: destination.address },
  });
  if (result.count === 0) return { error: "This request is no longer pending and cannot be edited." };

  revalidatePath("/app/withdraw");
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
  revalidatePath("/admin/withdrawals");
  revalidatePath("/admin");
  return { success: "Withdrawal request cancelled." };
}
