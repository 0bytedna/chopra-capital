import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  CircleDollarSign,
  Layers3,
  ShieldCheck,
} from "lucide-react";
import { ProfitShareForm } from "@/components/admin/ProfitShareForm";
import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { adminReverseProfitShare } from "./actions";
import { adminInvestCompanyCapital, adminQueueCompanyCapital, adminWithdrawCompanyCapital } from "../actions";
import { D, formatUsdt } from "@/lib/money";
import { getCurrentNav } from "@/lib/nav";
import { getPortfolioMetrics } from "@/lib/portfolio";
import {
  COMPANY_TRADING_ACCOUNT_ID,
  ensureCompanyTradingAccount,
} from "@/lib/profitShare";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Admin · Profit share" };

function formatDate(date: Date) {
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function SummaryCard({
  label,
  value,
  detail,
  Icon,
}: {
  label: string;
  value: string;
  detail: string;
  Icon: typeof Building2;
}) {
  return (
    <article className="glass-card rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">{label}</p>
          <p className="mt-2 truncate font-mono text-xl text-ink">{value}</p>
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-gold-600/15 bg-gold-600/8 text-gold-400">
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <p className="mt-2 text-xs text-ink-faint">{detail}</p>
    </article>
  );
}

export default async function AdminProfitSharePage() {
  await ensureCompanyTradingAccount();

  const [company, metrics, navState, runs] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: COMPANY_TRADING_ACCOUNT_ID },
      select: { id: true, fullName: true, email: true },
    }),
    getPortfolioMetrics(COMPANY_TRADING_ACCOUNT_ID),
    getCurrentNav(),
    prisma.profitShareRun.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        admin: { select: { fullName: true, email: true } },
        reversedBy: { select: { fullName: true, email: true } },
        allocations: {
          where: { companyShare: { gt: 0 } },
          orderBy: { companyShare: "desc" },
          include: {
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
    }),
  ]);

  const companyPoolShare = navState.totalUnits.gt(0)
    ? metrics.units.div(navState.totalUnits).mul(100)
    : D(0);
  const activeRuns = runs.filter((run) => !run.reversedAt);
  const newestActiveRunId = activeRuns[0]?.id;
  const lifetimeReceived = activeRuns.reduce(
    (sum, run) => sum.add(D(run.totalCompanyShare)),
    D(0),
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow">Company earnings</p>
          <h1 className="mt-2 font-serif text-3xl text-ink">
            Profit <em className="gold-text italic">share</em>
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-dim">
            Manually preview and settle the company share of investor profits.
            Nothing is transferred until an administrator confirms the allocation.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-positive/25 bg-positive/8 px-3 py-1.5 text-xs text-positive">
          <ShieldCheck className="size-3.5" aria-hidden />
          Manual settlement only
        </span>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Company trading account">
        <SummaryCard
          label="Company balance"
          value={`${formatUsdt(metrics.currentValue)} USD`}
          detail="Current trading account value"
          Icon={Building2}
        />
        <SummaryCard
          label="Company units"
          value={formatUsdt(metrics.units, 6)}
          detail="Units owned in the trading pool"
          Icon={Layers3}
        />
        <SummaryCard
          label="Pool share"
          value={`${formatUsdt(companyPoolShare, 2)}%`}
          detail="Company ownership of total units"
          Icon={CircleDollarSign}
        />
        <SummaryCard
          label="Lifetime received"
          value={`${formatUsdt(lifetimeReceived)} USD`}
          detail="Active profit-share settlements"
          Icon={CircleDollarSign}
        />
      </section>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-gold-600/15 bg-black/10 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-ink">{company.fullName}</p>
          <p className="mt-0.5 truncate text-xs text-ink-faint">{company.email}</p>
        </div>
        <Link
          href={`/admin/investors/${company.id}`}
          className="inline-flex shrink-0 items-center gap-2 text-xs text-gold-400 transition-colors hover:text-gold-300"
        >
          View full account
          <ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
      </div>

      <section className="glass-card rounded-2xl p-5 sm:p-7" aria-labelledby="company-capital-heading">
        <div className="mb-6">
          <p className="eyebrow">Company capital</p>
          <h2 id="company-capital-heading" className="mt-2 font-serif text-2xl text-ink">
            Fund and withdraw the company account
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-dim">
            Record actual company money only. Deposits enter the company queue; invest them when they reach the broker. A withdrawal immediately reduces the company account balance, so record it only after the broker or payout transfer is confirmed.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <AdminActionForm action={adminQueueCompanyCapital} submitLabel="Add to queue" pendingLabel="Adding capital…" className="rounded-xl border border-gold-600/15 bg-black/10 p-4">
            <p className="text-sm font-medium text-ink">Deposit company capital</p>
            <label className="mt-3 block space-y-1.5">
              <span className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">Amount (USD)</span>
              <input name="amount" type="number" min="0.01" step="0.01" required placeholder="0.00" className="h-10 w-full rounded-lg border border-gold-600/20 bg-vault-950/65 px-3 text-sm text-ink" />
            </label>
            <label className="mt-3 block space-y-1.5">
              <span className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">Transaction reference</span>
              <input name="reference" maxLength={160} placeholder="Optional wallet or bank reference" className="h-10 w-full rounded-lg border border-gold-600/20 bg-vault-950/65 px-3 text-sm text-ink" />
            </label>
          </AdminActionForm>

          <AdminActionForm action={adminInvestCompanyCapital} submitLabel="Invest queued capital" pendingLabel="Investing…" variant="gold" confirmMessage="Invest all queued company capital at the current NAV?" className="rounded-xl border border-gold-600/15 bg-black/10 p-4">
            <p className="text-sm font-medium text-ink">Invest company queue</p>
            <p className="mt-3 text-xs leading-5 text-ink-faint">Moves the entire queued company balance into pool units at the current NAV. Company units are included in the total pool units.</p>
          </AdminActionForm>

          <AdminActionForm action={adminWithdrawCompanyCapital} submitLabel="Record company withdrawal" pendingLabel="Recording withdrawal…" variant="danger" confirmMessage="Record this company withdrawal? It immediately reduces company cash and/or pool units." className="rounded-xl border border-negative/20 bg-black/10 p-4">
            <p className="text-sm font-medium text-ink">Withdraw company capital</p>
            <label className="mt-3 block space-y-1.5">
              <span className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">Amount (USD)</span>
              <input name="amount" type="number" min="0.01" step="0.01" required placeholder="0.00" className="h-10 w-full rounded-lg border border-gold-600/20 bg-vault-950/65 px-3 text-sm text-ink" />
            </label>
            <label className="mt-3 block space-y-1.5">
              <span className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">Broker / payout reference</span>
              <input name="reference" maxLength={160} required placeholder="Required audit reference" className="h-10 w-full rounded-lg border border-gold-600/20 bg-vault-950/65 px-3 text-sm text-ink" />
            </label>
          </AdminActionForm>
        </div>
      </section>
      <section className="glass-card rounded-2xl p-5 sm:p-7" aria-labelledby="new-profit-share-heading">
        <div className="mb-6">
          <p className="eyebrow">New settlement</p>
          <h2 id="new-profit-share-heading" className="mt-2 font-serif text-2xl text-ink">
            Preview company profit share
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-dim">
            Only profit above each investor’s high-water mark is eligible. Deposits,
            withdrawals and internal transfers are excluded from profit.
          </p>
        </div>
        <ProfitShareForm />
      </section>

      <section className="glass-card rounded-2xl p-5 sm:p-7" aria-labelledby="profit-share-history-heading">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Permanent audit trail</p>
            <h2 id="profit-share-history-heading" className="mt-2 font-serif text-2xl text-ink">
              Settlement history
            </h2>
          </div>
          <span className="font-mono text-xs text-ink-faint">{runs.length} runs</span>
        </div>

        {runs.length > 0 ? (
          <div className="mt-5 space-y-3">
            {runs.map((run) => (
              <details
                key={run.id}
                className="group overflow-hidden rounded-xl border border-gold-600/15 bg-black/10"
              >
                <summary className="grid cursor-pointer list-none gap-3 px-4 py-4 sm:grid-cols-[1.1fr_0.8fr_0.8fr_0.8fr_1.2fr] sm:items-center">
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {run.frequency === "WEEKLY" ? "Weekly" : "Monthly"} · {run.periodKey}
                    </p>
                    <p className="mt-1 text-[10px] text-ink-faint">{formatDate(run.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">Method</p>
                    <p className="mt-1 text-xs text-ink">
                      {run.mode === "PERCENTAGE"
                        ? `${formatUsdt(run.ratePercent, 4)}%`
                        : `${formatUsdt(run.fixedAmount)} USD fixed`}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">Eligible profit</p>
                    <p className="mt-1 font-mono text-xs text-ink">
                      {formatUsdt(run.totalEligibleProfit)} USD
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">Company share</p>
                    <p className="mt-1 font-mono text-xs text-positive">
                      {formatUsdt(run.totalCompanyShare)} USD
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">Confirmed by</p>
                    <p className="mt-1 truncate text-xs text-ink">
                      {run.admin.fullName ?? run.admin.email}
                    </p>
                  </div>
                </summary>

                <div className="flex flex-col gap-3 border-t border-gold-600/15 bg-vault-950/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-5 text-ink-faint">
                    {run.reversedAt
                      ? `Reversed ${formatDate(run.reversedAt)}${run.reversedBy ? ` by ${run.reversedBy.fullName ?? run.reversedBy.email}` : ""}. This audit record remains permanently.`
                      : run.id === newestActiveRunId
                        ? "Undo returns the exact units to every investor and restores their prior high-water marks."
                        : "To preserve high-water marks, newer active settlements must be reversed first."}
                  </p>
                  {!run.reversedAt && run.id === newestActiveRunId && (
                    <AdminActionForm
                      action={adminReverseProfitShare}
                      submitLabel="Undo settlement"
                      pendingLabel="Undoing settlement…"
                      variant="danger"
                      className="shrink-0"
                      confirmMessage={`Undo this ${run.periodKey} profit-share settlement? The company allocation will be returned to investors and the period can be settled again.`}
                    >
                      <input type="hidden" name="runId" value={run.id} />
                    </AdminActionForm>
                  )}
                </div>

                <div className="overflow-x-auto border-t border-gold-600/15">
                  <table className="w-full min-w-[48rem] table-fixed text-left text-xs">
                    <thead className="bg-vault-950/35 text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                      <tr>
                        <th className="w-[30%] px-4 py-3 font-medium">Investor</th>
                        <th className="w-[18%] px-4 py-3 font-medium">Eligible profit</th>
                        <th className="w-[18%] px-4 py-3 font-medium">Company share</th>
                        <th className="w-[18%] px-4 py-3 font-medium">Units moved</th>
                        <th className="w-[16%] px-4 py-3 font-medium">New high-water</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gold-600/10">
                      {run.allocations.map((allocation) => (
                        <tr key={allocation.id}>
                          <td className="px-4 py-3">
                            <Link
                              href={`/admin/investors/${allocation.user.id}`}
                              className="text-ink transition-colors hover:text-gold-300"
                            >
                              {allocation.user.fullName ?? allocation.user.email}
                            </Link>
                          </td>
                          <td className="px-4 py-3 font-mono text-ink">
                            {formatUsdt(allocation.eligibleProfit)} USD
                          </td>
                          <td className="px-4 py-3 font-mono text-gold-300">
                            {formatUsdt(allocation.companyShare)} USD
                          </td>
                          <td className="px-4 py-3 font-mono text-ink-dim">
                            {formatUsdt(allocation.unitsTransferred, 6)}
                          </td>
                          <td className="px-4 py-3 font-mono text-ink-dim">
                            {formatUsdt(allocation.highWaterAfter)} USD
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-xl border border-dashed border-gold-600/20 px-4 py-10 text-center text-sm text-ink-faint">
            No profit-share settlements have been confirmed.
          </p>
        )}
      </section>
    </div>
  );
}