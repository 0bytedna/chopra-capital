// GET /api/portfolio?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns the signed-in investor's value series and headline metrics.
// Polled by the dashboard every 15 seconds.

import { NextResponse, type NextRequest } from "next/server";
import { getFullSession } from "@/lib/auth";
import { getPortfolioMetrics, getPortfolioSeries } from "@/lib/portfolio";
import { toNumber } from "@/lib/money";

export async function GET(request: NextRequest) {
  const session = await getFullSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const [series, metrics] = await Promise.all([
    getPortfolioSeries(session.sub, from, to),
    getPortfolioMetrics(session.sub),
  ]);

  return NextResponse.json({
    series: series.series,
    profitInRange: series.profitInRange,
    metrics: {
      currentValue: toNumber(metrics.currentValue),
      queued: toNumber(metrics.queued),
      inPool: toNumber(metrics.units.mul(metrics.nav)),
      totalDeposits: toNumber(metrics.totalDeposits),
      netWithdrawals: toNumber(metrics.netWithdrawals),
      netInvestedInPool: toNumber(metrics.netInvestedInPool),
      bookedProfit: toNumber(metrics.bookedProfit),
      unrealizedProfit: toNumber(metrics.unrealizedProfit),
      nav: toNumber(metrics.nav),
      navLive: metrics.navLive,
    },
  });
}
