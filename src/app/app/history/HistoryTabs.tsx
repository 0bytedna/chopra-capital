"use client";

import { useState, type ComponentProps } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CircleDollarSign,
} from "lucide-react";
import { DepositHistory } from "../deposit/DepositHistory";
import { WithdrawalHistory } from "../withdraw/WithdrawalHistory";
import { cn } from "@/lib/cn";
import { TradingHistory } from "./TradingHistory";

type Tab = "TRADING" | "DEPOSITS" | "WITHDRAWALS";
type TradingItems = ComponentProps<typeof TradingHistory>["activity"];
type DepositItems = ComponentProps<typeof DepositHistory>["deposits"];
type WithdrawalItems = ComponentProps<typeof WithdrawalHistory>["withdrawals"];

export function HistoryTabs({
  tradingActivity,
  deposits,
  withdrawals,
  twoFactorEnabled,
  withdrawalMethods,
}: {
  tradingActivity: TradingItems;
  deposits: DepositItems;
  withdrawals: WithdrawalItems;
  twoFactorEnabled: boolean;
  withdrawalMethods: { bank: boolean; cash: boolean };
}) {
  const [tab, setTab] = useState<Tab>("TRADING");

  return (
    <div>
      <div
        className="grid grid-cols-3 gap-1 rounded-xl border border-gold-600/15 bg-vault-900/50 p-1.5 sm:gap-2"
        role="tablist"
        aria-label="Transaction type"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "TRADING"}
          onClick={() => setTab("TRADING")}
          className={cn(
            "flex min-w-0 items-center justify-center gap-1 rounded-lg px-1 py-3 text-xs transition-colors sm:gap-2 sm:px-4 sm:text-sm",
            tab === "TRADING"
              ? "bg-gold-600/15 text-gold-300"
              : "text-ink-dim hover:bg-ink/5 hover:text-ink",
          )}
        >
          <CircleDollarSign className="hidden size-3.5 sm:block" aria-hidden />
          Trading
          <span className="rounded-full bg-vault-950/70 px-1.5 py-0.5 font-mono text-[0.68rem] sm:px-2 sm:text-xs">
            {tradingActivity.length}
          </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "DEPOSITS"}
          onClick={() => setTab("DEPOSITS")}
          className={cn(
            "flex min-w-0 items-center justify-center gap-1 rounded-lg px-1 py-3 text-xs transition-colors sm:gap-2 sm:px-4 sm:text-sm",
            tab === "DEPOSITS"
              ? "bg-gold-600/15 text-gold-300"
              : "text-ink-dim hover:bg-ink/5 hover:text-ink",
          )}
        >
          <ArrowDownToLine className="hidden size-3.5 sm:block" aria-hidden />
          Deposits
          <span className="rounded-full bg-vault-950/70 px-1.5 py-0.5 font-mono text-[0.68rem] sm:px-2 sm:text-xs">
            {deposits.length}
          </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "WITHDRAWALS"}
          onClick={() => setTab("WITHDRAWALS")}
          className={cn(
            "flex min-w-0 items-center justify-center gap-1 rounded-lg px-1 py-3 text-xs transition-colors sm:gap-2 sm:px-4 sm:text-sm",
            tab === "WITHDRAWALS"
              ? "bg-gold-600/15 text-gold-300"
              : "text-ink-dim hover:bg-ink/5 hover:text-ink",
          )}
        >
          <ArrowUpFromLine className="hidden size-3.5 sm:block" aria-hidden />
          Withdrawals
          <span className="rounded-full bg-vault-950/70 px-1.5 py-0.5 font-mono text-[0.68rem] sm:px-2 sm:text-xs">
            {withdrawals.length}
          </span>
        </button>
      </div>

      <div className="mt-6" role="tabpanel">
        {tab === "TRADING" ? (
          <TradingHistory activity={tradingActivity} />
        ) : tab === "DEPOSITS" ? (
          <DepositHistory deposits={deposits} />
        ) : (
          <WithdrawalHistory
            withdrawals={withdrawals}
            twoFactorEnabled={twoFactorEnabled}
            methodAvailability={withdrawalMethods}
          />
        )}
      </div>
    </div>
  );
}