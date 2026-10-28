"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createCommissionInvestmentDeposit } from "@/lib/referrals";

export type CommissionInvestmentState = {
  error?: string;
  success?: string;
};

export async function investCommissionBalance(
  _previous: CommissionInvestmentState,
  _formData: FormData,
): Promise<CommissionInvestmentState> {
  void _previous;
  void _formData;
  const user = await requireUser();
  try {
    const result = await createCommissionInvestmentDeposit(user.id);
    revalidatePath("/app/referrals");
    revalidatePath("/app/history");
    revalidatePath("/app");
    revalidatePath("/admin");
    revalidatePath("/admin/deposits");
    return {
      success: `${result.amount.toFixed(2)} USD was submitted as a new deposit for admin approval.`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "The investment request could not be created.",
    };
  }
}
