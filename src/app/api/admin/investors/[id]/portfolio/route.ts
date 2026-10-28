import { NextResponse, type NextRequest } from "next/server";
import { getFullSession } from "@/lib/auth";
import { getPortfolioMetrics, getPortfolioSeries } from "@/lib/portfolio";
import { toNumber } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getFullSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const investor = await prisma.user.findFirst({
    where: { id, role: "USER" },
    select: {
      id: true,
      fullName: true,
      email: true,
      kycStatus: true,
      twoFactorEnabled: true,
      referralEnabled: true,
      commissionWallet: { select: { balance: true } },
      _count: { select: { deposits: true, withdrawals: true } },
    },
  });
  if (!investor) {
    return NextResponse.json({ error: "Investor not found" }, { status: 404 });
  }

  const { searchParams } = request.nextUrl;
  const [result, metrics] = await Promise.all([
    getPortfolioSeries(
      investor.id,
      searchParams.get("from") ?? undefined,
      searchParams.get("to") ?? undefined,
    ),
    getPortfolioMetrics(investor.id),
  ]);

  return NextResponse.json(
    {
      series: result.series,
      profitInRange: result.profitInRange,
      firstActivityDate: result.firstActivityDate,
      investor: {
        id: investor.id,
        name: investor.fullName ?? investor.email,
        email: investor.email,
        kycStatus: investor.kycStatus,
        twoFactorEnabled: investor.twoFactorEnabled,
        referralEnabled: investor.referralEnabled,
        balance: toNumber(metrics.units.mul(metrics.nav)),
        queued: toNumber(metrics.queued),
        commission: toNumber(investor.commissionWallet?.balance),
        deposits: investor._count.deposits,
        withdrawals: investor._count.withdrawals,
      },
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
