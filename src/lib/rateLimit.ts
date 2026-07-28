import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitState = {
  entries: Map<string, RateLimitEntry>;
  lastSweepAt: number;
};

const globalRateLimit = globalThis as typeof globalThis & {
  __chopraRateLimit?: RateLimitState;
};

const state =
  globalRateLimit.__chopraRateLimit ??
  (globalRateLimit.__chopraRateLimit = {
    entries: new Map(),
    lastSweepAt: Date.now(),
  });

function fingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function clientAddress(): Promise<string> {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || requestHeaders.get("x-real-ip")?.trim() || "unknown";
}

function sweepExpired(now: number): void {
  if (now - state.lastSweepAt < 5 * 60_000 && state.entries.size < 10_000) return;
  for (const [key, entry] of state.entries) {
    if (entry.resetAt <= now) state.entries.delete(key);
  }
  state.lastSweepAt = now;
}

/**
 * A single-process protection layer for authentication Server Actions.
 * The production reverse proxy should also rate-limit auth routes.
 */
export async function authRateLimit(
  scope: string,
  subject: string,
  limit: number,
  windowMs: number,
): Promise<number | null> {
  const now = Date.now();
  sweepExpired(now);

  const address = await clientAddress();
  const key = fingerprint(`${scope}:${address}:${subject.trim().toLowerCase()}`);
  const current = state.entries.get(key);

  if (!current || current.resetAt <= now) {
    state.entries.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (current.count >= limit) {
    return Math.max(1, Math.ceil((current.resetAt - now) / 1000));
  }

  current.count += 1;
  return null;
}

export function rateLimitMessage(retryAfterSeconds: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}
