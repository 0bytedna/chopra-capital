"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import {
  adminCreateInternalTransfer,
  type AdminFormState,
} from "@/app/admin/actions";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";

export type TransferInvestorOption = {
  id: string;
  name: string;
  email: string;
  balance: number;
  queued: number;
  invested: number;
};

function formatUsd(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const inputClass =
  "h-11 w-full rounded-lg border border-gold-600/20 bg-vault-950/65 px-3 text-sm text-ink focus:border-gold-500/50 focus:outline-none focus:ring-2 focus:ring-gold-500/20";

export function InternalTransferForm({
  investors,
}: {
  investors: TransferInvestorOption[];
}) {
  const [state, action] = useActionState<AdminFormState, FormData>(
    adminCreateInternalTransfer,
    {},
  );
  const [fromUserId, setFromUserId] = useState("");
  const [toUserId, setToUserId] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const source = useMemo(
    () => investors.find((investor) => investor.id === fromUserId),
    [fromUserId, investors],
  );
  const recipient = useMemo(
    () => investors.find((investor) => investor.id === toUserId),
    [toUserId, investors],
  );


  return (
    <form
      ref={formRef}
      action={action}
      className="space-y-5"
      onSubmit={(event) => {
        if (!source || !recipient) return;
        const amountInput = formRef.current?.elements.namedItem("amount");
        const amount =
          amountInput instanceof HTMLInputElement ? amountInput.value : "";
        const confirmed = window.confirm(
          `Transfer ${amount || "the entered amount"} USD from ${source.name} to ${recipient.name}? This changes both account balances immediately.`,
        );
        if (!confirmed) event.preventDefault();
      }}
    >
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}

      <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-end">
        <label className="space-y-2">
          <span className="block text-[10px] uppercase tracking-[0.14em] text-ink-faint">
            From investor
          </span>
          <select
            name="fromUserId"
            value={fromUserId}
            onChange={(event) => {
              const next = event.target.value;
              setFromUserId(next);
              if (next === toUserId) setToUserId("");
            }}
            required
            className={inputClass}
          >
            <option value="">Choose source account</option>
            {investors.map((investor) => (
              <option key={investor.id} value={investor.id}>
                {investor.name} · {formatUsd(investor.balance)}
              </option>
            ))}
          </select>
        </label>

        <span className="hidden size-11 items-center justify-center rounded-full border border-gold-600/20 bg-gold-600/8 text-gold-400 lg:flex">
          <ArrowRight className="size-4" aria-hidden />
        </span>

        <label className="space-y-2">
          <span className="block text-[10px] uppercase tracking-[0.14em] text-ink-faint">
            To investor
          </span>
          <select
            name="toUserId"
            value={toUserId}
            onChange={(event) => setToUserId(event.target.value)}
            required
            className={inputClass}
          >
            <option value="">Choose recipient account</option>
            {investors
              .filter((investor) => investor.id !== fromUserId)
              .map((investor) => (
                <option key={investor.id} value={investor.id}>
                  {investor.name} · {investor.email}
                </option>
              ))}
          </select>
        </label>
      </div>

      {source && (
        <dl className="grid gap-2 rounded-xl border border-gold-600/15 bg-black/10 p-3 sm:grid-cols-3">
          <div>
            <dt className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              Available balance
            </dt>
            <dd className="mt-1 font-mono text-sm text-ink">{formatUsd(source.balance)}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              Queued funds
            </dt>
            <dd className="mt-1 font-mono text-sm text-ink">{formatUsd(source.queued)}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              Invested value
            </dt>
            <dd className="mt-1 font-mono text-sm text-ink">{formatUsd(source.invested)}</dd>
          </div>
        </dl>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="block text-[10px] uppercase tracking-[0.14em] text-ink-faint">
            Amount (USD)
          </span>
          <input
            name="amount"
            type="number"
            inputMode="decimal"
            min="0.01"
            max={source?.balance}
            step="0.01"
            placeholder="0.00"
            required
            className={inputClass}
          />
        </label>
        <label className="space-y-2">
          <span className="block text-[10px] uppercase tracking-[0.14em] text-ink-faint">
            Audit note (optional)
          </span>
          <input
            name="note"
            type="text"
            maxLength={500}
            placeholder="Reason or internal reference"
            className={inputClass}
          />
        </label>
      </div>

      <div className="flex flex-col gap-3 border-t border-gold-600/15 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex max-w-xl items-start gap-2 text-xs leading-5 text-ink-faint">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-gold-400" aria-hidden />
          Queued funds move first. Any remainder moves as pool units at the current NAV.
          The pool total stays unchanged and both ledger entries are permanent.
        </p>
        <SubmitButton pendingLabel="Transferring…">Confirm internal transfer</SubmitButton>
      </div>
    </form>
  );
}