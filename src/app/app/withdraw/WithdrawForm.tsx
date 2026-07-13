"use client";

import { useActionState } from "react";
import { requestWithdrawal, type WithdrawFormState } from "./actions";
import { Field, SelectField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function WithdrawForm({ open, available }: { open: boolean; available: number }) {
  const [state, action] = useActionState<WithdrawFormState, FormData>(requestWithdrawal, {});

  if (state.success) {
    return <Alert tone="success">{state.success}</Alert>;
  }

  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {!open && (
        <Alert tone="warning">
          Withdrawal requests open on <strong>Saturdays</strong> and are processed on Sundays. Come
          back then — there is never a lock-in on your funds.
        </Alert>
      )}
      <Field
        label="Amount (USDT)"
        name="amount"
        type="number"
        step="0.01"
        min={1}
        max={Math.max(available, 1)}
        required
        hint={`Available: ${available.toLocaleString("en-US", { maximumFractionDigits: 2 })} USDT`}
      />
      <SelectField label="Network" name="network" required>
        <option value="TRC20">USDT · TRC20 (Tron)</option>
        <option value="ERC20">USDT · ERC20 (Ethereum)</option>
        <option value="BEP20">USDT · BEP20 (BNB Smart Chain)</option>
      </SelectField>
      <Field
        label="Your USDT address"
        name="address"
        required
        placeholder="Paste your receiving wallet address"
        hint="Double-check this — transfers cannot be reversed."
      />
      <SubmitButton pendingLabel="Submitting…" disabled={!open}>
        Request withdrawal
      </SubmitButton>
    </form>
  );
}
