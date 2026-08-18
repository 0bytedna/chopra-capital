"use client";

import { startTransition, useActionState, useMemo, useState } from "react";
import { Loader2, Undo2, X } from "lucide-react";
import {
  adminAllocateDeposits,
  adminRejectConfirmedDeposit,
  adminUndoConfirmedDeposit,
  type AdminFormState,
} from "@/app/admin/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type Method = "CRYPTO" | "BANK" | "CASH";

type ReadyDeposit = {
  id: string;
  investor: string;
  sourceAmount: string;
};

type Props = {
  method: Method;
  deposits: ReadyDeposit[];
};

const inputClass =
  "w-full rounded-lg border border-gold-600/20 bg-vault-950/70 px-3 py-2.5 currency-value text-sm text-ink placeholder:text-ink-faint focus:border-gold-500/50 focus:outline-none";

function formatSource(method: Method, amount: number): string {
  if (method === "CRYPTO") {
    return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " USDT";
  }
  return amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " INR";
}
function formatUsdt(amount: number): string {
  if (!Number.isFinite(amount)) return "—";
  return `${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;
}

export function BulkDepositAllocationForm({ method, deposits }: Props) {
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(adminAllocateDeposits, {});
  const [undoState, undoAction, undoPending] = useActionState<AdminFormState, FormData>(
    adminUndoConfirmedDeposit,
    {},
  );
  const [rejectState, rejectAction, rejectPending] = useActionState<AdminFormState, FormData>(
    adminRejectConfirmedDeposit,
    {},
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [totalUsdt, setTotalUsdt] = useState("");

  const selected = useMemo(
    () => deposits.filter((deposit) => selectedIds.includes(deposit.id)),
    [deposits, selectedIds],
  );
  const totalSource = selected.reduce((sum, deposit) => sum + Number(deposit.sourceAmount), 0);
  const totalUsdtNumber = Number(totalUsdt);
  const allSelected = deposits.length > 0 && selected.length === deposits.length;
  const canSubmit = selected.length > 0 && Number.isFinite(totalUsdtNumber) && totalUsdtNumber > 0;

  return (
    <form
      action={formAction}
      className="space-y-3"
      onSubmit={(event) => {
        const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        if (submitter?.dataset.intent !== "convert") return;
        if (!canSubmit) {
          event.preventDefault();
          return;
        }
        if (!window.confirm(`Convert the selected INR receipts into ${formatUsdt(totalUsdtNumber)} and move them to the company-wallet queue?`)) {
          event.preventDefault();
        }
      }}
    >

      <input type="hidden" name="method" value={method} />

      {state.error && <Alert tone="error">{state.error}</Alert>}
      {undoState.error && <Alert tone="error">{undoState.error}</Alert>}
      {rejectState.error && <Alert tone="error">{rejectState.error}</Alert>}

      {deposits.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gold-600/20 px-4 py-3 text-center text-sm text-ink-faint">
          No confirmed INR deposits are waiting for conversion.
        </p>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-gold-600/15">
            <label className="flex cursor-pointer items-center gap-3 border-b border-gold-600/15 bg-vault-950/55 px-4 py-3 text-xs text-ink-dim">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(event) => setSelectedIds(event.target.checked ? deposits.map((deposit) => deposit.id) : [])}
                className="size-4 accent-amber-500"
              />
              Select all {deposits.length} deposit{deposits.length === 1 ? "" : "s"}
            </label>

            <div className="divide-y divide-gold-600/10">
              {deposits.map((deposit) => {
                const checked = selectedIds.includes(deposit.id);
                const source = Number(deposit.sourceAmount);

                return (
                  <div
                    key={deposit.id}
                    className={cn(
                      "grid grid-cols-[1rem_minmax(0,1fr)_max-content] items-center gap-x-2 gap-y-1.5 px-3 py-2.5 transition-colors",
                      checked ? "bg-gold-600/8" : "hover:bg-vault-950/35",
                    )}
                  >
                    <input
                      type="checkbox"
                      name="depositIds"
                      value={deposit.id}
                      checked={checked}
                      aria-label={"Select " + deposit.investor}
                      onChange={(event) =>
                        setSelectedIds((current) =>
                          event.target.checked
                            ? [...current, deposit.id]
                            : current.filter((id) => id !== deposit.id),
                        )
                      }
                      className="size-4 accent-amber-500"
                    />
                    <span className="min-w-0 truncate whitespace-nowrap text-[clamp(0.7rem,3.2vw,0.875rem)] font-medium text-ink">
                      {deposit.investor}
                    </span>
                    <span className="currency-value col-start-3 justify-self-end whitespace-nowrap text-right text-[clamp(0.68rem,3vw,0.875rem)] text-ink">
                      {formatSource(method, source)}
                    </span>
                    <span className="col-start-3 row-start-2 flex justify-self-end gap-1">
                      <button
                        type="button"
                        disabled={undoPending || rejectPending}
                        data-intent="undo"
                        aria-label={"Undo confirmation for " + deposit.investor}
                        title="Undo confirmation"
                        onClick={() => {
                          if (!window.confirm("Return this deposit to pending verification?")) return;
                          const data = new FormData();
                          data.set("id", deposit.id);
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
                        aria-label={"Reject " + deposit.investor + " deposit"}
                        title="Reject deposit"
                        onClick={() => {
                          if (!window.confirm("Reject this deposit before conversion?")) return;
                          const data = new FormData();
                          data.set("id", deposit.id);
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

          <div className="grid gap-x-3 gap-y-2 rounded-xl border border-gold-500/25 bg-gold-600/6 p-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
            <label htmlFor={`total-usdt-${method}`} className="text-xs uppercase tracking-[0.14em] text-ink-dim sm:col-span-2">
              Total USDT bought in company wallet
            </label>
            <input
              id={`total-usdt-${method}`}
              name="totalUsdt"
              type="number"
              min="0.00000001"
              step="0.00000001"
              value={totalUsdt}
              onChange={(event) => setTotalUsdt(event.target.value)}
              placeholder="Enter USDT received after conversion"
              required
              className={`${inputClass} h-11 sm:col-start-1 sm:row-start-2`}
            />
            <p className="text-xs text-ink-faint sm:col-start-1 sm:row-start-3">
              {selected.length} selected · source total {formatSource(method, totalSource)} · distributed proportionally
            </p>
            <Button type="submit" data-intent="convert" size="sm" disabled={!canSubmit || pending} aria-busy={pending} className="h-11 w-full sm:col-start-2 sm:row-start-2">
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Converting…
                </>
              ) : (
                "Convert & move to queue"
              )}
            </Button>
          </div>
        </>
      )}
    </form>
  );
}
