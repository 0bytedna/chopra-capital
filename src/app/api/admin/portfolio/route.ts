import { NextResponse, type NextRequest } from "next/server";
import { getFullSession } from "@/lib/auth";
import { getPoolPortfolioSeries } from "@/lib/poolPortfolio";

export async function GET(request: NextRequest) {
  const session = await getFullSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const result = await getPoolPortfolioSeries(
    searchParams.get("from") ?? undefined,
    searchParams.get("to") ?? undefined,
  );

  return NextResponse.json(result, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
