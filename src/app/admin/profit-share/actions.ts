"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { D, toNumber } from "@/lib/money";
import {
  applyProfitShareRun,
  getProfitSharePreview,
  reverseProfitShareRun,
  type ProfitShareFrequency,
  type ProfitShareInput,
  type ProfitShareMode,
} from "@/lib/profitShare";

export type SerializedProfitSharePreview = {
  frequency: ProfitShareFrequency;
  periodKey: string;
  periodLabel: string;
  cutoffDate: string;
  mode: ProfitShareMode;
  value: string;
  navPrice: number;
  totalEligibleProfit: number;
  totalCompanyShare: number;
  allocations: Array<{
    userId: string;
    name: string;
    email: string;
    profitBeforeShare: number;
    highWaterBefore: number;
    eligibleProfit: number;
    companyShare: number;
    balanceBefore: number;
    balanceAfter: number;
  }>;
};

export type ProfitShareActionState = {
  error?: string;
  success?: string;
  preview?: SerializedProfitSharePreview;
};

function fail(error: unknown): ProfitShareActionState {
  return {
    error: error instanceof Error ? error.message : "Something went wrong",
  };
}

function inputFrom(formData: FormData): ProfitShareInput {
  const frequency = String(formData.get("frequency") ?? "");
  const mode = String(formData.get("mode") ?? "");
  const valueRaw = String(formData.get("value") ?? "").trim();

  if (frequency !== "WEEKLY" && frequency !== "MONTHLY") {
    throw new Error("Choose weekly or monthly profit sharing");
  }
  if (mode !== "PERCENTAGE" && mode !== "FIXED_TOTAL") {
    throw new Error("Choose percentage or fixed-total profit sharing");
  }

  let value;
  try {
    value = D(valueRaw);
  } catch {
    throw new Error(
      mode === "PERCENTAGE"
        ? "Enter a valid percentage"
        : "Enter a valid fixed USD amount",
    );
  }

  return { frequency, mode, value };
}

export async function adminPreviewProfitShare(
  _previous: ProfitShareActionState,
  formData: FormData,
): Promise<ProfitShareActionState> {
  await requireAdmin();

  try {
    const preview = await getProfitSharePreview(inputFrom(formData));
    return {
      preview: {
        frequency: preview.frequency,
        periodKey: preview.periodKey,
        periodLabel: preview.periodLabel,
        cutoffDate: preview.cutoffDate,
        mode: preview.mode,
        value: preview.value.toString(),
        navPrice: toNumber(preview.navPrice),
        totalEligibleProfit: toNumber(preview.totalEligibleProfit),
        totalCompanyShare: toNumber(preview.totalCompanyShare),
        allocations: preview.allocations.map((allocation) => ({
          userId: allocation.userId,
          name: allocation.name,
          email: allocation.email,
          profitBeforeShare: toNumber(allocation.profitBeforeShare),
          highWaterBefore: toNumber(allocation.highWaterBefore),
          eligibleProfit: toNumber(allocation.eligibleProfit),
          companyShare: toNumber(allocation.companyShare),
          balanceBefore: toNumber(allocation.balanceBefore),
          balanceAfter: toNumber(allocation.balanceAfter),
        })),
      },
    };
  } catch (error) {
    return fail(error);
  }
}

export async function adminConfirmProfitShare(
  _previous: ProfitShareActionState,
  formData: FormData,
): Promise<ProfitShareActionState> {
  const admin = await requireAdmin();

  try {
    const result = await applyProfitShareRun(inputFrom(formData), admin.id);
    revalidatePath("/admin/profit-share");
    revalidatePath("/admin/investors");
    revalidatePath("/admin/investors/[id]", "page");
    revalidatePath("/admin");
    revalidatePath("/app");

    return {
      success: `${result.run.totalCompanyShare.toFixed(2)} USD deducted from investor accounts and the central trading balance from ${result.allocationCount} investor account${result.allocationCount === 1 ? "" : "s"}. The period is now locked.`,
    };
  } catch (error) {
    return fail(error);
  }
}
export async function adminReverseProfitShare(
  _previous: ProfitShareActionState,
  formData: FormData,
): Promise<ProfitShareActionState> {
  const admin = await requireAdmin();
  const runId = String(formData.get("runId") ?? "");
  if (!runId) return { error: "Profit-share settlement reference is missing" };
  try {
    const result = await reverseProfitShareRun(runId, admin.id);
    revalidatePath("/admin/profit-share");
    revalidatePath("/admin/investors");
    revalidatePath("/admin/investors/[id]", "page");
    revalidatePath("/admin");
    revalidatePath("/app");
    return { success: `${result.run.totalCompanyShare.toFixed(2)} USD was restored to ${result.allocationCount} investor account${result.allocationCount === 1 ? "" : "s"}. This period can now be settled again.` };
  } catch (error) {
    return fail(error);
  }
}