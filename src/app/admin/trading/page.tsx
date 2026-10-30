import type { Metadata } from "next";
import Link from "next/link";
import { Gift } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentNav } from "@/lib/nav";
import { D, toNumber, formatUsdt } from "@/lib/money";
import { cn } from "@/lib/cn";
import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { TradingAdjustmentFields } from "@/components/admin/TradingAdjustmentFields";
import { TradingEntryActions } from "@/components/admin/TradingEntryActions";
import {
  EDITABLE_TRADING_TYPES,
  type EditableTradingAdjustmentType,
} from "@/lib/tradingAccount";
import { adminRecordTradingAdjustment } from "../actions";
import { reportingDayKey } from "@/lib/reportingCalendar";
import { reportingDayEnd, reportingDayStart } from "@/lib/reportingCalendar";
import type { Prisma, TradingAdjustmentType } from "@prisma/client";
import { AdminTablePreferences } from "@/components/admin/AdminTablePreferences";

export const metadata: Metadata = { title: "Admin · Trading" };

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

const editableTradingTypes = new Set<string>(EDITABLE_TRADING_TYPES);
const AUDIT_PAGE_SIZE = 25;

function requestedPage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "1", 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default async function AdminTradingPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string | string[];
    type?: string | string[];
    admin?: string | string[];
    from?: string | string[];
    to?: string | string[];
  }>;
}) {
  const query = await searchParams;
  const one = (value: string | string[] | undefined) => typeof value === "string" ? value : "";
  const selectedType = one(query.type);
  const selectedAdmin = one(query.admin);
  const from = /^\d{4}-\d{2}-\d{2}$/.test(one(query.from)) ? one(query.from) : "";
  const to = /^\d{4}-\d{2}-\d{2}$/.test(one(query.to)) ? one(query.to) : "";
  const allowedTypes = Object.keys(reasonLabels) as TradingAdjustmentType[];
  const where: Prisma.TradingAccountEntryWhereInput = {
    ...(allowedTypes.includes(selectedType as TradingAdjustmentType) ? { type: selectedType as TradingAdjustmentType } : {}),
    ...(selectedAdmin ? { adminId: selectedAdmin } : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: reportingDayStart(from) } : {}), ...(to ? { lte: reportingDayEnd(to) } : {}) } } : {}),
  };
  const auditHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (selectedType) params.set("type", selectedType);
    if (selectedAdmin) params.set("admin", selectedAdmin);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (targetPage > 1) params.set("page", String(targetPage));
    const value = params.toString();
    return value ? `/admin/trading?${value}` : "/admin/trading";
  };
  const [poolNav, walletAgg, entryCount, admins] = await Promise.all([
    getCurrentNav(),
    prisma.wallet.aggregate({ _sum: { units: true } }),
    prisma.tradingAccountEntry.count({ where }),
    prisma.user.findMany({ where: { role: "ADMIN" }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true, email: true } }),
  ]);

  const pageCount = Math.max(1, Math.ceil(entryCount / AUDIT_PAGE_SIZE));
  const page = Math.min(requestedPage(query.page), pageCount);
  const entries = await prisma.tradingAccountEntry.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * AUDIT_PAGE_SIZE,
    take: AUDIT_PAGE_SIZE,
    include: {
      admin: {
        select: {
          fullName: true,
          email: true,
        },
      },
    },
  });

  const investorUnits = D(walletAgg._sum.units ?? 0);
  const unitsDrift = toNumber(D(poolNav.totalUnits).sub(investorUnits));

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header>
        <p className="eyebrow">Trading</p>
        <h1 className="mt-2 font-serif text-3xl text-ink">
          Profit, loss & <em className="gold-text italic">movements</em>
        </h1>
      </header>

      <section aria-labelledby="balance-change-heading">
        <AdminActionForm
          action={adminRecordTradingAdjustment}
          submitLabel="Record adjustment"
          pendingLabel="Recording…"
          className="glass-card rounded-2xl p-5 sm:p-6"
          confirmMessage="Apply this adjustment to the balance?"
        >
          <h2
            id="balance-change-heading"
            className="font-serif text-xl text-ink"
          >
            Record a balance change
          </h2>
          <TradingAdjustmentFields
            key={poolNav.balance.toString()}
            currentBalance={toNumber(poolNav.balance)}
            defaultEffectiveDay={reportingDayKey()}
          />
          <label className="mt-3 block space-y-1.5 text-xs text-ink-faint">
            Audit note
            <input
              name="note"
              maxLength={240}
              required
              placeholder="Trading session, invoice, or another supporting reference"
              className="h-10 w-full rounded-lg border border-gold-600/20 bg-vault-950/65 px-3 text-sm text-ink"
            />
          </label>
        </AdminActionForm>
      </section>

      <section className="glass-card flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-gold-600/25 bg-gold-600/10">
            <Gift className="size-4 text-gold-500" aria-hidden />
          </span>
          <div>
            <p className="eyebrow">Referral commissions</p>
            <h2 className="mt-1 font-serif text-xl text-ink">Calculate and distribute</h2>
            <p className="mt-1 text-xs leading-5 text-ink-faint">
              Review eligible referrals, adjust suggested amounts and credit separate commission wallets.
            </p>
          </div>
        </div>
        <Link
          href="/admin/commissions"
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-gold-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-gold-700"
        >
          Open commissions
        </Link>
      </section>

      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 bg-white px-5 py-4">
          <div>
            <p className="eyebrow">Audit trail</p>
            <h2 className="mt-1 font-serif text-xl text-ink">Account changes</h2>
            <p className="mt-1 text-xs text-ink-faint">
              {entryCount === 0
                ? "No entries"
                : `${(page - 1) * AUDIT_PAGE_SIZE + 1}–${Math.min(
                    page * AUDIT_PAGE_SIZE,
                    entryCount,
                  )} of ${entryCount}`}
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 font-mono text-xs",
              Math.abs(unitsDrift) < 0.0001
                ? "text-positive"
                : "text-negative",
            )}
          >
            unit drift {unitsDrift.toFixed(6)}
          </span>
        </div>
        <form method="get" className="grid gap-3 border-t border-stone-200 bg-stone-50 px-5 py-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_0.8fr_0.8fr_auto_auto]">
          <select name="type" defaultValue={selectedType} className="h-10 rounded-lg border border-stone-200 bg-white px-3 text-sm text-ink">
            <option value="">All entry types</option>
            {allowedTypes.map((type) => <option key={type} value={type}>{reasonLabels[type]}</option>)}
          </select>
          <select name="admin" defaultValue={selectedAdmin} className="h-10 rounded-lg border border-stone-200 bg-white px-3 text-sm text-ink">
            <option value="">All administrators</option>
            {admins.map((admin) => <option key={admin.id} value={admin.id}>{admin.fullName ?? admin.email}</option>)}
          </select>
          <input name="from" type="date" defaultValue={from} className="h-10 rounded-lg border border-stone-200 bg-white px-3 font-mono text-xs text-ink" />
          <input name="to" type="date" defaultValue={to} className="h-10 rounded-lg border border-stone-200 bg-white px-3 font-mono text-xs text-ink" />
          <button type="submit" className="h-10 rounded-lg bg-gold-600 px-4 text-sm font-semibold text-white">Apply</button>
          <Link href={`/api/admin/trading/export?${new URLSearchParams({ ...(selectedType ? { type: selectedType } : {}), ...(selectedAdmin ? { admin: selectedAdmin } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}) }).toString()}`} className="inline-flex h-10 items-center justify-center rounded-lg border border-gold-600/25 px-4 text-sm font-semibold text-gold-700">Export CSV</Link>
        </form>
        <AdminTablePreferences storageKey="admin-trading-table-v1" allowNotesToggle>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="border-y border-stone-200 bg-stone-100 text-ink-faint">
              <tr>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Reason</th>
                <th className="px-3 py-2">Change</th>
                <th className="px-3 py-2">Balance after</th>
                <th className="optional-note px-3 py-2">Note</th>
                <th className="px-3 py-2">Administrator</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 bg-white">
              {entries.map((entry) => (
                <tr key={entry.id} className="bg-white transition-colors even:bg-stone-50/60 hover:bg-stone-100">
                  <td className="px-3 py-2 text-ink-faint">
                    {entry.createdAt.toLocaleString("en-IN")}
                  </td>
                  <td className="px-3 py-2 text-ink">
                    {reasonLabels[entry.type]}
                  </td>
                  <td
                    className={cn(
                      "currency-value px-3 py-2",
                      D(entry.amount).gte(0)
                        ? "text-positive"
                        : "text-negative",
                    )}
                  >
                    {D(entry.amount).gte(0) ? "+" : ""}
                    {formatUsdt(entry.amount)} USD
                  </td>
                  <td className="currency-value px-3 py-2 text-ink">
                    {formatUsdt(entry.balanceAfter)}
                  </td>
                  <td className="optional-note max-w-xs px-3 py-2 text-ink-dim">
                    {entry.note}
                  </td>
                  <td className="px-3 py-2 text-ink-dim">{entry.admin.fullName ?? entry.admin.email}</td>
                  <td className="px-3 py-2">
                    {editableTradingTypes.has(entry.type) &&
                    !entry.note.startsWith("Investor correction:") ? (
                      <TradingEntryActions
                        id={entry.id}
                        type={entry.type as EditableTradingAdjustmentType}
                        amount={D(entry.amount).abs().toString()}
                        note={entry.note}
                      />
                    ) : (
                      <span className="text-[11px] text-ink-faint">Protected</span>
                    )}
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-ink-faint"
                  >
                    No account changes yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </AdminTablePreferences>
        {pageCount > 1 && (
          <nav
            className="flex items-center justify-between gap-4 border-t border-stone-200 bg-white px-5 py-4"
            aria-label="Trading audit trail pages"
          >
            {page > 1 ? (
              <Link
                href={auditHref(page - 1)}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-ink transition hover:bg-stone-100"
              >
                Newer entries
              </Link>
            ) : (
              <span aria-hidden className="w-28" />
            )}
            <span className="text-xs text-ink-faint">
              Page {page} of {pageCount}
            </span>
            {page < pageCount ? (
              <Link
                href={auditHref(page + 1)}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-ink transition hover:bg-stone-100"
              >
                Older entries
              </Link>
            ) : (
              <span aria-hidden className="w-28" />
            )}
          </nav>
        )}
      </section>
    </div>
  );
}
