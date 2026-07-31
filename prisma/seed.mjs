// No user or administrator accounts are seeded.
// The built-in administrator is created on first sign-in from ADMIN_EMAIL and
// ADMIN_PASSWORD. This seed only creates non-sensitive application defaults.
import { PrismaClient } from "../src/generated/prisma/index.js";
const prisma = new PrismaClient();
async function main() {
  await prisma.poolState.upsert({ where: { id: "pool" }, update: {}, create: { id: "pool" } });
  await prisma.setting.upsert({ where: { key: "WITHDRAWAL_INR_PER_USD" }, update: { value: "100" }, create: { key: "WITHDRAWAL_INR_PER_USD", value: "100" } });
  console.log("Application defaults ready. No accounts were seeded.");
}
main().finally(() => prisma.$disconnect());