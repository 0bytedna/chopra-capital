"use client";

import { useActionState, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  adminRecordBrokerWithdrawalBatch,
  type AdminFormState,
} from "@/app/admin/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type BrokerWithdrawal = {
  id: string;
  investor: string;
  email: string;
  method: "CRYPTO" | "BANK" | "CASH";
  amount: string;
  weekKey: string;
};

type Props = {
  withdrawals: BrokerWithdrawal[];
};

function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} USD`;
}

function methodLabel(method: BrokerWithdrawal["method"]): string {
  if (method === "CRYPTO") return "USDT wallet payout";
  if (method === "BANK") return "Bank payout";
  return "Cash payout";
}

export function BulkBrokerWithdrawalForm({ withdrawals }: Props) {
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(
    adminRecordBrokerWithdrawalBatch,
    {},
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selected = useMemo(
    () => withdrawals.filter((withdrawal) => selectedIds.includes(withdrawal.id)),
    [selectedIds, withdrawals],
  );
  const totalUsd = selected.reduce(
    (sum, withdrawal) => sum + Number(withdrawal.amount),
    0,
  );
  const allSelected =
    withdrawals.length > 0 && selected.length === withdrawals.length;
  const canSubmit = selected.length > 0;


  return (
    <form
      action={formAction}
      className="space-y-3"
      onSubmit={(event) => {
        if (!canSubmit) {
          event.preventDefault();
          return;
        }
        const confirmed = window.confirm(
          `Confirm that ${formatUsd(totalUsd)} was withdrawn from the broker for ${selected.length} selected request${selected.length === 1 ? "" : "s"}? Investor balances will be debited and this cannot be undone.`,
        );
        if (!confirmed) event.preventDefault();
      }}
    >
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}

      {withdrawals.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gold-600/20 px-4 py-3 text-center text-sm text-ink-faint">
          No approved withdrawals are waiting for the broker batch.
        </p>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-gold-600/15">
            <label className="flex cursor-pointer items-center gap-3 border-b border-gold-600/15 bg-vault-950/55 px-4 py-3 text-xs text-ink-dim">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(event) =>
                  setSelectedIds(
                    event.target.checked
                      ? withdrawals.map((withdrawal) => withdrawal.id)
                      : [],
                  )
                }
                className="size-4 accent-amber-500"
              />
              Select all {withdrawals.length} approved request
              {withdrawals.length === 1 ? "" : "s"}
            </label>

            <div className="divide-y divide-gold-600/10">
              {withdrawals.map((withdrawal) => {
                const checked = selectedIds.includes(withdrawal.id);
                return (
                  <label
                    key={withdrawal.id}
                    className={cn(
                      "grid cursor-pointer gap-2 px-4 py-2.5 transition-colors sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center",
                      checked ? "bg-gold-600/8" : "hover:bg-vault-950/35",
                    )}
                  >
                    <input
                      type="checkbox"
                      name="withdrawalIds"
                      value={withdrawal.id}
                      checked={checked}
                      onChange={(event) =>
                        setSelectedIds((current) =>
                          event.target.checked
                            ? [...current, withdrawal.id]
                            : current.filter((id) => id !== withdrawal.id),
                        )
                      }
                      className="mt-0.5 size-4 accent-amber-500 sm:mt-0"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-ink">
                        {withdrawal.investor}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-ink-faint">
                        {withdrawal.email} · {methodLabel(withdrawal.method)} · week{" "}
                        {withdrawal.weekKey}
                      </span>
                    </span>
                    <span className="currency-value pl-7 text-sm text-ink sm:pl-0 sm:text-right">
                      {formatUsd(Number(withdrawal.amount))}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-gold-500/25 bg-gold-600/6 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-ink-dim">
                Bulk broker withdrawal
              </p>
              <p className="currency-value mt-1 text-lg text-gold-300">
                {formatUsd(totalUsd)}
              </p>
              <p className="mt-1 text-xs text-ink-faint">
                {selected.length} request{selected.length === 1 ? "" : "s"} selected
              </p>
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={!canSubmit || pending}
              aria-busy={pending}
              className="w-full sm:w-auto"
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Confirming…
                </>
              ) : (
                "Confirm withdrawn from broker"
              )}
            </Button>
          </div>
        </>
      )}
    </form>
  );
}