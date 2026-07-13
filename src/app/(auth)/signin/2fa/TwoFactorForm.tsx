"use client";

import { useActionState } from "react";
import { verifyTwoFactor, type AuthFormState } from "../../actions";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function TwoFactorForm() {
  const [state, action] = useActionState<AuthFormState, FormData>(verifyTwoFactor, {});

  return (
    <form action={action} className="mt-6 space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="space-y-1.5">
        <label htmlFor="code" className="block text-xs font-medium uppercase tracking-[0.14em] text-ink-dim">
          Authentication code
        </label>
        <input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          autoFocus
          placeholder="000000"
          className="w-full rounded-lg border border-gold-600/20 bg-vault-900/80 px-3.5 py-3 text-center font-mono text-2xl tracking-[0.5em] text-ink placeholder:text-ink-faint focus:border-gold-500/50 focus:outline-none focus:ring-2 focus:ring-gold-500/25"
        />
      </div>
      <SubmitButton className="w-full" pendingLabel="Verifying…">
        Verify and continue
      </SubmitButton>
    </form>
  );
}
