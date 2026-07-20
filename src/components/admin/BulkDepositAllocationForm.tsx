"use client";

import { useActionState, useMemo, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { adminAllocateDeposits, type AdminFormState } from "@/app/admin/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type Method = "CRYPTO" | "BANK" | "CASH";

type ReadyDeposit = {
  id: string;
  investor: string;
  email: string;
  sourceAmount: string;
  reference: string | null;
  network: string | null;
  receivedAt: string;
};

type Props = {
  method: Method;
  deposits: ReadyDeposit[];
};

const inputClass =
  "w-full rounded-lg border border-gold-600/20 bg-vault-950/70 px-3 py-2.5 font-mono text-sm text-ink placeholder:text-ink-faint focus:border-gold-500/50 focus:outline-none";

function formatSource(method: Method, amount: number): string {
  if (method === "CRYPTO") {
    return amount.toLocaleString("en-US", { maximumFractionDigits: 8 }) + " USDT";
  }
  return amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " INR";
}
function formatUsdt(amount: number): string {
  if (!Number.isFinite(amount)) return "—";
  return `${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 8 })} USDT`;
}

export function BulkDepositAllocationForm({ method, deposits }: Props) {
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(adminAllocateDeposits, {});
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
      className="space-y-5"
      onSubmit={(event) => {
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
      {state.success && <Alert tone="success">{state.success}</Alert>}

      {deposits.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gold-600/20 px-4 py-9 text-center">
          <Check className="mx-auto size-5 text-positive" aria-hidden />
          <p className="mt-2 text-sm text-ink-dim">No confirmed INR deposits are waiting for conversion.</p>
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
              Select all {deposits.length} confirmed INR deposit{deposits.length === 1 ? "" : "s"}
            </label>

            <div className="divide-y divide-gold-600/10">
              {deposits.map((deposit) => {
                const checked = selectedIds.includes(deposit.id);
                const source = Number(deposit.sourceAmount);
                const allocation =
                  checked && totalSource > 0 && totalUsdtNumber > 0
                    ? (totalUsdtNumber * source) / totalSource
                    : null;

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
                        {deposit.email}
                        {deposit.reference ? ` · ${deposit.reference}` : ""}
                        {deposit.network ? ` · ${deposit.network}` : ""}
                      </span>
                    </span>
                    <span className="pl-7 text-left sm:pl-0 sm:text-right">
                      <span className="block font-mono text-sm text-ink-dim">{formatSource(method, source)}</span>
                      {allocation !== null && (
                        <span className="mt-0.5 block font-mono text-xs text-positive">→ {formatUsdt(allocation)}</span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 rounded-xl border border-gold-500/25 bg-gold-600/6 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
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
            <Button type="submit" size="md" disabled={!canSubmit || pending} aria-busy={pending} className="w-full sm:w-auto">
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
