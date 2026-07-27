"use server";

import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
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

export type ProfileFormState = { error?: string; success?: string };

export async function updateProfile(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    mobile: formData.get("mobile"),
    country: formData.get("country"),
    address: formData.get("address"),
    city: formData.get("city"),
    state: formData.get("state"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      fullName: parsed.data.fullName,
      mobile: parsed.data.mobile || null,
      country: parsed.data.country || null,
      address: parsed.data.address || null,
      city: parsed.data.city || null,
      state: parsed.data.state || null,
    },
  });
  revalidatePath("/app/profile");
  return { success: "Profile updated." };
}

// --- Banking / financial details -------------------------------------------

export type FinancialDetailsFormState = { error?: string; success?: string };

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

  await prisma.bankingDetail.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      accountNumber: parsed.data.accountNumber || null,
      ifsc: parsed.data.ifsc || null,
      upiId: parsed.data.upiId || null,
      accountType: parsed.data.accountType,
    },
    update: {
      accountNumber: parsed.data.accountNumber || null,
      ifsc: parsed.data.ifsc || null,
      upiId: parsed.data.upiId || null,
      accountType: parsed.data.accountType,
    },
  });
  revalidatePath("/app/profile");
  return { success: "Banking details saved." };
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
  return { success: "Crypto wallet saved." };
}

// --- KYC upload -------------------------------------------------------------

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf"]);

async function saveKycFile(userId: string, file: File, docType: string): Promise<void> {
  const ext = path.extname(file.name).toLowerCase() || ".bin";
  if (!ALLOWED_EXT.has(ext)) throw new Error("Only JPG, PNG, WEBP or PDF files are accepted");
  if (file.size === 0) throw new Error("File is empty");
  if (file.size > MAX_FILE_BYTES) throw new Error("Files must be under 8 MB");

  const dir = path.join(process.cwd(), "uploads", "kyc", userId);
  await mkdir(dir, { recursive: true });
  const fileName = `${docType.toLowerCase()}-${Date.now()}${ext}`;
  const filePath = path.join(dir, fileName);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, bytes);

  await prisma.kycDocument.create({
    data: { userId, docType, fileName: file.name, filePath },
  });
}

export async function submitKyc(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const user = await requireUser();
  if (user.kycStatus === "PENDING") return { error: "Your documents are already in review." };
  if (user.kycStatus === "APPROVED") return { error: "Your identity is already verified." };

  const aadhaar = formData.get("aadhaar");
  const pan = formData.get("pan");
  if (!(aadhaar instanceof File) || aadhaar.size === 0) return { error: "Please attach your Aadhaar card." };
  if (!(pan instanceof File) || pan.size === 0) return { error: "Please attach your PAN card." };

  try {
    await saveKycFile(user.id, aadhaar, "AADHAAR");
    await saveKycFile(user.id, pan, "PAN");
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed — please try again." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { kycStatus: "PENDING", kycNote: null },
  });
  revalidatePath("/app/profile");
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
