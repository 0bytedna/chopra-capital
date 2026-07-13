// GET /api/mt5/summary — latest account snapshot + open/recent trades for the
// signed-in investor's dashboard.

import { NextResponse } from "next/server";
import { getFullSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getFullSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [account, openTrades, recentClosed] = await Promise.all([
    prisma.mt5Account.findFirst({ orderBy: { updatedAt: "desc" } }),
    prisma.mt5Trade.findMany({ where: { status: "OPEN" }, orderBy: { openTime: "desc" }, take: 50 }),
    prisma.mt5Trade.findMany({ where: { status: "CLOSED" }, orderBy: { closeTime: "desc" }, take: 20 }),
  ]);

  return NextResponse.json({
    account: account
      ? {
          login: account.login,
          server: account.server,
          currency: account.currency,
          balance: account.balance,
          equity: account.equity,
          margin: account.margin,
          freeMargin: account.freeMargin,
          updatedAt: account.updatedAt,
        }
      : null,
    openTrades,
    recentClosed,
  });
}
