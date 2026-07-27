import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const BUILTIN_ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "admin@chopracapital.com").trim().toLowerCase();

export async function ensureBuiltinAdminForSignin(email: string) {
  if (email.trim().toLowerCase() !== BUILTIN_ADMIN_EMAIL) return null;
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 12) throw new Error("The built-in administrator is locked until ADMIN_PASSWORD is set to at least 12 characters on the server.");

  const existing = await prisma.user.findUnique({ where: { email: BUILTIN_ADMIN_EMAIL } });
  if (!existing) {
    return prisma.user.create({ data: { email: BUILTIN_ADMIN_EMAIL, passwordHash: await bcrypt.hash(password, 12), role: "ADMIN", fullName: "Administrator", kycStatus: "APPROVED" } });
  }
  const passwordMatchesEnvironment = await bcrypt.compare(password, existing.passwordHash);
  if (existing.role !== "ADMIN" || !passwordMatchesEnvironment) {
    return prisma.user.update({ where: { id: existing.id }, data: { role: "ADMIN", passwordHash: await bcrypt.hash(password, 12) } });
  }
  return existing;
}