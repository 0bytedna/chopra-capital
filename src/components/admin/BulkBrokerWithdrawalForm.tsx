"use client";

import { startTransition, useActionState, useMemo, useState } from "react";
import { Loader2, Undo2, X } from "lucide-react";
import {
  adminRecordBrokerWithdrawalBatch,
  adminRejectApprovedWithdrawal,
  adminUndoWithdrawalApproval,
  type AdminFormState,
} from "@/app/admin/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type BrokerWithdrawal = {
  id: string;
  investor: string;
  amount: string;
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


export function BulkBrokerWithdrawalForm({ withdrawals }: Props) {
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(
    adminRecordBrokerWithdrawalBatch,
    {},
  );
  const [undoState, undoAction, undoPending] = useActionState<AdminFormState, FormData>(
    adminUndoWithdrawalApproval,
    {},
  );
  const [rejectState, rejectAction, rejectPending] = useActionState<AdminFormState, FormData>(
    adminRejectApprovedWithdrawal,
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
        const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        if (submitter?.dataset.intent !== "broker") return;
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
      {undoState.error && <Alert tone="error">{undoState.error}</Alert>}
      {rejectState.error && <Alert tone="error">{rejectState.error}</Alert>}

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
                  <div
                    key={withdrawal.id}
                    className={cn(
                      "grid grid-cols-[1rem_minmax(0,1fr)_max-content] items-center gap-x-2 gap-y-1.5 px-3 py-2.5 transition-colors",
                      checked ? "bg-gold-600/8" : "hover:bg-vault-950/35",
                    )}
                  >
                    <input
                      type="checkbox"
                      name="withdrawalIds"
                      value={withdrawal.id}
                      checked={checked}
                      aria-label={"Select " + withdrawal.investor}
                      onChange={(event) =>
                        setSelectedIds((current) =>
                          event.target.checked
                            ? [...current, withdrawal.id]
                            : current.filter((id) => id !== withdrawal.id),
                        )
                      }
                      className="size-4 accent-amber-500"
                    />
                    <span className="min-w-0 truncate whitespace-nowrap text-[clamp(0.7rem,3.2vw,0.875rem)] font-medium text-ink">
                      {withdrawal.investor}
                    </span>
                    <span className="currency-value col-start-3 justify-self-end whitespace-nowrap text-right text-[clamp(0.68rem,3vw,0.875rem)] text-ink">
                      {formatUsd(Number(withdrawal.amount))}
                    </span>
                    <span className="col-start-3 row-start-2 flex justify-self-end gap-1">
                      <button
                        type="button"
                        disabled={undoPending || rejectPending}
                        data-intent="undo"
                        aria-label={"Undo approval for " + withdrawal.investor}
                        title="Undo approval"
                        onClick={() => {
                          if (!window.confirm("Return this withdrawal to approval review?")) return;
                          const data = new FormData();
                          data.set("id", withdrawal.id);
                          startTransition(() => undoAction(data));
                        }}
                        className="flex size-7 items-center justify-center rounded-full border border-slate-300 bg-white text-ink-dim hover:border-blue-400 hover:text-blue-700"
                      >
                        <Undo2 className="size-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        disabled={undoPending || rejectPending}
                        data-intent="reject"
                        aria-label={"Reject " + withdrawal.investor + " withdrawal"}
                        title="Reject withdrawal"
                        onClick={() => {
                          if (!window.confirm("Reject this withdrawal before the broker batch?")) return;
                          const data = new FormData();
                          data.set("id", withdrawal.id);
                          startTransition(() => rejectAction(data));
                        }}
                        className="flex size-7 items-center justify-center rounded-full border border-rose-300 bg-white text-rose-700 hover:bg-rose-50"
                      >
                        <X className="size-3.5" aria-hidden />
                      </button>
                    </span>
                  </div>
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
              data-intent="broker"
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