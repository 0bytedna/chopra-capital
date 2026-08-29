"use client";

import { useActionState } from "react";
import { verifyTwoFactor, type AuthFormState } from "../../actions";
import { Alert } from "@/components/ui/Alert";
import { OtpField } from "@/components/ui/OtpField";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function TwoFactorForm() {
  const [state, action] = useActionState<AuthFormState, FormData>(verifyTwoFactor, {});

  return (
    <form action={action} className="mt-6 space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <OtpField
        label="Authentication code"
        name="code"
        required
        autoFocus
        placeholder="000000"
        inputClassName="py-3 pl-12 text-center font-mono text-2xl tracking-[0.5em]"
      />
      <SubmitButton className="w-full" pendingLabel="Verifying…">
        Verify and continue
      </SubmitButton>
    </form>
  );
}
