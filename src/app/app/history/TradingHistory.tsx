"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";

export type TradingHistoryItem = {
  id: string;
  type:
    | "TRADING_PROFIT"
    | "TRADING_LOSS"
    | "SERVER_FEE"
    | "ADMIN_SHARE"
    | "OTHER_INCREASE"
    | "OTHER_DECREASE";
  amount: string;
  poolAmount: string;
  sharePercent: string;
  note: string;
  createdAt: string;
};

const LABELS: Record<TradingHistoryItem["type"], string> = {
  TRADING_PROFIT: "Trading profit",
  TRADING_LOSS: "Trading loss",
  SERVER_FEE: "Server / operating cost",
  ADMIN_SHARE: "Company share",
  OTHER_INCREASE: "Other increase",
  OTHER_DECREASE: "Other decrease",
};

type TradingHistoryFilters = {
  type: TradingHistoryItem["type"] | "ALL";
  from: string;
  to: string;
};

const FILTER_OPTIONS: Array<{
  value: TradingHistoryFilters["type"];
  label: string;
}> = [
  { value: "ALL", label: "All account changes" },
  { value: "TRADING_PROFIT", label: "Trading profit" },
  { value: "TRADING_LOSS", label: "Trading loss" },
  { value: "SERVER_FEE", label: "Server / operating cost" },
  { value: "ADMIN_SHARE", label: "Company share" },
  { value: "OTHER_INCREASE", label: "Other increase" },
  { value: "OTHER_DECREASE", label: "Other decrease" },
];

