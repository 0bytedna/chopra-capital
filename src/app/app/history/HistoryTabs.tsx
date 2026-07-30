"use client";

import { useState, type ComponentProps } from "react";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { DepositHistory } from "../deposit/DepositHistory";
import { WithdrawalHistory } from "../withdraw/WithdrawalHistory";
import { cn } from "@/lib/cn";

type Tab = "DEPOSITS" | "WITHDRAWALS";
type DepositItems = ComponentProps<typeof DepositHistory>["deposits"];
type WithdrawalItems = ComponentProps<typeof WithdrawalHistory>["withdrawals"];

export function HistoryTabs({
  deposits,
  withdrawals,
  twoFactorEnabled,
  withdrawalMethods,
}: {
  deposits: DepositItems;
  withdrawals: WithdrawalItems;
  twoFactorEnabled: boolean;
  withdrawalMethods: { bank: boolean; cash: boolean };
}) {
  const [tab, setTab] = useState<Tab>("DEPOSITS");

  return (
    <div>
      <div
        className="grid grid-cols-2 gap-2 rounded-xl border border-gold-600/15 bg-vault-900/50 p-1.5"
        role="tablist"
        aria-label="Transaction type"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "DEPOSITS"}
          onClick={() => setTab("DEPOSITS")}
          className={cn(
            "flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-3 text-xs transition-colors sm:gap-2 sm:px-4 sm:text-sm",
            tab === "DEPOSITS"
              ? "bg-gold-600/15 text-gold-300"
              : "text-ink-dim hover:bg-ink/5 hover:text-ink",
          )}
        >
          <ArrowDownToLine className="size-4" aria-hidden />
          Deposits
          <span className="rounded-full bg-vault-950/70 px-1.5 py-0.5 font-mono text-xs sm:px-2">
            {deposits.length}
          </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "WITHDRAWALS"}
          onClick={() => setTab("WITHDRAWALS")}
          className={cn(
            "flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-3 text-xs transition-colors sm:gap-2 sm:px-4 sm:text-sm",
            tab === "WITHDRAWALS"
              ? "bg-gold-600/15 text-gold-300"
              : "text-ink-dim hover:bg-ink/5 hover:text-ink",
          )}
        >
          <ArrowUpFromLine className="size-4" aria-hidden />
          Withdrawals
          <span className="rounded-full bg-vault-950/70 px-1.5 py-0.5 font-mono text-xs sm:px-2">
            {withdrawals.length}
          </span>
        </button>
      </div>

      <div className="mt-6" role="tabpanel">
        {tab === "DEPOSITS" ? (
          <DepositHistory deposits={deposits} />
        ) : (
          <WithdrawalHistory withdrawals={withdrawals} twoFactorEnabled={twoFactorEnabled} methodAvailability={withdrawalMethods} />
        )}
      </div>
    </div>
  );
}