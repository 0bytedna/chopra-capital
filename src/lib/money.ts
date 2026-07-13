// Money stays Prisma.Decimal everywhere in the data layer. These helpers are
// the ONLY place Decimal becomes a JS number — at the display/serialization
// edge.

import { Prisma } from "@/generated/prisma";

export type Dec = Prisma.Decimal;

export function D(value: Prisma.Decimal.Value): Dec {
  return new Prisma.Decimal(value);
}

export const ZERO = new Prisma.Decimal(0);

export function toNumber(value: Prisma.Decimal.Value | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return new Prisma.Decimal(value).toNumber();
}

export function formatUsdt(value: Prisma.Decimal.Value | null | undefined, decimals = 2): string {
  const n = toNumber(value);
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatSignedUsdt(value: Prisma.Decimal.Value | null | undefined): string {
  const n = toNumber(value);
  const formatted = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${n < 0 ? "−" : "+"}${formatted}`;
}
