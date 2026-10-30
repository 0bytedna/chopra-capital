import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDownToLine, ArrowLeft, ArrowUpFromLine, BadgeCheck, CircleDollarSign, Clock3, FileClock, FileText, Gift, Mail, ShieldCheck, Users, WalletCards } from "lucide-react";
import { CollapsibleCard } from "@/components/admin/CollapsibleCard";
import { InvestorAdminControls } from "@/components/admin/InvestorAdminControls";
import { InvestorAuditTrail, type InvestorAuditEntry } from "@/components/admin/InvestorAuditTrail";
import { PortfolioChart } from "@/components/app/PortfolioChart";
import { cn } from "@/lib/cn";
import { formatInr, formatUsdt, toNumber } from "@/lib/money";
import { getCurrentNav } from "@/lib/nav";
import { getPortfolioMetrics, getPortfolioSeries } from "@/lib/portfolio";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Admin · Investor record" };

const kycDetails = {
  NOT_SUBMITTED: { label: "Not submitted", className: "border-stone-300 bg-white text-ink-faint" },
  PENDING: { label: "In review", className: "border-gold-500 bg-white text-ink" },
  APPROVED: { label: "Verified", className: "border-positive/30 bg-positive/10 text-positive" },
  REJECTED: { label: "Rejected", className: "border-negative/30 bg-negative/10 text-negative" },
} as const;
const depositStatusLabels: Record<string, string> = { PENDING: "Pending", NEEDS_CORRECTION: "Action needed", RECEIVED: "Payment received", QUEUED: "In queue", CONFIRMED: "Invested", REJECTED: "Rejected", CANCELLED: "Cancelled" };
const withdrawalStatusLabels: Record<string, string> = { REQUESTED: "Requested", APPROVED: "Approved", BROKER_RECEIVED: "Received from broker", INR_READY: "INR ready", PAYOUT_DETAILS_REQUIRED: "Bank details required", PAYOUT_DETAILS_REVIEW: "Bank details in review", PROCESSED: "Processed", REJECTED: "Rejected", CANCELLED: "Cancelled" };
const methodLabels: Record<string, string> = { CRYPTO: "Crypto", BANK: "Bank transfer", CASH: "Cash" };

function formatDate(date: Date, withTime = false) {
  return date.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: true } : {}) });
}
function signedUsd(value: unknown) {
  const numeric = toNumber(value as never);
  return `${numeric > 0 ? "+" : ""}${formatUsdt(numeric)} USD`;
}
function MetricCard({ label, value, secondaryValue, detail, Icon, tone }: { label: string; value: string; secondaryValue?: string; detail?: string; Icon: typeof WalletCards; tone?: "positive" | "negative" }) {
  return <article className="relative min-w-0 rounded-xl border border-stone-200 bg-white p-3 sm:p-4">
    <p className="pr-7 text-xs uppercase tracking-[0.14em] text-ink-faint">{label}</p>
    <p className={cn("currency-value mt-1.5 whitespace-nowrap text-[clamp(0.78rem,3.6vw,1.125rem)]", tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : "text-ink")}>{value}</p>
    {secondaryValue && <p className="currency-value mt-1 whitespace-nowrap text-sm text-ink">{secondaryValue}</p>}
    <span className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-md border border-stone-200 bg-stone-50 text-gold-700"><Icon className="size-3.5" aria-hidden /></span>
    {detail && <p className="mt-1.5 line-clamp-2 text-[0.7rem] leading-4 text-ink-faint">{detail}</p>}
  </article>;
}

