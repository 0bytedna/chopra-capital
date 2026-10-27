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
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export function TradingHistory({
  activity,
  pagination,
}: {
  activity: TradingHistoryItem[];
  pagination: TradingPagination;
}) {
  if (activity.length === 0) {
    return (
      <div>
        <div className="rounded-xl border border-dashed border-stone-200 px-5 py-10 text-center text-sm text-ink-dim">
          No trading activity has affected your account on this page.
        </div>
        <TradingPagination pagination={pagination} />
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-3">
        {activity.map((item) => {
        const positive = item.amount.startsWith("+");
        return (
          <article
            key={item.id}
            className="rounded-xl border border-stone-200 bg-white px-4 py-4 shadow-sm sm:px-5"
          >
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-ink sm:text-base">
                  {LABELS[item.type]}
                </h2>
                <p className="mt-1 text-xs text-ink-dim sm:text-sm">
                  {formatDate(item.createdAt)}
                </p>
              </div>
              <p
                className={cn(
                  "currency-value shrink-0 text-right text-sm font-bold sm:text-base",
                  positive ? "text-positive" : "text-negative",
                )}
              >
                {item.amount} USD
              </p>
            </div>
          </article>
        );
        })}
      </div>
      <TradingPagination pagination={pagination} />
    </div>
  );
}

function TradingPagination({ pagination }: { pagination: TradingPagination }) {
  if (!pagination.hasNextPage && !pagination.hasPreviousPage) return null;

  return (
    <nav
      className="mt-5 flex items-center justify-between gap-3"
      aria-label="Trading activity pages"
    >
      {pagination.hasPreviousPage ? (
        <Link
          href={`/app/history?tradingPage=${pagination.page - 1}`}
          className="rounded-lg border border-gold-600/25 px-3 py-2 text-xs font-semibold text-ink transition hover:bg-gold-600/10"
        >
          Newer entries
        </Link>
      ) : (
        <span aria-hidden />
      )}
      <span className="text-xs text-ink-faint">Page {pagination.page}</span>
      {pagination.hasNextPage ? (
        <Link
          href={`/app/history?tradingPage=${pagination.page + 1}`}
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
