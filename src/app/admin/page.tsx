import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine, BadgeCheck, LifeBuoy } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentNav } from "@/lib/nav";
import { D, toNumber, formatUsdt } from "@/lib/money";
import { cn } from "@/lib/cn";
import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { adminRecordTradingAdjustment, adminSetTradingSnapshot } from "./actions";

export const metadata: Metadata = { title: "Admin · Overview" };

const reasonLabels: Record<string, string> = {
  TRADING_PROFIT: "Trading profit",
  TRADING_LOSS: "Trading loss",
  SERVER_FEE: "Server or operating fee",
  ADMIN_SHARE: "Company's profit share",
  OTHER_INCREASE: "Other increase",
  OTHER_DECREASE: "Other decrease",
  MANUAL_SNAPSHOT: "Manual balance snapshot",
  USER_DEPOSIT: "Verified deposit batch",
  USER_WITHDRAWAL: "Verified withdrawal batch",
};

export default async function AdminOverviewPage() {
  const [poolNav, walletAgg, pendingDeposits, activeWithdrawals, pendingKyc, openTickets, entries] = await Promise.all([
    getCurrentNav(),
    prisma.wallet.aggregate({ _sum: { units: true, queued: true } }),
    prisma.deposit.count({ where: { status: { in: ["PENDING", "NEEDS_CORRECTION", "RECEIVED", "QUEUED"] } } }),
    prisma.withdrawal.count({ where: { status: { in: ["REQUESTED", "APPROVED", "BROKER_RECEIVED", "INR_READY"] } } }),
    prisma.user.count({ where: { role: "USER", kycStatus: "PENDING", isCompanyAccount: false } }),
    prisma.ticket.count({ where: { status: "OPEN" } }),
    prisma.tradingAccountEntry.findMany({ orderBy: { createdAt: "desc" }, take: 12, include: { admin: { select: { fullName: true, email: true } } } }),
  ]);

  const investorUnits = D(walletAgg._sum.units ?? 0);
  const queuedTotal = toNumber(walletAgg._sum.queued ?? 0);
  const unitsDrift = toNumber(D(poolNav.totalUnits).sub(investorUnits));
  const queues = [
    { href: "/admin/deposits", label: "Deposit work queue", count: pendingDeposits, Icon: ArrowDownToLine },
    { href: "/admin/withdrawals", label: "Withdrawals to review", count: activeWithdrawals, Icon: ArrowUpFromLine },
    { href: "/admin/kyc", label: "KYC in review", count: pendingKyc, Icon: BadgeCheck },
    { href: "/admin/tickets", label: "Open tickets", count: openTickets, Icon: LifeBuoy },
  ];

  return <div className="mx-auto max-w-7xl space-y-8">
    <header><p className="eyebrow">Operations</p><h1 className="mt-2 font-serif text-3xl text-ink">Pool <em className="gold-text italic">overview</em></h1><p className="mt-2 max-w-2xl text-sm text-ink-dim">The figures below are maintained by administrators. Every change creates a permanent audit entry.</p></header>

    <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Pool snapshot">
      {[
        { label: "Trading balance", value: `${formatUsdt(poolNav.balance)} USD`, hint: "manually maintained" },
        { label: "Issued units", value: formatUsdt(poolNav.totalUnits, 6), hint: "total pool units" },
        { label: "NAV / unit", value: formatUsdt(poolNav.nav, 6), hint: "balance / issued units" },
        { label: "In queue", value: `${formatUsdt(queuedTotal)} USD`, hint: "verified, awaiting investment" },
      ].map((item) => <div key={item.label} className="glass-card rounded-xl p-4 sm:p-5"><p className="text-xs uppercase tracking-[0.14em] text-ink-faint">{item.label}</p><p className="mt-1.5 font-mono text-lg text-ink">{item.value}</p><p className="mt-0.5 text-xs text-ink-faint">{item.hint}</p></div>)}
    </section>

    <section className="grid gap-5 xl:grid-cols-2">
      <AdminActionForm action={adminSetTradingSnapshot} submitLabel="Save balance" pendingLabel="Saving…" variant="gold" className="glass-card rounded-2xl p-5 sm:p-6" confirmMessage="Replace the current trading balance with this value?">
        <p className="eyebrow">Manual snapshot</p><h2 className="mt-2 font-serif text-xl text-ink">Set current balance</h2>
        <div className="mt-4"><label className="block space-y-1.5 text-xs text-ink-faint">Balance (USD)<input name="balance" type="number" min="0" step="0.01" defaultValue={poolNav.balance.toFixed(2)} required className="h-10 w-full rounded-lg border border-gold-600/20 bg-vault-950/65 px-3 text-sm text-ink" /></label></div>
        <label className="mt-3 block space-y-1.5 text-xs text-ink-faint">Audit note<input name="note" maxLength={240} required placeholder="Why are these figures being replaced?" className="h-10 w-full rounded-lg border border-gold-600/20 bg-vault-950/65 px-3 text-sm text-ink" /></label>
      </AdminActionForm>

      <AdminActionForm action={adminRecordTradingAdjustment} submitLabel="Record adjustment" pendingLabel="Recording…" className="glass-card rounded-2xl p-5 sm:p-6" confirmMessage="Apply this adjustment to the trading balance?">
        <p className="eyebrow">Profit, loss & movements</p><h2 className="mt-2 font-serif text-xl text-ink">Record a balance change</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="space-y-1.5 text-xs text-ink-faint">Reason<select name="type" required className="h-10 w-full rounded-lg border border-gold-600/20 bg-vault-950/65 px-3 text-sm text-ink">{Object.entries(reasonLabels).filter(([key]) => ["TRADING_PROFIT", "TRADING_LOSS", "SERVER_FEE", "ADMIN_SHARE", "OTHER_INCREASE", "OTHER_DECREASE"].includes(key)).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="space-y-1.5 text-xs text-ink-faint">Amount (USD)<input name="amount" type="number" min="0.01" step="0.01" required placeholder="0.00" className="h-10 w-full rounded-lg border border-gold-600/20 bg-vault-950/65 px-3 text-sm text-ink" /></label></div>
        <label className="mt-3 block space-y-1.5 text-xs text-ink-faint">Audit note<input name="note" maxLength={240} required placeholder="Trading session, invoice, withdrawal batch, etc." className="h-10 w-full rounded-lg border border-gold-600/20 bg-vault-950/65 px-3 text-sm text-ink" /></label>
      </AdminActionForm>
    </section>

    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{queues.map((q) => <Link key={q.href} href={q.href} className="glass-card glass-card-hover rounded-xl p-5"><div className="flex items-center justify-between"><q.Icon className="size-4 text-gold-500"/><span className="rounded-full border border-gold-500/30 px-2.5 py-0.5 font-mono text-sm text-gold-300">{q.count}</span></div><p className="mt-3 text-sm text-ink">{q.label}</p></Link>)}</section>

    <section className="glass-card overflow-hidden rounded-2xl"><div className="flex items-center justify-between px-5 py-4"><div><p className="eyebrow">Audit trail</p><h2 className="mt-1 font-serif text-xl text-ink">Recent account changes</h2></div><span className={cn("font-mono text-xs", Math.abs(unitsDrift) < 0.0001 ? "text-positive" : "text-negative")}>unit drift {unitsDrift.toFixed(6)}</span></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="border-y border-gold-600/15 bg-slate-50 text-ink-faint"><tr><th className="px-5 py-3">Time</th><th className="px-5 py-3">Reason</th><th className="px-5 py-3">Change</th><th className="px-5 py-3">Balance after</th><th className="px-5 py-3">Note</th></tr></thead><tbody className="divide-y divide-gold-600/10">{entries.map((entry) => <tr key={entry.id}><td className="px-5 py-3 text-ink-faint">{entry.createdAt.toLocaleString("en-IN")}</td><td className="px-5 py-3 text-ink">{reasonLabels[entry.type]}</td><td className={cn("px-5 py-3 font-mono", D(entry.amount).gte(0) ? "text-positive" : "text-negative")}>{D(entry.amount).gte(0) ? "+" : ""}{formatUsdt(entry.amount)} USD</td><td className="px-5 py-3 font-mono text-ink">{formatUsdt(entry.balanceAfter)}</td><td className="max-w-xs px-5 py-3 text-ink-dim">{entry.note}</td></tr>)}{entries.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-ink-faint">No manual account changes yet.</td></tr>}</tbody></table></div></section>
  </div>;
}