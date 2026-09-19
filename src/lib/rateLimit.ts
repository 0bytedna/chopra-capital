import "server-only";

import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

type RateLimitOptions = {
  /** Also limit this subject across every source address (used for TOTP). */
  subjectOnly?: boolean;
};

let lastCleanupAt = 0;

function fingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function clientAddress(): Promise<string> {
  const requestHeaders = await headers();
  // X-Forwarded-For is intentionally ignored: a client can prepend an
  // arbitrary value unless every proxy in the chain strips it. Production
  // must overwrite X-Real-IP with the connection address.
  const realIp = requestHeaders.get("x-real-ip")?.trim() ?? "";
  return isIP(realIp) ? realIp : "unknown";
}

async function consumeBucket(key: string, limit: number, windowMs: number): Promise<number | null> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  return prisma.$transaction(async (tx) => {
    const current = await tx.authRateLimit.findUnique({ where: { key } });
    if (!current || current.resetAt <= now) {
      await tx.authRateLimit.upsert({
        where: { key },
        create: { key, count: 1, resetAt },
        update: { count: 1, resetAt },
      });
      return null;
    }

    if (current.count >= limit) {
      return Math.max(1, Math.ceil((current.resetAt.getTime() - now.getTime()) / 1000));
    }

    await tx.authRateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
    return null;
  });
}

async function cleanupExpiredBuckets(now: number): Promise<void> {
  if (now - lastCleanupAt < 5 * 60_000) return;
  lastCleanupAt = now;
  try {
    await prisma.authRateLimit.deleteMany({ where: { resetAt: { lt: new Date(now) } } });
  } catch {
    // Cleanup is best-effort and must never make authentication unavailable.
  }
}

/**
 * Database-backed authentication throttling shared by every app process.
 * Every request consumes an address-wide bucket and an address+subject bucket,
 * so rotating email addresses does not bypass the protection.
 */
export async function authRateLimit(
  scope: string,
  subject: string,
  limit: number,
  windowMs: number,
  options: RateLimitOptions = {},
): Promise<number | null> {
  const now = Date.now();
  await cleanupExpiredBuckets(now);

  const address = await clientAddress();
  const normalizedSubject = subject.trim().toLowerCase().slice(0, 256) || "unknown";
  const buckets: Array<[string, number]> = [
    [`${scope}:ip:${address}`, Math.max(limit * 5, 25)],
    [`${scope}:ip-subject:${address}:${normalizedSubject}`, limit],
  ];
  if (options.subjectOnly) buckets.push([`${scope}:subject:${normalizedSubject}`, limit]);

  let retryAfter: number | null = null;
  for (const [rawKey, bucketLimit] of buckets) {
    const result = await consumeBucket(fingerprint(rawKey), bucketLimit, windowMs);
    if (result !== null) retryAfter = Math.max(retryAfter ?? 0, result);
  }
  return retryAfter;
}

export function rateLimitMessage(retryAfterSeconds: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}
