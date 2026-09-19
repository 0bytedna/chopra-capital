"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setSessionCookie, clearSessionCookie, getSession } from "@/lib/auth";
import { verifyTotpOnce } from "@/lib/totp";
import { signupSchema, signinSchema, totpCodeSchema } from "@/lib/validation";
import { BUILTIN_ADMIN_EMAIL, ensureBuiltinAdminForSignin } from "@/lib/builtinAdmin";
import { authRateLimit, rateLimitMessage } from "@/lib/rateLimit";

export type AuthFormState = { error?: string };

export async function signup(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const retryAfter = await authRateLimit(
    "signup",
    String(formData.get("email") ?? ""),
    5,
    60 * 60_000,
  );
  if (retryAfter) return { error: rateLimitMessage(retryAfter) };
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  }
  const { fullName, email, password } = parsed.data;

  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (email !== BUILTIN_ADMIN_EMAIL && !existing) {
    try {
      await prisma.user.create({
        data: { email, passwordHash, fullName, wallet: { create: {} } },
      });
    } catch (error) {
      if ((error as { code?: string }).code !== "P2002") throw error;
    }
  }
  redirect("/signin?registered=1");
}

export async function signin(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const retryAfter = await authRateLimit(
    "signin",
    String(formData.get("email") ?? ""),
    10,
    15 * 60_000,
  );
  if (retryAfter) return { error: rateLimitMessage(retryAfter) };
  const parsed = signinSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  }
  const { email, password } = parsed.data;

  let user;
  try {
    user = (await ensureBuiltinAdminForSignin(email)) ?? (await prisma.user.findUnique({ where: { email } }));
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Administrator sign-in is not configured." };
  }
  const ok = user !== null && (await bcrypt.compare(password, user.passwordHash));
  if (!user || !ok) return { error: "Incorrect email or password." };

  if (user.twoFactorEnabled) {
    await setSessionCookie({ sub: user.id, role: user.role, stage: "2fa", sessionVersion: user.sessionVersion });
    redirect("/signin/2fa");
  }

  await setSessionCookie({ sub: user.id, role: user.role, stage: "full", sessionVersion: user.sessionVersion });
  redirect(user.role === "ADMIN" ? "/admin" : "/app");
}

export async function verifyTwoFactor(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const session = await getSession();
  if (!session || session.stage !== "2fa") redirect("/signin");

  const parsed = totpCodeSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter the 6-digit code" };
  }

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) redirect("/signin");

  if (!(await verifyTotpOnce(user.id, parsed.data.code, user.twoFactorSecret))) {
    return { error: "That code didn't match. Codes rotate every 30 seconds — try the current one." };
  }

  await setSessionCookie({ sub: user.id, role: user.role, stage: "full", sessionVersion: user.sessionVersion });
  redirect(user.role === "ADMIN" ? "/admin" : "/app");
}

export async function signout(): Promise<void> {
  const session = await getSession();
  if (session) {
    try {
      await prisma.user.updateMany({
        where: { id: session.sub, sessionVersion: session.sessionVersion },
        data: { sessionVersion: { increment: 1 } },
      });
    } catch {
      // Always clear the local cookie even if the database is temporarily unavailable.
    }
  }
  await clearSessionCookie();
  redirect("/");
}
