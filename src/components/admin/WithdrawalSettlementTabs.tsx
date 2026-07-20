"use client";

import { useActionState, useMemo, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import {
  adminCompleteWithdrawalPayout,
  adminRecordWithdrawalConversionBatch,
  type AdminFormState,
} from "@/app/admin/actions";
import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type Method = "CRYPTO" | "BANK" | "CASH";

export type SettlementWithdrawal = {
  id: string;
  method: Method;
  investor: string;
  email: string;
  amount: string;
  brokerReceivedUsdt: string;
  requestedInrAmount: string | null;
  network: string;
  address: string;
};

type Props = {
  withdrawals: SettlementWithdrawal[];
};

const inputClass =
  "w-full rounded-lg border border-gold-600/20 bg-vault-900/80 px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-gold-500/50 focus:outline-none";

function formatUsd(value: number): string {
  return Number.isFinite(value)
    ? `${value.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8,
      })} USD`
    : "—";
}

function formatUsdt(value: number): string {
  return Number.isFinite(value)
    ? `${value.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8,
      })} USDT`
    : "—";
}

function formatInr(value: number): string {
  return Number.isFinite(value)
    ? value.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + " INR"
    : "—";
}
function EmptyPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-gold-600/20 px-4 py-9 text-center">
      <Check className="mx-auto size-5 text-positive" aria-hidden />
      <p className="mt-2 text-sm text-ink-dim">{children}</p>
    </div>
  );
}

function CryptoPayouts({
  withdrawals,
}: {
  withdrawals: SettlementWithdrawal[];
}) {
  if (withdrawals.length === 0) {
    return <EmptyPanel>No crypto payouts are waiting to be sent.</EmptyPanel>;
  }

  return (
    <div className="space-y-4">
      {withdrawals.map((withdrawal) => (
        <article
          key={withdrawal.id}
          className="glass-card rounded-2xl p-5 sm:p-6"
        >
          <p className="font-mono text-lg text-ink">
            {formatUsdt(Number(withdrawal.brokerReceivedUsdt))} ready
          </p>
          <p className="mt-1 text-xs text-ink-faint">
            {withdrawal.investor} · {withdrawal.email} · requested{" "}
            {formatUsd(Number(withdrawal.amount))}
          </p>

          <div className="mt-4 rounded-xl border border-gold-600/15 bg-vault-950/50 p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-ink-faint">
              Wallet payout details
            </p>
            <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-ink-faint">Network</dt>
                <dd className="mt-0.5 font-mono text-ink">
                  {withdrawal.network}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-ink-faint">USDT wallet address</dt>
                <dd className="mt-0.5 break-all font-mono text-ink">
                  {withdrawal.address}
                </dd>
              </div>
            </dl>
          </div>

          <AdminActionForm
            action={adminCompleteWithdrawalPayout}
            submitLabel="Mark USDT sent"
            pendingLabel="Recording payout..."
            confirmMessage="Confirm that the USDT was sent to the wallet shown above?"
            className="mt-5 max-w-xl"
          >
            <input type="hidden" name="id" value={withdrawal.id} />
            <label
              className="block text-xs uppercase tracking-[0.14em] text-ink-dim"
              htmlFor={"wallet-tx-" + withdrawal.id}
            >
              Wallet transaction hash
            </label>
            <input
              id={"wallet-tx-" + withdrawal.id}
              name="payoutReference"
              placeholder="Paste the transaction hash"
              required
              className={inputClass}
            />
          </AdminActionForm>
        </article>
      ))}
    </div>
  );
}

