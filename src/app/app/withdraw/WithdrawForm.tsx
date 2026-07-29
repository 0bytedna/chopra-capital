"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { requestWithdrawal, type WithdrawFormState } from "./actions";
import { Field, SelectField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";
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
  twoFactorEnabled: boolean;
  bankEnabled: boolean;
  cashEnabled: boolean;
};

const methods: { id: Method; label: string; note: string }[] = [
  { id: "CRYPTO", label: "Crypto wallet", note: "USD request · USDT to saved wallet" },
  { id: "BANK", label: "Bank transfer", note: "USD request · INR to saved bank" },
  { id: "CASH", label: "Cash", note: "USD request · INR cash payout" },
];

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-gold-500/40 bg-gold-600/10 font-serif text-sm text-gold-400"
        >
          {n}
        </span>
        <h2 className="min-w-0 font-serif text-base leading-snug text-ink sm:text-lg">{title}</h2>
      </div>
      <div className="mt-3 sm:pl-11">{children}</div>
    </div>
  );
}

function PayoutDetailsCard({ method, payout }: { method: Method; payout: PayoutDetails }) {
  if (method === "CRYPTO") {
    return (
      <div className="rounded-xl border border-gold-600/20 bg-vault-950/60 px-4 py-3">
        {payout.crypto ? (
          <>
            <p className="text-xs uppercase tracking-[0.16em] text-ink-faint">USDT payout destination</p>
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
      <div className="rounded-xl border border-gold-600/20 bg-vault-950/60 px-4 py-3">
        {payout.bank ? (
          <dl className="divide-y divide-gold-600/10">
            {payout.bank.upiId && (
              <div className="grid gap-1 py-2 first:pt-0 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-baseline">
                <dt className="text-xs uppercase tracking-[0.14em] text-ink-faint">UPI ID</dt>
                <dd className="break-all font-mono text-sm text-ink">{payout.bank.upiId}</dd>
              </div>
            )}
            {payout.bank.accountNumber && (
              <div className="grid gap-1 py-2 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-baseline">
                <dt className="text-xs uppercase tracking-[0.14em] text-ink-faint">Account number</dt>
                <dd className="break-all font-mono text-sm text-ink">{payout.bank.accountNumber}</dd>
              </div>
            )}
            {payout.bank.ifsc && (
              <div className="grid gap-1 py-2 last:pb-0 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-baseline">
                <dt className="text-xs uppercase tracking-[0.14em] text-ink-faint">IFSC</dt>
                <dd className="break-all font-mono text-sm text-ink">{payout.bank.ifsc}</dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="text-sm text-ink-faint">Add your bank account number and IFSC in Profile &amp; Security before submitting this request.</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gold-600/20 bg-vault-950/60 px-4 py-3">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-vault-950/80 px-4 backdrop-blur-sm sm:px-5">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="withdrawal-dialog-title"
        className="w-full max-w-md rounded-2xl border border-gold-500/30 bg-vault-900 p-5 shadow-2xl shadow-vault-950/60 sm:p-6"
      >
        <p className="eyebrow">{eyebrow}</p>
        <h2 id="withdrawal-dialog-title" className="mt-2 font-serif text-xl text-ink sm:text-2xl">{title}</h2>
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

function WithdrawalDetailsForm({ method, available, referenceRate, twoFactorEnabled, onDismiss }: { method: Method; available: number; referenceRate: number; twoFactorEnabled: boolean; onDismiss: () => void }) {
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
          <p className="text-xs uppercase tracking-[0.16em] text-ink-faint">
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
      {twoFactorEnabled && (
        <Field
          id={`withdraw-${method.toLowerCase()}-code`}
          label="Authenticator code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          placeholder="000000"
          hint="Required because two-factor authentication is enabled on your account."
        />
      )}
      <SubmitButton pendingLabel="Submitting..." className="w-full sm:w-auto">Request withdrawal</SubmitButton>
    </form>
  );
}

export function WithdrawForm({
  open,
  available,
  referenceRate,
  payout,
  restrictions,
  twoFactorEnabled,
  bankEnabled,
  cashEnabled,
}: Props) {
  const [method, setMethod] = useState<Method>("CRYPTO");
  const [formVersion, setFormVersion] = useState(0);
  const availableMethods = methods.filter(
    (option) => option.id === "CRYPTO" || (option.id === "BANK" && bankEnabled) || (option.id === "CASH" && cashEnabled),
  );
  const activeMethod = availableMethods.some((option) => option.id === method) ? method : "CRYPTO";
  const activeMethodMeta = availableMethods.find((option) => option.id === activeMethod) ?? availableMethods[0];
  const restriction = restrictions[activeMethod];

  return (
    <div className="space-y-6">
      {(!open || restriction) && (
        <div className="space-y-3">
          {!open && (
            <Alert tone="warning">
              Withdrawal requests are open on <strong>Sundays from 12:00 AM to 12:00 PM IST</strong>. Approved withdrawals are processed on Monday. You can still select a method and submit to see the schedule reminder.
            </Alert>
          )}
          {restriction && <Alert tone="error">{restriction.message}</Alert>}
        </div>
      )}
      <Step n={1} title="Choose a withdrawal method">
        <SelectField
          label="Withdrawal method"
          name="withdrawalMethodPicker"
          value={activeMethod}
          onChange={(event) => setMethod(event.target.value as Method)}
          hint={activeMethodMeta?.note}
        >
          {availableMethods.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </SelectField>
      </Step>

      <Step n={2} title="Confirm destination and enter amount">
        <PayoutDetailsCard method={activeMethod} payout={payout} />
        <div className="mt-4">
          <WithdrawalDetailsForm
            key={`${activeMethod}-${formVersion}`}
            method={activeMethod}
            available={available}
            referenceRate={referenceRate}
            twoFactorEnabled={twoFactorEnabled}
            onDismiss={() => setFormVersion((version) => version + 1)}
          />
        </div>
      </Step>
    </div>
  );
}
