"use client";

import { useActionState, useMemo, useRef, useState } from "react";
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
  const [undoState, undoAction] = useActionState<AdminFormState, FormData>(
    adminUndoConfirmedDeposit,
    {},
  );
  const [rejectState, rejectAction] = useActionState<AdminFormState, FormData>(
    adminRejectConfirmedDeposit,
    {},
  );
  const reasonRef = useRef<HTMLInputElement>(null);
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
      <input ref={reasonRef} type="hidden" name="reason" />
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
                      "grid grid-cols-[1rem_minmax(0,1fr)_max-content_max-content] items-center gap-1.5 px-3 py-2.5 transition-colors",
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
                    <span className="currency-value col-start-4 justify-self-end whitespace-nowrap text-right text-[clamp(0.68rem,3vw,0.875rem)] text-ink">
                      {formatSource(method, source)}
                    </span>
                    <span className="col-start-3 flex gap-1">
                      <button
                        type="submit"
                        formAction={undoAction}
                        formNoValidate
                        name="id"
                        value={deposit.id}
                        data-intent="undo"
                        aria-label={"Undo confirmation for " + deposit.investor}
                        title="Undo confirmation"
                        onClick={(event) => {
                          event.preventDefault();
                          const button = event.currentTarget;
                          const reason = window.prompt("Why are you undoing this deposit confirmation?")?.trim();
                          if (!reason || !window.confirm("Return this deposit to pending verification?")) {
                            return;
                          }
                          if (reasonRef.current) reasonRef.current.value = reason;
                          window.setTimeout(() => button.form?.requestSubmit(button), 0);
                        }}
                        className="flex size-7 items-center justify-center rounded-full border border-slate-300 bg-white text-ink-dim hover:border-blue-400 hover:text-blue-700"
                      >
                        <Undo2 className="size-3.5" aria-hidden />
                      </button>
                      <button
                        type="submit"
                        formAction={rejectAction}
                        formNoValidate
                        name="id"
                        value={deposit.id}
                        data-intent="reject"
                        aria-label={"Reject " + deposit.investor + " deposit"}
                        title="Reject deposit"
                        onClick={(event) => {
                          event.preventDefault();
                          const button = event.currentTarget;
                          const reason = window.prompt("Why is this confirmed deposit being rejected?")?.trim();
                          if (!reason || !window.confirm("Reject this deposit before conversion?")) {
                            return;
                          }
                          if (reasonRef.current) reasonRef.current.value = reason;
                          window.setTimeout(() => button.form?.requestSubmit(button), 0);
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

          <div className="grid gap-3 rounded-xl border border-gold-500/25 bg-gold-600/6 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
            <div>
              <label htmlFor={`total-usdt-${method}`} className="block text-xs uppercase tracking-[0.14em] text-ink-dim">
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
                className={`${inputClass} mt-2`}
              />
              <p className="mt-2 text-xs text-ink-faint">
                {selected.length} selected · source total {formatSource(method, totalSource)} · distributed proportionally
              </p>
            </div>
            <Button type="submit" data-intent="convert" size="sm" disabled={!canSubmit || pending} aria-busy={pending} className="w-full sm:mt-5 sm:w-auto">
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
