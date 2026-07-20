"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { requestWithdrawal, type WithdrawFormState } from "./actions";
import { Field } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { cn } from "@/lib/cn";
import type { FinancialRestriction } from "@/lib/financialEligibility";

type Method = "CRYPTO" | "BANK" | "CASH";

export type PayoutDetails = {
  crypto: { address: string; network: string } | null;
  bank: { accountNumber: string; ifsc: string; upiId: string } | null;
};

type Props = {
  open: boolean;
  available: number;
  referenceRate: number;
  payout: PayoutDetails;
  restrictions: Record<Method, FinancialRestriction | null>;
};

const methods: { id: Method; label: string; note: string }[] = [
  { id: "CRYPTO", label: "Crypto wallet", note: "USD request · USDT to saved wallet" },
  { id: "BANK", label: "Bank transfer", note: "USD request · INR to saved bank" },
  { id: "CASH", label: "Cash", note: "USD request · INR cash payout" },
];

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="relative pl-12">
      <span
        aria-hidden
        className="absolute left-0 top-0 flex size-8 items-center justify-center rounded-full border border-gold-500/40 bg-gold-600/10 font-serif text-sm text-gold-400"
      >
        {n}
      </span>
      <h2 className="pt-1 font-serif text-lg text-ink">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function PayoutDetailsCard({ method, payout }: { method: Method; payout: PayoutDetails }) {
  if (method === "CRYPTO") {
    return (
      <div className="rounded-xl border border-gold-600/20 bg-vault-950/60 p-4">
        {payout.crypto ? (
          <>
            <p className="text-[10px] uppercase tracking-[0.16em] text-ink-faint">USDT payout destination</p>
            <p className="mt-1.5 font-mono text-sm text-ink">{payout.crypto.network}</p>
            <p className="mt-1 break-all font-mono text-xs text-ink-dim">{payout.crypto.address}</p>
          </>
        ) : (
          <p className="text-sm text-ink-faint">Add a USDT address and network in Profile &amp; Security before submitting this request.</p>
        )}
      </div>
    );
  }

  if (method === "BANK") {
    return (
      <div className="rounded-xl border border-gold-600/20 bg-vault-950/60 p-4">
        {payout.bank ? (
          <div className="space-y-1.5 text-sm text-ink-dim">
            {payout.bank.upiId && <p>UPI: <span className="font-mono text-ink">{payout.bank.upiId}</span></p>}
            {payout.bank.accountNumber && <p>Account: <span className="font-mono text-ink">{payout.bank.accountNumber}</span></p>}
            {payout.bank.ifsc && <p>IFSC: <span className="font-mono text-ink">{payout.bank.ifsc}</span></p>}
          </div>
        ) : (
          <p className="text-sm text-ink-faint">Add your bank account number and IFSC in Profile &amp; Security before submitting this request.</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gold-600/20 bg-vault-950/60 p-4">
      <p className="text-sm leading-relaxed text-ink-dim">
        Our team will confirm your approved cash collection and arrange it for Monday. Keep your request reference ready when collecting.
      </p>
    </div>
  );
}

function WithdrawalDialog({
  title,
  eyebrow,
  message,
  onConfirm,
}: {
  title: string;
  eyebrow: string;
  message: string;
  onConfirm: () => void;
}) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmButtonRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-vault-950/80 px-5 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="withdrawal-dialog-title"
        className="w-full max-w-md rounded-2xl border border-gold-500/30 bg-vault-900 p-6 shadow-2xl shadow-vault-950/60"
      >
        <p className="eyebrow">{eyebrow}</p>
        <h2 id="withdrawal-dialog-title" className="mt-2 font-serif text-2xl text-ink">{title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-dim">{message}</p>
        <div className="mt-6 flex justify-end">
          <button ref={confirmButtonRef} type="button" onClick={onConfirm} className="btn-gold px-6 py-2.5 text-sm">
            Okay
          </button>
        </div>
      </div>
    </div>
  );
}

function WithdrawalDetailsForm({ method, available, referenceRate, onDismiss }: { method: Method; available: number; referenceRate: number; onDismiss: () => void }) {
  const [state, action] = useActionState<WithdrawFormState, FormData>(requestWithdrawal, {});
  const [amountInput, setAmountInput] = useState("");
  const amountNumber = Number(amountInput);
  const estimatedInr =
    Number.isFinite(amountNumber) && amountNumber > 0 ? amountNumber * referenceRate : 0;

  if (state.windowError) {
    return <WithdrawalDialog eyebrow="Withdrawal schedule" title="Withdrawals are currently closed" message={state.windowError} onConfirm={onDismiss} />;
  }

  if (state.restriction) {
    return <WithdrawalDialog eyebrow="Withdrawal unavailable" title={state.restriction.title} message={state.restriction.message} onConfirm={onDismiss} />;
  }

  if (state.success) {
    return <WithdrawalDialog eyebrow="Withdrawal request received" title="Withdrawal submitted" message={state.success} onConfirm={onDismiss} />;
  }

  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="method" value={method} />
      <Field
        id={`withdraw-${method.toLowerCase()}-amount`}
        label="Amount (USD)"
        name="amount"
        type="number"
        step="0.01"
        min="0.01"
        max={Math.max(available, 0.01)}
        value={amountInput}
        onChange={(event) => setAmountInput(event.target.value)}
        required
        hint={`Available: ${available.toLocaleString("en-US", { maximumFractionDigits: 2 })} USD`}
      />
      {method !== "CRYPTO" && (
        <div
          className="rounded-xl border border-gold-600/20 bg-gold-600/8 px-4 py-3"
          aria-live="polite"
        >
          <p className="text-[10px] uppercase tracking-[0.16em] text-ink-faint">
            Estimated INR payout
          </p>
          <p className="mt-1 font-mono text-lg text-gold-300">
            {estimatedInr > 0
              ? estimatedInr.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) + " INR"
              : "—"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink-faint">
            Based on the current reference rate of{" "}
            {referenceRate.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            INR/USD. The actual INR payout will be updated after the USD is sold for INR.
          </p>
        </div>
      )}
      <SubmitButton pendingLabel="Submitting...">Request withdrawal</SubmitButton>
    </form>
  );
}

export function WithdrawForm({ open, available, referenceRate, payout, restrictions }: Props) {
  const [method, setMethod] = useState<Method>("CRYPTO");
  const [formVersion, setFormVersion] = useState(0);
  const restriction = restrictions[method];

  return (
    <div className="space-y-9">
      {(!open || restriction) && (
        <div className="space-y-3">
          {!open && (
            <Alert tone="warning">
              Withdrawal requests are open on <strong>Sundays from 12:00 AM to 12:00 PM IST</strong>. Approved withdrawals are processed on Monday. You can still select a method and submit to see the schedule reminder.
            </Alert>
          )}
          {restriction && <Alert tone="warning">{restriction.message}</Alert>}
        </div>
      )}
      <Step n={1} title="Choose a withdrawal method">
        <div className="grid gap-2.5 sm:grid-cols-3" role="radiogroup" aria-label="Withdrawal method">
          {methods.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={method === option.id}
              onClick={() => setMethod(option.id)}
              className={cn(
                "rounded-xl border px-4 py-3.5 text-left transition-colors",
                method === option.id
                  ? "border-gold-500/60 bg-gold-600/10"
                  : "border-gold-600/15 bg-vault-900/50 hover:border-gold-600/35",
              )}
            >
              <span className="block font-mono text-sm text-ink">{option.label}</span>
              <span className="mt-0.5 block text-xs text-ink-faint">{option.note}</span>
            </button>
          ))}
        </div>
      </Step>

      <Step n={2} title="Confirm your saved payout details">
        <PayoutDetailsCard method={method} payout={payout} />
      </Step>

      <Step n={3} title="Enter your withdrawal amount">
        <WithdrawalDetailsForm
          key={`${method}-${formVersion}`}
          method={method}
          available={available}
          referenceRate={referenceRate}
          onDismiss={() => setFormVersion((version) => version + 1)}
        />
      </Step>
    </div>
  );
}