export default async function AdminInvestorRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const investor = await prisma.user.findFirst({
    where: { id, role: "USER" },
    select: {
      id: true, fullName: true, email: true, mobile: true, kycStatus: true, kycNote: true,
      bankTransferEnabled: true, cashEnabled: true, publicId: true, referralEnabled: true,
      twoFactorEnabled: true, createdAt: true, updatedAt: true, bankingDetail: true, commissionWallet: true,
      kycDocuments: { orderBy: { createdAt: "desc" } },
      referralReceived: { include: { referrer: { select: { id: true, fullName: true, email: true } } } },
      referralsMade: { orderBy: { createdAt: "desc" }, include: { referredUser: { select: { id: true, fullName: true, email: true } }, commissions: { select: { amount: true } } } },
      deposits: { orderBy: { createdAt: "desc" } },
      withdrawals: { orderBy: { createdAt: "desc" } },
      internalTransfersSent: { orderBy: { createdAt: "desc" }, include: { toUser: { select: { id: true, fullName: true, email: true } } } },
      internalTransfersReceived: { orderBy: { createdAt: "desc" }, include: { fromUser: { select: { id: true, fullName: true, email: true } } } },
    },
  });
  if (!investor) notFound();

  const [metrics, performance, navState] = await Promise.all([getPortfolioMetrics(investor.id), getPortfolioSeries(investor.id), getCurrentNav()]);
  const poolShare = navState.totalUnits.gt(0) ? toNumber(metrics.units.div(navState.totalUnits).mul(100)) : 0;
  const investedValue = metrics.units.mul(metrics.nav);
  const totalProfit = metrics.bookedProfit.add(metrics.unrealizedProfit);
  const kyc = kycDetails[investor.kycStatus];
  const transfers = [
    ...investor.internalTransfersSent.map((entry) => ({ ...entry, direction: "SENT" as const, counterparty: entry.toUser })),
    ...investor.internalTransfersReceived.map((entry) => ({ ...entry, direction: "RECEIVED" as const, counterparty: entry.fromUser })),
  ];
  const auditEntries: InvestorAuditEntry[] = [
    ...investor.deposits.map((entry) => ({ id: entry.id, type: "DEPOSIT" as const, date: entry.createdAt.toISOString(), title: "Deposit", amount: entry.inrAmount !== null ? `${formatInr(entry.inrAmount)} INR` : `${formatUsdt(entry.reportedUsdtAmount ?? entry.amount)} USDT`, status: depositStatusLabels[entry.status] ?? entry.status, method: methodLabels[entry.method], reference: entry.txHash ?? entry.reference ?? undefined, note: entry.adminNote ?? undefined, tone: "positive" as const })),
    ...investor.withdrawals.map((entry) => ({ id: entry.id, type: "WITHDRAWAL" as const, date: entry.createdAt.toISOString(), title: "Withdrawal", amount: `${formatUsdt(entry.amount)} USD`, status: withdrawalStatusLabels[entry.status] ?? entry.status, method: methodLabels[entry.method], reference: entry.txHash ?? undefined, note: entry.adminNote ?? undefined, tone: "negative" as const })),
    ...transfers.map((entry) => ({ id: entry.id, type: "TRANSFER" as const, date: entry.createdAt.toISOString(), title: `${entry.direction === "SENT" ? "Sent to" : "Received from"} ${entry.counterparty.fullName ?? entry.counterparty.email}`, amount: `${entry.direction === "SENT" ? "−" : "+"}${formatUsdt(entry.amount)} USD`, status: entry.direction === "SENT" ? "Sent" : "Received", method: "Internal transfer", note: entry.note ?? undefined, tone: entry.direction === "SENT" ? "negative" as const : "positive" as const })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return <div className="mx-auto max-w-7xl space-y-4 sm:space-y-5">
    <header>
      <Link href="/admin/investors" className="inline-flex items-center gap-2 text-xs text-ink-faint transition-colors hover:text-gold-700"><ArrowLeft className="size-3.5" aria-hidden />Back to investors</Link>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="eyebrow">Complete investor record</p><h1 className="mt-2 font-serif text-3xl text-ink">{investor.fullName ?? "Unnamed investor"}</h1><p className="mt-2 text-sm text-ink-dim">{investor.email}</p><p className="mt-1 text-xs text-ink-faint">Created {formatDate(investor.createdAt, true)} · Updated {formatDate(investor.updatedAt, true)}</p></div><span className={cn("inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium", kyc.className)}><ShieldCheck className="size-3.5" aria-hidden />KYC {kyc.label.toLowerCase()}</span></div>
    </header>

    <CollapsibleCard title="Portfolio summary" Icon={WalletCards} contentClassName="p-3 sm:p-4">
      <section className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-6" aria-label="Investor portfolio summary">
        <MetricCard label="Balance" value={`${formatUsdt(metrics.currentValue)} USD`} detail="Invested and queued" Icon={WalletCards} />
        <MetricCard label="In queue" value={`${formatUsdt(metrics.queued)} USD`} secondaryValue={`${formatInr(metrics.pendingInr)} INR`} Icon={Clock3} />
        <MetricCard label="Generated profit" value={signedUsd(totalProfit)} Icon={CircleDollarSign} tone={totalProfit.gt(0) ? "positive" : totalProfit.lt(0) ? "negative" : undefined} />
        <MetricCard label="Pool share" value={`${poolShare.toFixed(2)}%`} Icon={BadgeCheck} />
        <MetricCard label="Total deposits" value={`${formatUsdt(metrics.totalDeposits)} USD`} Icon={ArrowDownToLine} />
        <MetricCard label="Total withdrawals" value={`${formatUsdt(metrics.netWithdrawals)} USD`} Icon={ArrowUpFromLine} />
      </section>
    </CollapsibleCard>

    <CollapsibleCard title="Profit and balance history" Icon={CircleDollarSign}><PortfolioChart initialSeries={performance.series} firstActivityDate={performance.firstActivityDate} endpoint={`/api/admin/investors/${encodeURIComponent(investor.id)}/portfolio`} /></CollapsibleCard>

    <CollapsibleCard title="Audit trail" Icon={FileClock} count={auditEntries.length} contentClassName="p-0"><InvestorAuditTrail entries={auditEntries} /></CollapsibleCard>

    <CollapsibleCard title="Account details" Icon={Mail}>
      <InvestorAdminControls investor={{ id: investor.id, fullName: investor.fullName, email: investor.email, mobile: investor.mobile, kycStatus: investor.kycStatus, kycNote: investor.kycNote, bankTransferEnabled: investor.bankTransferEnabled, cashEnabled: investor.cashEnabled, twoFactorEnabled: investor.twoFactorEnabled, referralEnabled: investor.referralEnabled, bankingDetail: investor.bankingDetail }} queued={metrics.queued.toFixed(2)} invested={investedValue.toFixed(2)} />
      <div className="mt-5 border-t border-stone-200 pt-4"><p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">KYC documents</p><div className="mt-3 flex flex-wrap gap-2">{investor.kycDocuments.length > 0 ? investor.kycDocuments.map((document) => <a key={document.id} href={`/api/admin/kyc-file?id=${document.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-ink"><FileText className="size-3.5 text-gold-700" aria-hidden />{document.docType} · {formatDate(document.createdAt)}</a>) : <p className="text-xs text-ink-faint">No KYC documents on file.</p>}</div></div>
    </CollapsibleCard>

    <CollapsibleCard title="Referrals & commission" Icon={Gift}>
      <div className="grid gap-3 sm:grid-cols-3"><MetricCard label="Commission wallet" value={`${formatUsdt(investor.commissionWallet?.balance)} USD`} Icon={Gift} /><MetricCard label="Total commission" value={`${formatUsdt(investor.commissionWallet?.totalEarned)} USD`} Icon={CircleDollarSign} /><MetricCard label="Referred investors" value={String(investor.referralsMade.length)} Icon={Users} /></div>
      <div className="mt-4 grid gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 sm:grid-cols-2"><p className="text-sm text-ink"><span className="block text-xs uppercase tracking-wider text-ink-faint">Investor ID</span><span className="mt-1 block font-mono">{investor.publicId ?? "Not assigned"}</span></p><p className="text-sm text-ink"><span className="block text-xs uppercase tracking-wider text-ink-faint">Referred by</span><span className="mt-1 block">{investor.referralReceived ? investor.referralReceived.referrer.fullName ?? investor.referralReceived.referrer.email : "No referrer"}</span></p></div>
      <div className="mt-4 divide-y divide-stone-200">{investor.referralsMade.map((referral) => { const earned = referral.commissions.reduce((total, commission) => total + Number(commission.amount), 0); return <div key={referral.id} className="flex items-center justify-between gap-4 py-3"><Link href={`/admin/investors/${referral.referredUser.id}`} className="min-w-0 truncate text-sm font-medium text-ink hover:text-gold-700">{referral.referredUser.fullName ?? referral.referredUser.email}</Link><span className="currency-value shrink-0 text-sm text-positive">{formatUsdt(earned)} USD</span></div>; })}{investor.referralsMade.length === 0 && <p className="py-4 text-sm text-ink-faint">No referred investors.</p>}</div>
    </CollapsibleCard>
  </div>;
}
