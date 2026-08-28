"use client";

import { useActionState, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
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
  amount: string;
  brokerReceivedUsdt: string;
  network: string;
  address: string;
};

type Props = {
  withdrawals: SettlementWithdrawal[];
};

const inputClass =
  "w-full rounded-lg border border-gold-600/20 bg-vault-900/80 px-3 py-2.5 currency-value text-sm text-ink placeholder:text-ink-faint focus:border-gold-500/50 focus:outline-none";

function formatUsd(value: number): string {
  return Number.isFinite(value)
    ? `${value.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} USD`
    : "—";
}

function formatUsdt(value: number): string {
  return Number.isFinite(value)
    ? `${value.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
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
    <p className="rounded-xl border border-dashed border-gold-600/20 px-4 py-3 text-center text-sm text-ink-faint">
      {children}
    </p>
  );
}

export function CryptoPayouts({
  withdrawals,
}: {
  withdrawals: SettlementWithdrawal[];
}) {
  if (withdrawals.length === 0) {
    return <EmptyPanel>No crypto payouts are waiting to be sent.</EmptyPanel>;
  }

  return (
    <div className="space-y-3">
      {withdrawals.map((withdrawal) => (
        <article
          key={withdrawal.id}
          className="glass-card rounded-2xl p-4 sm:p-5"
        >
          <div className="flex min-w-0 items-center justify-between gap-3">
            <p className="currency-value whitespace-nowrap text-lg text-ink">
              {formatUsdt(Number(withdrawal.brokerReceivedUsdt))} ready
            </p>
            <p className="min-w-0 truncate text-right text-[clamp(0.7rem,3.2vw,0.875rem)] font-medium text-ink">
              {withdrawal.investor}
            </p>
          </div>

          <div className="mt-3 rounded-xl border border-gold-600/15 bg-vault-950/50 p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-ink-faint">
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
            showSuccess={false}
            submitLabel="Mark USDT sent"
            pendingLabel="Recording payout..."
            confirmMessage="Confirm that the USDT was sent to the wallet shown above?"
            className="mt-3 max-w-xl"
            submitClassName="h-11 w-full sm:w-56"
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
      className="space-y-3"
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
                  "grid cursor-pointer grid-cols-[1rem_minmax(0,1fr)_max-content] items-center gap-1.5 px-3 py-2.5 transition-colors",
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
                  className="size-4 accent-amber-500"
                />
                <span className="min-w-0 truncate whitespace-nowrap text-[clamp(0.7rem,3.2vw,0.875rem)] font-medium text-ink">
                  {withdrawal.investor}
                </span>
                <span className="text-right">
                  <span className="currency-value block whitespace-nowrap text-[clamp(0.68rem,3vw,0.875rem)] text-ink">
                    {formatUsd(usd)}
                  </span>
                  {inrShare !== null && (
                    <span className="currency-value mt-0.5 block text-xs text-positive">
                      → {formatInr(inrShare)}
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="grid gap-x-3 gap-y-2 rounded-xl border border-gold-500/25 bg-gold-600/6 p-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <label
          htmlFor={"bulk-inr-" + method.toLowerCase()}
          className="text-xs uppercase tracking-[0.14em] text-ink-dim sm:col-span-2"
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
          className={inputClass + " h-11 sm:col-start-1 sm:row-start-2"}
        />
        <p className="text-xs text-ink-faint sm:col-start-1 sm:row-start-3">
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
        <Button
          type="submit"
          size="sm"
          disabled={!canSubmit || pending}
          aria-busy={pending}
          className="h-11 w-full sm:col-start-2 sm:row-start-2"
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
  const conversionWithdrawals = withdrawals.filter(
    (item) => item.method === "BANK" || item.method === "CASH",
  );
  const counts = {
    BANK: conversionWithdrawals.filter((item) => item.method === "BANK").length,
    CASH: conversionWithdrawals.filter((item) => item.method === "CASH").length,
  };
  const [active, setActive] = useState<"BANK" | "CASH">(() =>
    counts.BANK > 0 ? "BANK" : counts.CASH > 0 ? "CASH" : "BANK",
  );
  const activeWithdrawals = conversionWithdrawals.filter(
    (withdrawal) => withdrawal.method === active,
  );
  const tabs: Array<{ id: "BANK" | "CASH"; label: string }> = [
    { id: "BANK", label: "Bank" },
    { id: "CASH", label: "Cash" },
  ];

  return (
    <div>
      <div
        className="mb-3 grid grid-cols-2 gap-1 rounded-xl border border-stone-200 bg-white p-1"
        role="tablist"
        aria-label="INR conversion method"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            onClick={() => setActive(tab.id)}
            className={cn(
              "min-w-0 rounded-lg px-2 py-2 text-xs transition-colors sm:text-sm",
              active === tab.id
                ? "bg-gold-100 text-gold-700"
                : "text-ink-dim hover:bg-stone-50 hover:text-ink",
            )}
          >
            {tab.label}
            <span className="ml-1.5 rounded-full bg-white/75 px-1.5 py-0.5 font-mono text-[11px]">
              {counts[tab.id]}
            </span>
          </button>
        ))}
      </div>

      <div role="tabpanel">
        <BulkConversionForm
          key={active}
          method={active}
          withdrawals={activeWithdrawals}
        />
      </div>
    </div>
  );
}