function formatDate(value: string): string {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

type TradingPagination = {
  page: number;
  pageCount: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

function openDatePicker(input: HTMLInputElement): void {
  try {
    input.showPicker();
  } catch {
    // Browsers without a programmatic picker retain the native input behavior.
  }
}

function pageHref(page: number, filters: TradingHistoryFilters): string {
  const params = new URLSearchParams();
  if (filters.type !== "ALL") params.set("tradingType", filters.type);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (page > 1) params.set("tradingPage", String(page));
  const query = params.toString();
  return query ? "/app/history?" + query : "/app/history";
}

export function TradingHistory({
  activity,
  pagination,
  filters,
}: {
  activity: TradingHistoryItem[];
  pagination: TradingPagination;
  filters: TradingHistoryFilters;
}) {
  return (
    <div>
      <section
        className="rounded-xl border border-gold-600/15 bg-white p-4 sm:p-5"
        aria-labelledby="user-audit-heading"
      >
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Audit trail</p>
            <h2 id="user-audit-heading" className="mt-1 font-serif text-xl text-ink">
              Your account changes
            </h2>
          </div>
          <p className="text-xs text-ink-faint">
            {pagination.totalCount} matching entr{pagination.totalCount === 1 ? "y" : "ies"}
          </p>
        </div>

        <form
          action="/app/history"
          method="get"
          className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto]"
        >
          <label className="space-y-1 text-xs text-ink-faint">
            Entry type
            <select
              name="tradingType"
              defaultValue={filters.type}
              className="h-10 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-ink outline-none focus:border-gold-400"
            >
              {FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs text-ink-faint">
            From
            <input
              type="date"
              name="from"
              defaultValue={filters.from}
              max={filters.to || undefined}
              onClick={(event) => openDatePicker(event.currentTarget)}
              className="h-10 w-full cursor-pointer rounded-lg border border-stone-200 bg-white px-3 font-mono text-xs text-ink outline-none [color-scheme:light] focus:border-gold-400"
            />
          </label>
          <label className="space-y-1 text-xs text-ink-faint">
            To
            <input
              type="date"
              name="to"
              defaultValue={filters.to}
              min={filters.from || undefined}
              onClick={(event) => openDatePicker(event.currentTarget)}
              className="h-10 w-full cursor-pointer rounded-lg border border-stone-200 bg-white px-3 font-mono text-xs text-ink outline-none [color-scheme:light] focus:border-gold-400"
            />
          </label>
          <button
            type="submit"
            className="h-10 self-end rounded-lg bg-gold-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-gold-700"
          >
            Apply
          </button>
          <Link
            href="/app/history"
            className="inline-flex h-10 items-center justify-center self-end rounded-lg border border-stone-200 px-4 text-sm font-semibold text-ink-dim transition-colors hover:border-gold-400 hover:text-ink"
          >
            Clear
          </Link>
        </form>
      </section>

      {activity.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-stone-200 px-5 py-10 text-center text-sm text-ink-dim">
          No account changes match these filters.
        </div>
      ) : (
        <>
          <div className="mt-4 hidden overflow-x-auto rounded-xl border border-stone-200 bg-white sm:block">
            <table className="w-full min-w-[46rem] text-left text-xs">
              <thead className="border-b border-gold-600/15 bg-stone-50 text-ink-faint">
                <tr>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Entry</th>
                  <th className="px-4 py-3 text-right font-medium">Your change</th>
                  <th className="px-4 py-3 text-right font-medium">Pool change</th>
                  <th className="px-4 py-3 text-right font-medium">Your share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-600/10">
                {activity.map((item) => {
                  const positive = item.amount.startsWith("+");
                  return (
                    <tr key={item.id}>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-faint">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-medium text-ink">{LABELS[item.type]}</td>
                      <td
                        className={cn(
                          "currency-value whitespace-nowrap px-4 py-3 text-right font-semibold",
                          positive ? "text-positive" : "text-negative",
                        )}
                      >
                        {item.amount} USD
                      </td>
                      <td className="currency-value whitespace-nowrap px-4 py-3 text-right text-ink-dim">
                        {item.poolAmount} USD
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-ink-dim">
                        {item.sharePercent}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 space-y-3 sm:hidden">
            {activity.map((item) => {
              const positive = item.amount.startsWith("+");
              return (
                <article
                  key={item.id}
                  className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-ink">{LABELS[item.type]}</h3>
                      <p className="mt-1 text-xs text-ink-faint">{formatDate(item.createdAt)}</p>
                    </div>
                    <p
                      className={cn(
                        "currency-value shrink-0 text-sm font-bold",
                        positive ? "text-positive" : "text-negative",
                      )}
                    >
                      {item.amount} USD
                    </p>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-gold-600/10 pt-3 text-xs">
                    <div>
                      <dt className="text-ink-faint">Pool change</dt>
                      <dd className="currency-value mt-1 text-ink-dim">{item.poolAmount} USD</dd>
                    </div>
                    <div className="text-right">
                      <dt className="text-ink-faint">Your share</dt>
                      <dd className="mt-1 font-mono text-ink-dim">{item.sharePercent}%</dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>
        </>
      )}

      <TradingPagination pagination={pagination} filters={filters} />
    </div>
  );
}

function TradingPagination({
  pagination,
  filters,
}: {
  pagination: TradingPagination;
  filters: TradingHistoryFilters;
}) {
  if (!pagination.hasNextPage && !pagination.hasPreviousPage) return null;

  return (
    <nav
      className="mt-5 flex items-center justify-between gap-3"
      aria-label="Account audit trail pages"
    >
      {pagination.hasPreviousPage ? (
        <Link
          href={pageHref(pagination.page - 1, filters)}
          className="rounded-lg border border-gold-600/25 px-3 py-2 text-xs font-semibold text-ink transition hover:bg-gold-600/10"
        >
          Newer entries
        </Link>
      ) : (
        <span aria-hidden />
      )}
      <span className="text-xs text-ink-faint">
        Page {pagination.page} of {pagination.pageCount}
      </span>
      {pagination.hasNextPage ? (
        <Link
          href={pageHref(pagination.page + 1, filters)}
          className="rounded-lg border border-gold-600/25 px-3 py-2 text-xs font-semibold text-ink transition hover:bg-gold-600/10"
        >
          Older entries
        </Link>
      ) : (
        <span aria-hidden />
      )}
    </nav>
  );
}
