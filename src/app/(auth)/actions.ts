"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setSessionCookie, clearSessionCookie, getSession } from "@/lib/auth";
import { verifyTotp } from "@/lib/totp";
import { signupSchema, signinSchema, totpCodeSchema } from "@/lib/validation";

export type AuthFormState = { error?: string };

export async function signup(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  }
  const { fullName, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with this email already exists. Try signing in." };

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, fullName, wallet: { create: {} } },
  });

  await setSessionCookie({ sub: user.id, role: user.role, stage: "full" });
  redirect("/app");
}

export async function signin(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signinSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  const ok = user !== null && (await bcrypt.compare(password, user.passwordHash));
  if (!user || !ok) return { error: "Incorrect email or password." };

  if (user.twoFactorEnabled) {
    await setSessionCookie({ sub: user.id, role: user.role, stage: "2fa" });
    redirect("/signin/2fa");
  }

  await setSessionCookie({ sub: user.id, role: user.role, stage: "full" });
  redirect(user.role === "ADMIN" ? "/admin" : "/app");
}

export async function verifyTwoFactor(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const session = await getSession();
  if (!session) redirect("/signin");

  const parsed = totpCodeSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter the 6-digit code" };
  }

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) redirect("/signin");

  if (!(await verifyTotp(parsed.data.code, user.twoFactorSecret))) {
    return { error: "That code didn't match. Codes rotate every 30 seconds — try the current one." };
  }

  await setSessionCookie({ sub: user.id, role: user.role, stage: "full" });
  redirect(user.role === "ADMIN" ? "/admin" : "/app");
}

export async function signout(): Promise<void> {
  await clearSessionCookie();
  redirect("/");
}
