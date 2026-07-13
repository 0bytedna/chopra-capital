"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withdrawSchema } from "@/lib/validation";
import { withdrawalsOpenNow, currentWeekKey } from "@/lib/config";
import { getPortfolioMetrics } from "@/lib/portfolio";
import { D, toNumber } from "@/lib/money";

export type WithdrawFormState = { error?: string; success?: string };

export async function requestWithdrawal(_prev: WithdrawFormState, formData: FormData): Promise<WithdrawFormState> {
  const user = await requireUser();

  if (!withdrawalsOpenNow()) {
    return { error: "Withdrawal requests open on Saturdays and are processed on Sundays." };
  }

  const parsed = withdrawSchema.safeParse({
    amount: formData.get("amount"),
    network: formData.get("network"),
    address: formData.get("address"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  }
  const { amount, network, address } = parsed.data;

  const metrics = await getPortfolioMetrics(user.id);
  const available = toNumber(metrics.currentValue);

  const pendingAgg = await prisma.withdrawal.aggregate({
    where: { userId: user.id, status: { in: ["REQUESTED", "APPROVED"] } },
    _sum: { amount: true },
  });
  const alreadyRequested = toNumber(pendingAgg._sum.amount ?? 0);

  if (amount + alreadyRequested > available + 0.01) {
    return {
      error: `That exceeds your available balance of ${available.toLocaleString("en-US", {
        maximumFractionDigits: 2,
      })} USDT${alreadyRequested > 0 ? ` (you already have ${alreadyRequested.toLocaleString("en-US", { maximumFractionDigits: 2 })} USDT queued for withdrawal)` : ""}.`,
    };
  }

  await prisma.withdrawal.create({
    data: {
      userId: user.id,
      amount: D(amount),
      network,
      address,
      weekKey: currentWeekKey(),
    },
  });

  revalidatePath("/app/withdraw");
  return {
    success:
      "Withdrawal requested. It will be reviewed and processed on Sunday at the prevailing NAV, then paid to your address.",
  };
}
