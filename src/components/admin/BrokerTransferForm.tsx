"use client";

import { useActionState, useMemo, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { adminInvestQueuedDeposits, type AdminFormState } from "@/app/admin/actions";
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
  "w-full rounded-lg border border-gold-600/20 bg-vault-950/70 px-3 py-2.5 font-mono text-sm text-ink placeholder:text-ink-faint focus:border-gold-500/50 focus:outline-none";

function formatUsdt(value: number, maximumFractionDigits = 8): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits })} USDT`;
}

function methodLabel(method: QueuedDeposit["method"]): string {
  if (method === "BANK") return "Bank transfer";
  if (method === "CASH") return "Cash";
  return "Crypto";
}

export function BrokerTransferForm({ deposits }: Props) {
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(adminInvestQueuedDeposits, {});
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
      className="space-y-5"
      onSubmit={(event) => {
        if (!canSubmit) {
          event.preventDefault();
          return;
        }
        if (!window.confirm(`Invest ${formatUsdt(receivedNumber)} received by the broker across ${selected.length} queued deposit${selected.length === 1 ? "" : "s"}?`)) {
          event.preventDefault();
        }
      }}
    >
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}

      {deposits.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gold-600/20 px-4 py-9 text-center">
          <Check className="mx-auto size-5 text-positive" aria-hidden />
          <p className="mt-2 text-sm text-ink-dim">The company USDT wallet queue is empty.</p>
        </div>
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
                  <label
                    key={deposit.id}
                    className={cn(
                      "grid cursor-pointer gap-2 px-4 py-3.5 transition-colors sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center",
                      checked ? "bg-gold-600/8" : "hover:bg-vault-950/35",
                    )}
                  >
                    <input
                      type="checkbox"
                      name="depositIds"
                      value={deposit.id}
                      checked={checked}
                      onChange={(event) =>
                        setSelectedIds((current) =>
                          event.target.checked
                            ? [...current, deposit.id]
                            : current.filter((id) => id !== deposit.id),
                        )
                      }
                      className="mt-0.5 size-4 accent-amber-500 sm:mt-0"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-ink">{deposit.investor}</span>
                      <span className="mt-0.5 block truncate text-xs text-ink-faint">
                        {deposit.email} · {methodLabel(deposit.method)}
                        {deposit.detail ? ` · ${deposit.detail}` : ""}
                      </span>
                    </span>
                    <span className="pl-7 text-left sm:pl-0 sm:text-right">
                      <span className="block font-mono text-sm text-ink-dim">{formatUsdt(queued)}</span>
                      {receivedShare !== null && feeShare !== null && (
                        <span className="mt-0.5 block font-mono text-xs text-positive">
                          → {formatUsdt(receivedShare)}
                          {feeShare > 0 ? ` · fee ${formatUsdt(feeShare)}` : ""}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 rounded-xl border border-gold-500/25 bg-gold-600/6 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
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
            <Button type="submit" size="md" disabled={!canSubmit || pending} aria-busy={pending} className="w-full sm:w-auto">
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