function BulkConversionForm({
  method,
  withdrawals,
}: {
  method: "BANK" | "CASH";
  withdrawals: SettlementWithdrawal[];
}) {
  const [state, formAction, pending] = useActionState<
    AdminFormState,
    FormData
  >(adminRecordWithdrawalConversionBatch, {});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [totalInrInput, setTotalInrInput] = useState("");

  const selected = useMemo(
    () =>
      withdrawals.filter((withdrawal) =>
        selectedIds.includes(withdrawal.id),
      ),
    [selectedIds, withdrawals],
  );
  const totalUsd = selected.reduce(
    (sum, withdrawal) => sum + Number(withdrawal.brokerReceivedUsdt),
    0,
  );
  const totalInr = Number(totalInrInput);
  const allSelected =
    withdrawals.length > 0 && selected.length === withdrawals.length;
  const canSubmit =
    selected.length > 0 && Number.isFinite(totalInr) && totalInr > 0;
  const label = method === "BANK" ? "bank transfer" : "cash";

  if (withdrawals.length === 0) {
    return (
      <EmptyPanel>
        No {label} withdrawals are waiting for INR conversion.
      </EmptyPanel>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-5"
      onSubmit={(event) => {
        if (!canSubmit) {
          event.preventDefault();
          return;
        }
        const confirmed = window.confirm(
          `Allocate ${formatInr(totalInr)} across ${selected.length} selected ${label} withdrawal${selected.length === 1 ? "" : "s"} in proportion to their USD values?`,
        );
        if (!confirmed) event.preventDefault();
      }}
    >
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}

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
          Select all {withdrawals.length} {label} withdrawal
          {withdrawals.length === 1 ? "" : "s"}
        </label>

        <div className="divide-y divide-gold-600/10">
          {withdrawals.map((withdrawal) => {
            const checked = selectedIds.includes(withdrawal.id);
            const usd = Number(withdrawal.brokerReceivedUsdt);
            const inrShare =
              checked && totalUsd > 0 && totalInr > 0
                ? (totalInr * usd) / totalUsd
                : null;

            return (
              <label
                key={withdrawal.id}
                className={cn(
                  "grid cursor-pointer gap-2 px-4 py-3.5 transition-colors sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center",
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
                    {withdrawal.email}
                    {withdrawal.requestedInrAmount
                      ? " · estimated " + formatInr(Number(withdrawal.requestedInrAmount))
                      : ""}
                  </span>
                </span>
                <span className="pl-7 text-left sm:pl-0 sm:text-right">
                  <span className="block font-mono text-sm text-ink">
                    {formatUsd(usd)}
                  </span>
                  {inrShare !== null && (
                    <span className="mt-0.5 block font-mono text-xs text-positive">
                      → {formatInr(inrShare)}
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
          <label
            htmlFor={"bulk-inr-" + method.toLowerCase()}
            className="block text-xs uppercase tracking-[0.14em] text-ink-dim"
          >
            Total INR received in company bank account
          </label>
          <input
            id={"bulk-inr-" + method.toLowerCase()}
            name="totalInrReceived"
            type="number"
            min="0.01"
            step="0.01"
            value={totalInrInput}
            onChange={(event) => setTotalInrInput(event.target.value)}
            placeholder="Actual INR received after bulk conversion"
            required
            className={inputClass + " mt-2"}
          />
          <p className="mt-2 text-xs text-ink-faint">
            {selected.length} selected · {formatUsd(totalUsd)}
            {totalInr > 0 && totalUsd > 0
              ? " · effective rate " +
                (totalInr / totalUsd).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) +
                " INR/USD"
              : ""}
          </p>
        </div>
        <Button
          type="submit"
          size="md"
          disabled={!canSubmit || pending}
          aria-busy={pending}
          className="w-full sm:w-auto"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Allocating…
            </>
          ) : (
            "Record bulk conversion"
          )}
        </Button>
      </div>
    </form>
  );
}

export function WithdrawalSettlementTabs({ withdrawals }: Props) {
  const counts = {
    CRYPTO: withdrawals.filter((item) => item.method === "CRYPTO").length,
    BANK: withdrawals.filter((item) => item.method === "BANK").length,
    CASH: withdrawals.filter((item) => item.method === "CASH").length,
  };
  const [active, setActive] = useState<Method>(() => {
    if (counts.CRYPTO > 0) return "CRYPTO";
    if (counts.BANK > 0) return "BANK";
    if (counts.CASH > 0) return "CASH";
    return "CRYPTO";
  });
  const activeWithdrawals = withdrawals.filter(
    (withdrawal) => withdrawal.method === active,
  );
  const tabs: { id: Method; label: string }[] = [
    { id: "CRYPTO", label: "Crypto" },
    { id: "BANK", label: "Bank transfer" },
    { id: "CASH", label: "Cash" },
  ];

  return (
    <div>
      <div
        className="mb-5 flex flex-wrap gap-2 rounded-xl border border-gold-600/15 bg-vault-950/45 p-2"
        role="tablist"
        aria-label="Withdrawal settlement method"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            onClick={() => setActive(tab.id)}
            className={cn(
              "rounded-lg px-4 py-2.5 text-sm transition-colors",
              active === tab.id
                ? "bg-gold-600/15 text-gold-300"
                : "text-ink-dim hover:bg-vault-900/70 hover:text-ink",
            )}
          >
            {tab.label}
            <span className="ml-2 rounded-full bg-vault-950/70 px-2 py-0.5 font-mono text-xs">
              {counts[tab.id]}
            </span>
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {active === "CRYPTO" ? (
          <CryptoPayouts withdrawals={activeWithdrawals} />
        ) : (
          <BulkConversionForm
            key={active}
            method={active}
            withdrawals={activeWithdrawals}
          />
        )}
      </div>
    </div>
  );
}