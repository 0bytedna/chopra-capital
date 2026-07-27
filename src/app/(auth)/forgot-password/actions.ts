"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyTotp } from "@/lib/totp";
import { signupSchema, totpCodeSchema } from "@/lib/validation";

const WHATSAPP_RECOVERY_URL = "https://wa.me/918123320128?text=Hello%20Chopra%20Capital%2C%20I%20need%20help%20resetting%20my%20account%20password.";

export type RecoveryState = {
  stage?: "email" | "two-factor" | "done";
  email?: string;
  error?: string;
  success?: string;
};

export async function beginPasswordRecovery(
  _previous: RecoveryState,
  formData: FormData,
): Promise<RecoveryState> {
  const parsed = signupSchema.shape.email.safeParse(formData.get("email"));
  if (!parsed.success) return { stage: "email", error: parsed.error.issues[0]?.message ?? "Enter a valid email." };

  const user = await prisma.user.findUnique({
    where: { email: parsed.data },
    select: { role: true, twoFactorEnabled: true, twoFactorSecret: true },
  });

  if (!user || user.role !== "USER" || !user.twoFactorEnabled || !user.twoFactorSecret) {
    redirect(WHATSAPP_RECOVERY_URL);
  }

  return { stage: "two-factor", email: parsed.data };
}

export async function resetPasswordWithTwoFactor(
  _previous: RecoveryState,
  formData: FormData,
): Promise<RecoveryState> {
  const emailResult = signupSchema.shape.email.safeParse(formData.get("email"));
  const codeResult = totpCodeSchema.safeParse({ code: formData.get("code") });
  const passwordResult = signupSchema.shape.password.safeParse(formData.get("password"));
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!emailResult.success) return { stage: "email", error: "Start the recovery process again." };
  if (!codeResult.success) return { stage: "two-factor", email: emailResult.data, error: codeResult.error.issues[0]?.message };
  if (!passwordResult.success) return { stage: "two-factor", email: emailResult.data, error: passwordResult.error.issues[0]?.message };
  if (passwordResult.data !== confirmPassword) return { stage: "two-factor", email: emailResult.data, error: "The new passwords do not match." };

  const user = await prisma.user.findUnique({
    where: { email: emailResult.data },
    select: { id: true, role: true, twoFactorEnabled: true, twoFactorSecret: true },
  });
  if (!user || user.role !== "USER" || !user.twoFactorEnabled || !user.twoFactorSecret) {
    redirect(WHATSAPP_RECOVERY_URL);
  }
  if (!(await verifyTotp(codeResult.data.code, user.twoFactorSecret))) {
    return { stage: "two-factor", email: emailResult.data, error: "That authenticator code is incorrect or has expired." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(passwordResult.data, 12) },
  });

  return { stage: "done", success: "Your password has been reset. You can now sign in with the new password." };
}