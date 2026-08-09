"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Field } from "@/components/ui/Field";
import { OtpField } from "@/components/ui/OtpField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import {
  beginPasswordRecovery,
  resetPasswordWithTwoFactor,
  type RecoveryState,
} from "./actions";

export function ForgotPasswordForm() {
  const [beginState, beginAction] = useActionState<RecoveryState, FormData>(beginPasswordRecovery, { stage: "email" });
  const [resetState, resetAction] = useActionState<RecoveryState, FormData>(resetPasswordWithTwoFactor, { stage: "two-factor" });

  if (resetState.stage === "done") {
    return <div className="mt-6 space-y-4"><Alert tone="success">{resetState.success}</Alert><Link href="/signin" className="inline-flex w-full items-center justify-center rounded-lg border border-gold-500/35 bg-gold-600/10 px-4 py-2.5 text-sm font-medium text-gold-300 transition-colors hover:bg-gold-600/15">Return to sign in</Link></div>;
  }

  if (beginState.stage === "two-factor" && beginState.email) {
    return <form action={resetAction} className="mt-6 space-y-4">
      {resetState.error && <Alert tone="error">{resetState.error}</Alert>}
      <Alert>Two-factor authentication is enabled. Enter the current code from your authenticator app to reset your password.</Alert>
      <input type="hidden" name="email" value={beginState.email} />
      <OtpField label="Authenticator code" name="code" required placeholder="000000" />
      <Field label="New password" name="password" type="password" minLength={8} maxLength={200} autoComplete="new-password" required />
      <Field label="Confirm new password" name="confirmPassword" type="password" minLength={8} maxLength={200} autoComplete="new-password" required />
      <SubmitButton className="w-full" pendingLabel="Resetting password…">Reset password</SubmitButton>
      <button type="button" onClick={() => window.location.reload()} className="w-full text-xs text-ink-faint transition-colors hover:text-gold-300">Use a different email</button>
    </form>;
  }

  return <form action={beginAction} className="mt-6 space-y-4">
    {beginState.error && <Alert tone="error">{beginState.error}</Alert>}
    <Field label="Account email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" hint="If your account has 2FA, you can reset the password here. Otherwise, we will connect you to the administrator on WhatsApp." />
    <SubmitButton className="w-full" pendingLabel="Checking account…">Continue</SubmitButton>
    <Link href="/signin" className="block text-center text-xs text-ink-faint transition-colors hover:text-gold-300">Back to sign in</Link>
  </form>;
}