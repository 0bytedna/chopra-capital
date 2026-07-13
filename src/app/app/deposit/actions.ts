"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { depositSchema } from "@/lib/validation";
import { MIN_DEPOSIT_USDT } from "@/lib/config";
import { D } from "@/lib/money";

export type DepositFormState = { error?: string; success?: string };

export async function submitDeposit(_prev: DepositFormState, formData: FormData): Promise<DepositFormState> {
  const user = await requireUser();

  if (user.kycStatus !== "APPROVED") {
    return { error: "Identity verification is required before depositing. Complete KYC from your profile." };
  }

  const parsed = depositSchema.safeParse({
    amount: formData.get("amount"),
    network: formData.get("network"),
    txHash: formData.get("txHash"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  }

  const { amount, network, txHash } = parsed.data;
  if (amount < MIN_DEPOSIT_USDT) {
    return { error: `The minimum deposit is $${MIN_DEPOSIT_USDT.toLocaleString()} USDT.` };
  }

  await prisma.deposit.create({
    data: {
      userId: user.id,
      amount: D(amount),
      network,
      txHash: txHash || null,
    },
  });

  revalidatePath("/app/deposit");
  return {
    success:
      "Deposit submitted. Our team will confirm it on-chain — it will appear in your balance once confirmed.",
  };
}
