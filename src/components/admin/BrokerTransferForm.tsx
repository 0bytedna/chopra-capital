"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import {
  adminEditQueuedDepositConversion,
  adminInvestQueuedDeposits,
  type AdminFormState,
} from "@/app/admin/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type QueuedDeposit = {
  id: string;
  investor: string;
  email: string;
  method: "CRYPTO" | "BANK" | "CASH";
  detail: string | null;
  queuedAmount: string;
};

type Props = { deposits: QueuedDeposit[] };

const inputClass =
  "w-full rounded-lg border border-gold-600/20 bg-vault-950/70 px-3 py-2.5 currency-value text-sm text-ink placeholder:text-ink-faint focus:border-gold-500/50 focus:outline-none";

function formatUsdt(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;
}

function methodLabel(method: QueuedDeposit["method"]): string {
  if (method === "BANK") return "Bank transfer";
  if (method === "CASH") return "Cash";
  return "Crypto";
}

export function BrokerTransferForm({ deposits }: Props) {
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(adminInvestQueuedDeposits, {});
  const [editState, editAction] = useActionState<AdminFormState, FormData>(
    adminEditQueuedDepositConversion,
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
      {state.success && <Alert tone="success">{state.success}</Alert>}
      {editState.error && <Alert tone="error">{editState.error}</Alert>}
      {editState.success && <Alert tone="success">{editState.success}</Alert>}

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
                const receivedShare =
                  checked && totalQueued > 0 && receivedNumber > 0
                    ? (receivedNumber * queued) / totalQueued
                    : null;
                const feeShare = receivedShare === null ? null : queued - receivedShare;

                return (
                  <div
                    key={deposit.id}
                    className={cn(
                      "grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2 px-3 py-2.5 transition-colors",
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
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-ink">{deposit.investor}</span>
                      <span className="mt-0.5 block text-xs text-ink-faint">
                        {methodLabel(deposit.method)}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="currency-value block whitespace-nowrap text-sm text-ink-dim">
                        {formatUsdt(queued)}
                      </span>
                      {receivedShare !== null && feeShare !== null && (
                        <span className="currency-value mt-0.5 block whitespace-nowrap text-xs text-positive">
                          → {formatUsdt(receivedShare)}
                        </span>
                      )}
                    </span>
                    {deposit.method === "CRYPTO" ? (
                      <span className="size-8" aria-hidden />
                    ) : (
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
                          const amount = window.prompt(
                            "Corrected USDT amount for this deposit",
                            queued.toFixed(8),
                          )?.trim();
                          const reason = amount
                            ? window.prompt("Reason for changing the conversion value")?.trim()
                            : "";
                          if (!amount || !reason || !window.confirm("Save this corrected USDT conversion value?")) {
                            event.preventDefault();
                            return;
                          }
                          if (correctedAmountRef.current) correctedAmountRef.current.value = amount;
                          if (reasonRef.current) reasonRef.current.value = reason;
                        }}
                        className="flex size-8 items-center justify-center rounded-full border border-slate-300 bg-white text-ink-dim hover:border-blue-400 hover:text-blue-700"
                      >
                        <Pencil className="size-4" aria-hidden />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 rounded-xl border border-gold-500/25 bg-gold-600/6 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
            <div>
              <label htmlFor="broker-received-usdt" className="block text-xs uppercase tracking-[0.14em] text-ink-dim">
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
                className={`${inputClass} mt-2`}
              />
              <p className="mt-2 text-xs text-ink-faint">
                {selected.length} selected · company wallet {formatUsdt(totalQueued)} · transfer fee {receivedNumber > 0 && receivedNumber <= totalQueued ? formatUsdt(totalQueued - receivedNumber) : "—"}
              </p>
            </div>
            <Button type="submit" data-intent="invest" size="sm" disabled={!canSubmit || pending} aria-busy={pending} className="w-full sm:mt-5 sm:w-auto">
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
