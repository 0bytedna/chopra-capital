"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { depositSchema } from "@/lib/validation";
import { MIN_DEPOSIT_USDT } from "@/lib/config";
import { D } from "@/lib/money";
import { getDepositEligibility, type FinancialRestriction } from "@/lib/financialEligibility";

export type DepositFormState = { error?: string; success?: string; restriction?: FinancialRestriction };

function isCryptoAmountValid(method: "CRYPTO" | "BANK" | "CASH", amount: number): boolean {
  return method !== "CRYPTO" || amount >= MIN_DEPOSIT_USDT;
}

function cryptoAmountError(): DepositFormState {
  return { error: `The minimum crypto deposit is $${MIN_DEPOSIT_USDT.toLocaleString()} USDT.` };
}

export async function submitDeposit(_prev: DepositFormState, formData: FormData): Promise<DepositFormState> {
  const user = await requireUser();
  const eligibility = getDepositEligibility(user);
  if (eligibility.restriction) return { restriction: eligibility.restriction };

  const parsed = depositSchema.safeParse({
    amount: formData.get("amount"),
    method: formData.get("method"),
    network: formData.get("network") ?? "",
    txHash: formData.get("txHash") ?? "",
    reference: formData.get("reference") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  }

  const { amount, method, network, txHash, reference } = parsed.data;
  if (!isCryptoAmountValid(method, amount)) return cryptoAmountError();

  if (method === "BANK" && !user.bankTransferEnabled) {
    return { error: "Bank transfer deposits are not enabled on your account. Contact support." };
  }
  if (method === "CASH" && !user.cashEnabled) {
    return { error: "Cash deposits are not enabled on your account. Contact support." };
  }

  await prisma.deposit.create({
    data: {
      userId: user.id,
      method,
      amount: method === "CRYPTO" ? D(amount) : D(0),
      reportedUsdtAmount: method === "CRYPTO" ? D(amount) : null,
      inrAmount: method === "CRYPTO" ? null : D(amount),
      network: method === "CRYPTO" ? (network || null) : null,
      txHash: method === "CRYPTO" ? (txHash || null) : null,
      reference: method === "BANK" ? reference : null,
    },
  });

  revalidatePath("/app/deposit");
  revalidatePath("/app/history");
  const methodLabel = method === "CRYPTO" ? "crypto" : method === "BANK" ? "bank transfer" : "cash";
  return {
    success: `Deposit submitted via ${methodLabel}. Crypto enters the queue after wallet verification. INR deposits enter after conversion to USDT, then queued funds are transferred to the broker on the weekend.`,
  };
}

export async function editDeposit(_prev: DepositFormState, formData: FormData): Promise<DepositFormState> {
  const user = await requireUser();
  const eligibility = getDepositEligibility(user);
  if (eligibility.restriction) return { error: eligibility.restriction.message };
  const id = String(formData.get("id") ?? "");

  const deposit = await prisma.deposit.findFirst({ where: { id, userId: user.id } });
  if (!deposit) return { error: "Deposit not found." };
  const isCorrection = deposit.status === "NEEDS_CORRECTION";
  if (deposit.status !== "PENDING" && !isCorrection) {
    return { error: "Only pending deposits or correction requests can be edited." };
  }

  const parsed = depositSchema.safeParse({
    amount: formData.get("amount"),
    method: formData.get("method"),
    network: formData.get("network") ?? "",
    txHash: formData.get("txHash") ?? "",
    reference: formData.get("reference") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  }

  const { amount, method, network, txHash, reference } = parsed.data;
  if (method !== deposit.method) return { error: "The deposit method cannot be changed." };
  if (!isCryptoAmountValid(method, amount)) return cryptoAmountError();

  if (isCorrection) {
    const originalAmount = method === "CRYPTO" ? deposit.reportedUsdtAmount ?? deposit.amount : deposit.inrAmount;
    if (!originalAmount || !D(amount).eq(originalAmount)) {
      return { error: "The deposited amount cannot be changed while correcting payment details." };
    }
    if (method === "CRYPTO" && network !== deposit.network) {
      return { error: "The selected network cannot be changed while correcting a transaction hash." };
    }
    if (method === "CRYPTO" && !txHash) return { error: "Enter the corrected transaction hash." };

    await prisma.deposit.update({
      where: { id: deposit.id },
      data: {
        ...(method === "CRYPTO" ? { txHash } : { reference }),
        status: "PENDING",
      },
    });

    revalidatePath("/app/deposit");
  revalidatePath("/app/history");
    revalidatePath("/admin");
    revalidatePath("/admin/deposits");
    return { success: "Corrected payment details submitted for review." };
  }

  await prisma.deposit.update({
    where: { id: deposit.id },
    data: {
      amount: method === "CRYPTO" ? D(amount) : D(0),
      reportedUsdtAmount: method === "CRYPTO" ? D(amount) : null,
      inrAmount: method === "CRYPTO" ? null : D(amount),
      network: method === "CRYPTO" ? (network || null) : null,
      txHash: method === "CRYPTO" ? (txHash || null) : null,
      reference: method === "BANK" ? reference : null,
    },
  });

  revalidatePath("/app/deposit");
  revalidatePath("/app/history");
  revalidatePath("/admin/deposits");
  return { success: "Deposit information updated." };
}

export async function cancelDeposit(_prev: DepositFormState, formData: FormData): Promise<DepositFormState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");

  const deposit = await prisma.deposit.findFirst({ where: { id, userId: user.id } });
  if (!deposit) return { error: "Deposit not found." };
  if (deposit.status !== "PENDING") return { error: "Only pending deposits can be cancelled." };

  await prisma.deposit.update({
    where: { id: deposit.id },
    data: { status: "CANCELLED" },
  });

  revalidatePath("/app/deposit");
  revalidatePath("/app/history");
  revalidatePath("/admin");
  revalidatePath("/admin/deposits");
  return { success: "Deposit request cancelled." };
}
