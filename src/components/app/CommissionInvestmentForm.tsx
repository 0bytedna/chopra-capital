"use client";

import { useActionState } from "react";
import { ArrowRightLeft, LoaderCircle } from "lucide-react";
import {
  investCommissionBalance,
  type CommissionInvestmentState,
} from "@/app/app/referrals/actions";

export function CommissionInvestmentForm({
  balance,
  balanceDisplay,
  minimum,
}: {
  balance: string;
  balanceDisplay: string;
  minimum: string;
}) {
  const [state, action, pending] = useActionState<
    CommissionInvestmentState,
    FormData
  >(investCommissionBalance, {});
  const eligible = Number(balance) >= Number(minimum);

  return (
    <div className="rounded-xl border border-gold-600/20 bg-gold-600/5 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">Invest commission balance</p>
        </div>
        <form action={action}>
          <button
            type="submit"
            disabled={!eligible || pending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gold-500 px-4 py-3 text-sm font-semibold text-vault-950 transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
          >
            {pending ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
            ) : (
              <ArrowRightLeft className="size-4" aria-hidden />
            )}
            Invest {balanceDisplay} USD
          </button>
        </form>
      </div>
      {!eligible && (
        <p className="mt-3 text-xs text-ink-faint">
          This option unlocks when your commission balance reaches {minimum} USD.
        </p>
      )}
      {state.error && <p className="mt-3 text-sm text-negative">{state.error}</p>}
      {state.success && <p className="mt-3 text-sm text-positive">{state.success}</p>}
    </div>
  );
}
