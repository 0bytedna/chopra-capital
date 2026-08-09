"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  profileSchema,
  bankingDetailsSchema,
  cryptoWalletSchema,
  changePasswordSchema,
  totpCodeSchema,
} from "@/lib/validation";
import { generateTotpSecret, totpEnrolmentQr, verifyTotp } from "@/lib/totp";
import { stageRequiredBankPayoutCorrections } from "@/lib/payoutDetails";
import { removeStoredKycFiles, storeKycFiles } from "@/lib/kycFiles";

export type ProfileFormState = { error?: string; success?: string };

export async function updateProfile(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    mobile: formData.get("mobile"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      fullName: parsed.data.fullName,
      mobile: parsed.data.mobile || null,
    },
  });
  revalidatePath("/app/profile");
  return { success: "Profile updated." };
}

// --- Banking / financial details -------------------------------------------

export type FinancialDetailsFormState = {
  error?: string;
  success?: string;
  wallet?: {
    usdtAddress: string;
    usdtNetwork: "TRC20" | "ERC20" | "BEP20" | "";
  };
};

export async function updateBanking(
  _prev: FinancialDetailsFormState,
  formData: FormData,
): Promise<FinancialDetailsFormState> {
  const user = await requireUser();
  const parsed = bankingDetailsSchema.safeParse({
    accountNumber: formData.get("accountNumber"),
    ifsc: formData.get("ifsc"),
    upiId: formData.get("upiId"),
    accountType: formData.get("accountType") || "SAVINGS",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  }

  if (user.twoFactorEnabled) {
    if (!user.twoFactorSecret) {
      return { error: "Two-factor authentication is enabled but not configured correctly. Contact support." };
    }
    const code = totpCodeSchema.safeParse({ code: formData.get("code") });
    if (!code.success) {
      return { error: code.error.issues[0]?.message ?? "Enter the 6-digit authenticator code." };
    }
    if (!(await verifyTotp(code.data.code, user.twoFactorSecret))) {
      return { error: "That authenticator code is incorrect or has expired." };
    }
  }

  const heldPayouts = await prisma.withdrawal.count({
    where: {
      userId: user.id,
      method: "BANK",
      status: { in: ["PAYOUT_DETAILS_REQUIRED", "PAYOUT_DETAILS_REVIEW"] },
    },
  });
  if (
    heldPayouts > 0 &&
    (!parsed.data.accountNumber || !parsed.data.ifsc || !parsed.data.accountType)
  ) {
    return {
      error:
        "Enter a complete bank account number, IFSC, and account type to correct the held payout.",
    };
  }

  const details = {
    accountNumber: parsed.data.accountNumber || null,
    ifsc: parsed.data.ifsc || null,
    upiId: parsed.data.upiId || null,
    accountType: parsed.data.accountType,
  };
  let submittedForReview = 0;
  await prisma.$transaction(async (tx) => {
    await tx.bankingDetail.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...details },
      update: details,
    });
    if (details.accountNumber && details.ifsc && details.accountType) {
      submittedForReview = await stageRequiredBankPayoutCorrections(tx, {
        userId: user.id,
        details: {
          accountNumber: details.accountNumber,
          ifsc: details.ifsc,
          upiId: details.upiId,
          accountType: details.accountType,
        },
        actorId: user.id,
        actorRole: "USER",
      });
    }
  });
  revalidatePath("/app/profile");
  revalidatePath("/app/history");
  revalidatePath("/app", "layout");
  revalidatePath("/admin/withdrawals");
  revalidatePath("/admin");
  return {
    success:
      submittedForReview > 0
        ? `Banking details saved and submitted for ${submittedForReview} held payout${submittedForReview === 1 ? "" : "s"}. An admin must approve the new destination before payment.`
        : "Banking details saved.",
  };
}

