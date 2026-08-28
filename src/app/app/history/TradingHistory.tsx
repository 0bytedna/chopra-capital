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

export function TradingHistory({ activity }: { activity: TradingHistoryItem[] }) {
  if (activity.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-stone-200 px-5 py-10 text-center text-sm text-ink-dim">
        No trading activity has affected your account yet.
      </div>
    );
  }

  return (
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
  );
}
