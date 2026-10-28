import type { Metadata } from "next";
import Link from "next/link";
import { Gift, Users, WalletCards } from "lucide-react";
import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { CommissionPeriodFilter } from "@/components/admin/CommissionPeriodFilter";
import {
  adminDistributeReferralCommissions,
  adminUpdateReferralCommissionRate,
} from "@/app/admin/actions";
import { prisma } from "@/lib/prisma";
import { D, formatUsdt } from "@/lib/money";
import {
  calculateReferralCommissionPreview,
  getReferralCommissionRate,
} from "@/lib/referrals";
import {
  reportingDayEnd,
  reportingDayKey,
  reportingDayStart,
  reportingWeekStart,
} from "@/lib/reportingCalendar";

export const metadata: Metadata = { title: "Admin · Commissions" };

function one(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function requestedPage(value: string | string[] | undefined): number {
  const parsed = Number.parseInt(one(value) ?? "1", 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

function historyHref(page: number, from: string, to: string): string {
  const params = new URLSearchParams({ from, to });
  if (page > 1) params.set("historyPage", String(page));
  return "/admin/commissions?" + params.toString();
}

function validDay(value: string | undefined): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  try {
    return reportingDayKey(reportingDayStart(value)) === value ? value : "";
  } catch {
    return "";
  }
}

function formatDate(value: Date): string {
  return value.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

export default async function AdminCommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string | string[];
    to?: string | string[];
    historyPage?: string | string[];
  }>;
}) {
  const query = await searchParams;
  const today = reportingDayKey();
  let periodStart = validDay(one(query.from)) || reportingWeekStart(today);
  let periodEnd = validDay(one(query.to)) || today;
  if (periodEnd < periodStart) {
    const previousStart = periodStart;
    periodStart = periodEnd;
    periodEnd = previousStart;
  }

  const rate = await getReferralCommissionRate();
  const [preview, walletTotals, referralCount, historyCount] = await Promise.all([
    calculateReferralCommissionPreview({
      periodStart,
      periodEnd,
      from: reportingDayStart(periodStart),
      to: reportingDayEnd(periodEnd),
      rate,
    }),
    prisma.commissionWallet.aggregate({
      _sum: { balance: true, totalEarned: true },
    }),
    prisma.referral.count(),
    prisma.referralCommission.count(),
  ]);
  const historyPageSize = 25;
  const historyPageCount = Math.max(1, Math.ceil(historyCount / historyPageSize));
  const historyPage = Math.min(requestedPage(query.historyPage), historyPageCount);
  const history = await prisma.referralCommission.findMany({
    orderBy: [{ distributedAt: "desc" }, { id: "desc" }],
    skip: (historyPage - 1) * historyPageSize,
    take: historyPageSize,
    include: {
      referrer: { select: { id: true, fullName: true, email: true } },
      referredUser: { select: { id: true, fullName: true, email: true } },
      admin: { select: { fullName: true, email: true } },
    },
  });
  const visibleRows = preview.filter(
    (row) => row.eligibleProfit.gt(0) || row.distributedAmount !== null,
  );
  const suggestedTotal = visibleRows.reduce(
    (total, row) =>
      row.distributedAmount === null
        ? total.add(row.suggestedCommission)
        : total,
    D(0),
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header>
        <p className="eyebrow">Referral programme</p>
        <h1 className="mt-2 font-serif text-3xl text-ink">
          Referral <span className="gold-text">commissions</span>
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-dim">
          Calculate each referred investor&apos;s profit after the 30% server and
          company deduction, then credit the configured percentage as an
          additional company-funded reward. This does not reduce the referred
          investor&apos;s remaining 70% profit.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Commission wallets",
            value: formatUsdt(walletTotals._sum.balance) + " USD",
            Icon: WalletCards,
          },
          {
            label: "Lifetime distributed",
            value: formatUsdt(walletTotals._sum.totalEarned) + " USD",
            Icon: Gift,
          },
          {
            label: "Referral links used",
            value: String(referralCount),
            Icon: Users,
          },
          {
            label: "Suggested this period",
            value: formatUsdt(suggestedTotal) + " USD",
            Icon: Gift,
          },
        ].map(({ label, value, Icon }) => (
          <article key={label} className="glass-card rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-[0.13em] text-ink-faint">
                {label}
              </p>
              <Icon className="size-4 text-gold-500" aria-hidden />
            </div>
            <p className="currency-value mt-3 truncate text-lg font-semibold text-ink">
              {value}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="glass-card rounded-2xl p-5 sm:p-6">
          <p className="eyebrow">Commission period</p>
          <h2 className="mt-1 font-serif text-xl text-ink">Calculate eligibility</h2>
          <div className="mt-4">
            <CommissionPeriodFilter from={periodStart} to={periodEnd} />
          </div>
        </div>
        <AdminActionForm
          action={adminUpdateReferralCommissionRate}
          submitLabel="Update rate"
          pendingLabel="Updating…"
          confirmMessage="Update the referral commission rate used for future distributions?"
          className="glass-card rounded-2xl p-5 sm:p-6"
        >
          <p className="eyebrow">Programme setting</p>
          <h2 className="mt-1 font-serif text-xl text-ink">Commission rate</h2>
          <label className="mt-4 block space-y-1.5 text-xs text-ink-faint">
            Company-funded percentage of referred investor&apos;s post-deduction profit
            <input
              name="rate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              defaultValue={rate.toString()}
              required
              className="h-10 w-full rounded-lg border border-gold-600/20 bg-white px-3 text-sm text-ink"
            />
          </label>
        </AdminActionForm>
      </section>

      <AdminActionForm
        action={adminDistributeReferralCommissions}
        submitLabel="Distribute selected commissions"
        pendingLabel="Distributing…"
        variant="gold"
        confirmMessage="Credit the selected amounts to commission wallets? This does not change broker balances and cannot be distributed twice for the same period."
        className="glass-card overflow-hidden rounded-2xl"
        submitClassName="mx-5 mb-5"
      >
        <input type="hidden" name="periodStart" value={periodStart} />
        <input type="hidden" name="periodEnd" value={periodEnd} />
        <div className="border-b border-gold-600/15 px-5 py-4">
          <p className="eyebrow">Eligible commissions</p>
          <h2 className="mt-1 font-serif text-xl text-ink">
            {periodStart} to {periodEnd}
          </h2>
          <p className="mt-1 text-xs text-ink-faint">
            Suggested at {rate.toString()}%. Amounts remain editable before distribution.
          </p>
        </div>

        {visibleRows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[58rem] text-left text-xs">
              <thead className="border-b border-gold-600/15 bg-stone-50 text-ink-faint">
                <tr>
                  <th className="px-5 py-3">Select</th>
                  <th className="px-5 py-3">Referrer</th>
                  <th className="px-5 py-3">Referred investor</th>
                  <th className="px-5 py-3 text-right">Net profit</th>
                  <th className="px-5 py-3 text-right">Commission</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-600/10">
                {visibleRows.map((row) => {
                  const distributed = row.distributedAmount !== null;
                  return (
                    <tr key={row.referralId}>
                      <td className="px-5 py-3">
                        <input
                          type="checkbox"
                          name="referralIds"
                          value={row.referralId}
                          defaultChecked={!distributed}
                          disabled={distributed}
                          className="size-4 accent-gold-600"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={"/admin/investors/" + row.referrerId}
                          className="font-semibold text-ink hover:text-gold-600"
                        >
                          {row.referrerName}
                        </Link>
                        <p className="mt-1 font-mono text-[11px] text-ink-faint">
                          {row.referrerPublicId}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={"/admin/investors/" + row.referredUserId}
                          className="text-ink hover:text-gold-600"
                        >
                          {row.referredName}
                        </Link>
                      </td>
                      <td className="currency-value px-5 py-3 text-right text-ink">
                        {formatUsdt(row.eligibleProfit)} USD
                      </td>
                      <td className="px-5 py-3 text-right">
                        {distributed ? (
                          <span className="currency-value font-semibold text-positive">
                            {formatUsdt(row.distributedAmount)} USD
                          </span>
                        ) : (
                          <input
                            name={"amount:" + row.referralId}
                            type="number"
                            min="0"
                            max={row.eligibleProfit.toString()}
                            step="0.01"
                            defaultValue={row.suggestedCommission.toFixed(2)}
                            className="h-9 w-32 rounded-lg border border-gold-600/20 bg-white px-3 text-right font-mono text-sm text-ink"
                          />
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={
                            distributed
                              ? "text-positive"
                              : "text-gold-700"
                          }
                        >
                          {distributed ? "Distributed" : "Ready"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-ink-faint">
            No referred investors generated positive net profit in this period.
          </p>
        )}

        <label className="mx-5 mt-4 block space-y-1.5 text-xs text-ink-faint">
          Distribution note
          <input
            name="note"
            required
            maxLength={240}
            placeholder="Weekly referral commission distribution"
            className="h-10 w-full rounded-lg border border-gold-600/20 bg-white px-3 text-sm text-ink"
          />
        </label>
      </AdminActionForm>

      <section className="glass-card overflow-hidden rounded-2xl">
        <div className="border-b border-gold-600/15 px-5 py-4">
          <p className="eyebrow">Audit trail</p>
          <h2 className="mt-1 font-serif text-xl text-ink">
            Recent commission distributions
          </h2>
        </div>
        {history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[60rem] text-left text-xs">
              <thead className="border-b border-gold-600/15 bg-stone-50 text-ink-faint">
                <tr>
                  <th className="px-5 py-3">Time</th>
                  <th className="px-5 py-3">Referrer</th>
                  <th className="px-5 py-3">Referred investor</th>
                  <th className="px-5 py-3">Period</th>
                  <th className="px-5 py-3 text-right">Profit basis</th>
                  <th className="px-5 py-3 text-right">Commission</th>
                  <th className="px-5 py-3">Admin / note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-600/10">
                {history.map((commission) => (
                  <tr key={commission.id}>
                    <td className="whitespace-nowrap px-5 py-3 text-ink-faint">
                      {formatDate(commission.distributedAt)}
                    </td>
                    <td className="px-5 py-3 text-ink">
                      {commission.referrer.fullName ?? commission.referrer.email}
                    </td>
                    <td className="px-5 py-3 text-ink">
                      {commission.referredUser.fullName ??
                        commission.referredUser.email}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-ink-dim">
                      {commission.periodStart} – {commission.periodEnd}
                    </td>
                    <td className="currency-value px-5 py-3 text-right text-ink-dim">
                      {formatUsdt(commission.eligibleProfit)} USD
                    </td>
                    <td className="currency-value px-5 py-3 text-right font-semibold text-positive">
                      +{formatUsdt(commission.amount)} USD
                    </td>
                    <td className="max-w-64 px-5 py-3 text-ink-dim">
                      <p>{commission.admin.fullName ?? commission.admin.email}</p>
                      <p className="mt-1 text-ink-faint">
                        {commission.note ?? "No note"}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-ink-faint">
            No referral commission has been distributed yet.
          </p>
        )}
        {historyPageCount > 1 && (
          <nav className="flex items-center justify-between gap-4 border-t border-gold-600/15 px-5 py-4" aria-label="Commission audit trail pages">
            {historyPage > 1 ? (
              <Link href={historyHref(historyPage - 1, periodStart, periodEnd)} className="rounded-lg border border-gold-600/25 px-4 py-2 text-xs font-semibold text-ink hover:bg-gold-600/10">
                Newer entries
              </Link>
            ) : <span aria-hidden className="w-28" />}
            <span className="text-xs text-ink-faint">Page {historyPage} of {historyPageCount}</span>
            {historyPage < historyPageCount ? (
              <Link href={historyHref(historyPage + 1, periodStart, periodEnd)} className="rounded-lg border border-gold-600/25 px-4 py-2 text-xs font-semibold text-ink hover:bg-gold-600/10">
                Older entries
              </Link>
            ) : <span aria-hidden className="w-28" />}
          </nav>
        )}
      </section>
    </div>
  );
}
