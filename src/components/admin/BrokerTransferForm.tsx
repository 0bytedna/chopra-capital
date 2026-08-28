"use client";

import { startTransition, useActionState, useMemo, useRef, useState } from "react";
import { Loader2, Pencil, X } from "lucide-react";
import {
  adminEditQueuedDepositConversion,
  adminInvestQueuedDeposits,
  adminRejectQueuedDeposit,
  type AdminFormState,
} from "@/app/admin/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type QueuedDeposit = {
  id: string;
  investor: string;
  method: "CRYPTO" | "BANK" | "CASH";
  queuedAmount: string;
};

type Props = { deposits: QueuedDeposit[] };

const inputClass =
  "w-full rounded-lg border border-gold-600/20 bg-vault-950/70 px-3 py-2.5 currency-value text-sm text-ink placeholder:text-ink-faint focus:border-gold-500/50 focus:outline-none";

function formatUsdt(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;
}


export function BrokerTransferForm({ deposits }: Props) {
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(adminInvestQueuedDeposits, {});
  const [editState, editAction] = useActionState<AdminFormState, FormData>(
    adminEditQueuedDepositConversion,
    {},
  );
  const [rejectState, rejectAction, rejectPending] = useActionState<AdminFormState, FormData>(
    adminRejectQueuedDeposit,
    {},
  );
  const correctedAmountRef = useRef<HTMLInputElement>(null);
  const reasonRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [totalReceived, setTotalReceived] = useState("");

  const selected = useMemo(
    () => deposits.filter((deposit) => selectedIds.includes(deposit.id)),
    [deposits, selectedIds],
  );
  const totalQueued = selected.reduce((sum, deposit) => sum + Number(deposit.queuedAmount), 0);
  const receivedNumber = Number(totalReceived);
  const allSelected = deposits.length > 0 && selected.length === deposits.length;
  const canSubmit =
    selected.length > 0 &&
    Number.isFinite(receivedNumber) &&
    receivedNumber > 0 &&
    receivedNumber <= totalQueued;

  return (
    <form
      action={formAction}
      className="space-y-3"
      onSubmit={(event) => {
        const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        if (submitter?.dataset.intent !== "invest") return;
        if (!canSubmit) {
          event.preventDefault();
          return;
        }
        if (!window.confirm(`Invest ${formatUsdt(receivedNumber)} received by the broker across ${selected.length} queued deposit${selected.length === 1 ? "" : "s"}?`)) {
          event.preventDefault();
        }
      }}
    >
      <input ref={correctedAmountRef} type="hidden" name="newUsdtAmount" />
      <input ref={reasonRef} type="hidden" name="reason" />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {editState.error && <Alert tone="error">{editState.error}</Alert>}
      {rejectState.error && <Alert tone="error">{rejectState.error}</Alert>}

      {deposits.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gold-600/20 px-4 py-3 text-center text-sm text-ink-faint">
          The company USDT wallet queue is empty.
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
              Select all {deposits.length} queued deposit{deposits.length === 1 ? "" : "s"}
            </label>

            <div className="divide-y divide-gold-600/10">
              {deposits.map((deposit) => {
                const checked = selectedIds.includes(deposit.id);
                const queued = Number(deposit.queuedAmount);

                return (
                  <div
                    key={deposit.id}
                    className={cn(
                      "grid grid-cols-[1rem_minmax(0,1fr)_max-content_auto] items-center gap-2 px-3 py-2.5 transition-colors",
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
                      {formatUsdt(queued)}
                    </span>
                    <span className="col-start-4 flex justify-self-end gap-1">
                      {deposit.method !== "CRYPTO" && (
                        <button
                          type="submit"
                          formAction={editAction}
                          formNoValidate
                          name="id"
                          value={deposit.id}
                          data-intent="edit"
                          aria-label={"Edit conversion for " + deposit.investor}
                          title="Edit conversion value"
                          onClick={(event) => {
                            event.preventDefault();
                            const button = event.currentTarget;
                            const amount = window.prompt(
                              "Corrected USDT amount for this deposit",
                              queued.toFixed(8),
                            )?.trim();
                            const reason = amount
                              ? window.prompt("Reason for changing the conversion value")?.trim()
                              : "";
                            if (!amount || !reason || !window.confirm("Save this corrected USDT conversion value?")) {
                              return;
                            }
                            if (correctedAmountRef.current) correctedAmountRef.current.value = amount;
                            if (reasonRef.current) reasonRef.current.value = reason;
                            window.setTimeout(() => button.form?.requestSubmit(button), 0);
                          }}
                          className="flex size-7 items-center justify-center rounded-full border border-stone-300 bg-white text-ink-dim hover:border-gold-400 hover:text-gold-700"
                        >
                          <Pencil className="size-3.5" aria-hidden />
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={rejectPending}
                        aria-label={"Reject " + deposit.investor + " deposit"}
                        title="Reject deposit"
                        onClick={() => {
                          if (!window.confirm("Reject this deposit and remove it from the company-wallet queue?")) return;
                          const data = new FormData();
                          data.set("id", deposit.id);
                          startTransition(() => rejectAction(data));
                        }}
                        className="flex size-7 items-center justify-center rounded-full border border-rose-300 bg-white text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                      >
                        <X className="size-3.5" aria-hidden />
                      </button>
                    </span>                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-x-3 gap-y-2 rounded-xl border border-gold-500/25 bg-gold-600/6 p-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
            <label htmlFor="broker-received-usdt" className="text-xs uppercase tracking-[0.14em] text-ink-dim sm:col-span-2">
              Total USDT received by broker
            </label>
            <input
              id="broker-received-usdt"
              name="totalReceivedUsdt"
              type="number"
              min="0.00000001"
              max={totalQueued > 0 ? totalQueued : undefined}
              step="0.00000001"
              value={totalReceived}
              onChange={(event) => setTotalReceived(event.target.value)}
              placeholder="Net amount after transfer fees"
              required
              className={`${inputClass} h-11 sm:col-start-1 sm:row-start-2`}
            />
            <p className="text-xs text-ink-faint sm:col-start-1 sm:row-start-3">
              {selected.length} selected · company wallet {formatUsdt(totalQueued)} · transfer fee {receivedNumber > 0 && receivedNumber <= totalQueued ? formatUsdt(totalQueued - receivedNumber) : "—"}
            </p>
            <Button type="submit" data-intent="invest" size="sm" disabled={!canSubmit || pending} aria-busy={pending} className="h-11 w-full sm:col-start-2 sm:row-start-2">
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Investing…
                </>
              ) : (
                "Transfer & invest"
              )}
            </Button>
          </div>
        </>
      )}
    </form>
  );
}
