"use client";

import { useActionState } from "react";
import { signup, type AuthFormState } from "../actions";
import { Field } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function SignupForm() {
  const [state, action] = useActionState<AuthFormState, FormData>(signup, {});

  return (
    <form action={action} className="mt-6 space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Field label="Full name" name="fullName" autoComplete="name" required placeholder="As it appears on your ID" />
      <Field label="Email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        hint="At least 8 characters."
      />
      <SubmitButton className="w-full" pendingLabel="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}
