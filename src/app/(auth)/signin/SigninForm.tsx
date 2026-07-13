"use client";

import { useActionState } from "react";
import { signin, type AuthFormState } from "../actions";
import { Field } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function SigninForm() {
  const [state, action] = useActionState<AuthFormState, FormData>(signin, {});

  return (
    <form action={action} className="mt-6 space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Field label="Email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required />
      <SubmitButton className="w-full" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