export async function updateCryptoWallet(
  _prev: FinancialDetailsFormState,
  formData: FormData,
): Promise<FinancialDetailsFormState> {
  const user = await requireUser();
  const parsed = cryptoWalletSchema.safeParse({
    usdtAddress: formData.get("usdtAddress"),
    usdtNetwork: formData.get("usdtNetwork") || "TRC20",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  }

  await prisma.bankingDetail.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      usdtAddress: parsed.data.usdtAddress || null,
      usdtNetwork: parsed.data.usdtAddress ? parsed.data.usdtNetwork : null,
    },
    update: {
      usdtAddress: parsed.data.usdtAddress || null,
      usdtNetwork: parsed.data.usdtAddress ? parsed.data.usdtNetwork : null,
    },
  });
  revalidatePath("/app/profile");
  revalidatePath("/app", "layout");
  return {
    success: "Crypto wallet saved.",
    wallet: {
      usdtAddress: parsed.data.usdtAddress || "",
      usdtNetwork: parsed.data.usdtAddress ? parsed.data.usdtNetwork : "",
    },
  };
}

// --- KYC upload -------------------------------------------------------------

export async function submitKyc(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const user = await requireUser();
  if (user.kycStatus === "PENDING") return { error: "Your documents are already in review." };
  if (user.kycStatus === "APPROVED") return { error: "Your identity is already verified." };

  const aadhaar = formData.get("aadhaar");
  const pan = formData.get("pan");
  if (!(aadhaar instanceof File) || aadhaar.size === 0) return { error: "Please attach your Aadhaar card." };
  if (!(pan instanceof File) || pan.size === 0) return { error: "Please attach your PAN card." };

  let stored = [] as Awaited<ReturnType<typeof storeKycFiles>>;
  try {
    stored = await storeKycFiles(user.id, [
      { file: aadhaar, docType: "AADHAAR" },
      { file: pan, docType: "PAN" },
    ]);

    await prisma.$transaction(async (tx) => {
      const claimed = await tx.user.updateMany({
        where: { id: user.id, kycStatus: { in: ["NOT_SUBMITTED", "REJECTED"] } },
        data: { kycStatus: "PENDING", kycNote: null },
      });
      if (claimed.count !== 1) throw new Error("Your KYC status changed. Refresh the page and try again.");

      for (const document of stored) {
        await tx.kycDocument.create({ data: { userId: user.id, ...document } });
      }
    });
  } catch (error) {
    await removeStoredKycFiles(stored);
    return { error: error instanceof Error ? error.message : "Upload failed. Please try again." };
  }

  revalidatePath("/app/profile");
  revalidatePath("/app", "layout");
  return { success: "Documents submitted. We'll review them shortly." };
}
// --- TOTP 2FA -----------------------------------------------------------------

export type TotpEnrolState = { error?: string; qr?: string; secret?: string };

export async function startTotpEnrolment(): Promise<TotpEnrolState> {
  const user = await requireUser();
  if (user.twoFactorEnabled) return { error: "Two-factor authentication is already enabled." };

  const secret = generateTotpSecret();
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorSecret: secret, twoFactorEnabled: false },
  });
  const qr = await totpEnrolmentQr(user.email, secret);
  return { qr, secret };
}

export async function enableTotp(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const user = await requireUser();
  if (!user.twoFactorSecret) return { error: "Start enrolment first." };

  const parsed = totpCodeSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter the 6-digit code" };

  if (!(await verifyTotp(parsed.data.code, user.twoFactorSecret))) {
    return { error: "That code didn't match — scan the QR again and use the current code." };
  }

  await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } });
  revalidatePath("/app/profile");
  revalidatePath("/app", "layout");
  revalidatePath("/admin/security");
  return { success: "Two-factor authentication is now enabled." };
}

export async function disableTotp(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const user = await requireUser();
  if (!user.twoFactorEnabled || !user.twoFactorSecret) return { error: "Two-factor authentication is not enabled." };

  const parsed = totpCodeSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter the 6-digit code" };

  if (!(await verifyTotp(parsed.data.code, user.twoFactorSecret))) {
    return { error: "That code didn't match." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  });
  revalidatePath("/app/profile");
  revalidatePath("/app", "layout");
  revalidatePath("/admin/security");
  return { success: "Two-factor authentication disabled." };
}

// --- Password -------------------------------------------------------------------

export async function changePassword(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form" };

  const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!ok) return { error: "Your current password is incorrect." };

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  return { success: "Password changed." };
}
