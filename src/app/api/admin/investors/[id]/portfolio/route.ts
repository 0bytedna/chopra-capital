import { NextResponse, type NextRequest } from "next/server";
import { getFullSession } from "@/lib/auth";
import { getPortfolioSeries } from "@/lib/portfolio";
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
    select: { id: true },
  });
  if (!investor) {
    return NextResponse.json({ error: "Investor not found" }, { status: 404 });
  }

  const { searchParams } = request.nextUrl;
  const result = await getPortfolioSeries(
    investor.id,
    searchParams.get("from") ?? undefined,
    searchParams.get("to") ?? undefined,
  );

  return NextResponse.json(
    {
      series: result.series,
      profitInRange: result.profitInRange,
      firstActivityDate: result.firstActivityDate,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}