// Custom auth: bcryptjs password hashing + jose JWT in an httpOnly cookie.
// Two-stage sessions: stage "2fa" means the password was correct but a TOTP
// code is still required; only stage "full" grants access to /app and /admin.

import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import type { User } from "@/generated/prisma";

export const SESSION_COOKIE = "gf_session";
const SESSION_DAYS = 7;

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to a string of 32+ characters");
  }
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  sub: string;
  role: "USER" | "ADMIN";
  stage: "full" | "2fa";
};

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.sub !== "string") return null;
    return {
      sub: payload.sub,
      role: payload.role === "ADMIN" ? "ADMIN" : "USER",
      stage: payload.stage === "2fa" ? "2fa" : "full",
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await createSessionToken(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** Full session or null — never a half-finished 2FA login. */
export async function getFullSession(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session || session.stage !== "full") return null;
  return session;
}

/** Loads the signed-in user or redirects to /signin. For /app pages. */
export async function requireUser(): Promise<User> {
  const session = await getFullSession();
  if (!session) redirect("/signin");
  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user) redirect("/signin");
  return user;
}

/** Loads the signed-in admin or redirects. For /admin pages. */
export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/app");
  return user;
}
