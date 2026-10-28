import { NextResponse, type NextRequest } from "next/server";
import type { Prisma, TradingAdjustmentType } from "@prisma/client";
import { getFullSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reportingDayEnd, reportingDayStart } from "@/lib/reportingCalendar";

const TYPES: TradingAdjustmentType[] = ["TRADING_PROFIT", "TRADING_LOSS", "SERVER_FEE", "ADMIN_SHARE", "OTHER_INCREASE", "OTHER_DECREASE", "MANUAL_SNAPSHOT", "USER_DEPOSIT", "USER_WITHDRAWAL"];
const csv = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export async function GET(request: NextRequest) {
  const session = await getFullSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const params = request.nextUrl.searchParams;
  const type = params.get("type") ?? "";
  const admin = params.get("admin") ?? "";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const where: Prisma.TradingAccountEntryWhereInput = {
    ...(TYPES.includes(type as TradingAdjustmentType) ? { type: type as TradingAdjustmentType } : {}),
    ...(admin ? { adminId: admin } : {}),
    ...(/^\d{4}-\d{2}-\d{2}$/.test(from) || /^\d{4}-\d{2}-\d{2}$/.test(to) ? { createdAt: { ...(/^\d{4}-\d{2}-\d{2}$/.test(from) ? { gte: reportingDayStart(from) } : {}), ...(/^\d{4}-\d{2}-\d{2}$/.test(to) ? { lte: reportingDayEnd(to) } : {}) } } : {}),
  };
  const entries = await prisma.tradingAccountEntry.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], include: { admin: { select: { fullName: true, email: true } } } });
  const rows = ["Date,Type,Amount,Balance Before,Balance After,Administrator,Note", ...entries.map((entry) => [entry.createdAt.toISOString(), entry.type, entry.amount, entry.balanceBefore, entry.balanceAfter, entry.admin.fullName ?? entry.admin.email, entry.note].map(csv).join(","))];
  return new NextResponse(rows.join("\r\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="trading-audit-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "private, no-store" } });
}
