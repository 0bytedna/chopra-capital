// POST /api/mt5/ingest — receives account + trade data from the external MT5
// bridge script. Secured by the X-MT5-Token shared secret. Every push also
// refreshes pool NAV state and the daily NavSnapshot, which is what keeps the
// investor charts honest.

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { D } from "@/lib/money";
import { getPoolState, upsertDailySnapshot } from "@/lib/nav";

const tradeSchema = z.object({
  ticket: z.union([z.string(), z.number()]).transform(String),
  symbol: z.string(),
  type: z.string(),
  volume: z.number(),
  openPrice: z.number(),
  closePrice: z.number().nullable().optional(),
  profit: z.number().optional().default(0),
  swap: z.number().optional().default(0),
  commission: z.number().optional().default(0),
  status: z.enum(["OPEN", "CLOSED"]),
  openTime: z.coerce.date(),
  closeTime: z.coerce.date().nullable().optional(),
});

const ingestSchema = z.object({
  account: z.object({
    login: z.union([z.string(), z.number()]).transform(String),
    name: z.string().optional(),
    server: z.string().optional(),
    currency: z.string().optional().default("USD"),
    balance: z.number(),
    equity: z.number(),
    margin: z.number().optional().default(0),
    freeMargin: z.number().optional().default(0),
  }),
  trades: z.array(tradeSchema).optional().default([]),
});

export async function POST(request: NextRequest) {
  const token = request.headers.get("x-mt5-token");
  const expected = process.env.MT5_INGEST_TOKEN;
  if (!expected || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ingestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }
  const { account, trades } = parsed.data;

  await prisma.mt5Account.upsert({
    where: { login: account.login },
    update: {
      name: account.name,
      server: account.server,
      currency: account.currency,
      balance: account.balance,
      equity: account.equity,
      margin: account.margin,
      freeMargin: account.freeMargin,
    },
    create: {
      login: account.login,
      name: account.name,
      server: account.server,
      currency: account.currency,
      balance: account.balance,
      equity: account.equity,
      margin: account.margin,
      freeMargin: account.freeMargin,
    },
  });

  for (const t of trades) {
    await prisma.mt5Trade.upsert({
      where: { ticket: t.ticket },
      update: {
        symbol: t.symbol,
        type: t.type,
        volume: t.volume,
        openPrice: t.openPrice,
        closePrice: t.closePrice ?? null,
        profit: t.profit,
        swap: t.swap,
        commission: t.commission,
        status: t.status,
        openTime: t.openTime,
        closeTime: t.closeTime ?? null,
      },
      create: {
        ticket: t.ticket,
        symbol: t.symbol,
        type: t.type,
        volume: t.volume,
        openPrice: t.openPrice,
        closePrice: t.closePrice ?? null,
        profit: t.profit,
        swap: t.swap,
        commission: t.commission,
        status: t.status,
        openTime: t.openTime,
        closeTime: t.closeTime ?? null,
      },
    });
  }

  // Refresh pool NAV from live equity and record today's snapshot.
  const pool = await getPoolState();
  const totalUnits = D(pool.totalUnits);
  const equity = D(account.equity);
  const nav = totalUnits.gt(0) && equity.gt(0) ? equity.div(totalUnits) : D(pool.lastNav);

  await prisma.poolState.update({ where: { id: "pool" }, data: { lastNav: nav } });
  await upsertDailySnapshot(nav, equity, totalUnits);

  return NextResponse.json({ ok: true, trades: trades.length });
}
