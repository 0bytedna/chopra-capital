"use client";

import { useActionState, useState, useTransition } from "react";
import Image from "next/image";
import {
  updateProfile,
  submitKyc,
  updateBanking,
  updateCryptoWallet,
  startTotpEnrolment,
  enableTotp,
  disableTotp,
  changePassword,
  type ProfileFormState,
  type FinancialDetailsFormState,
  type TotpEnrolState,
} from "./actions";
import { Field, SelectField, TextareaField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";

export function ProfileDetailsForm({
  fullName,
  mobile,
  email,
  address,
  city,
  stateField,
  country,
}: {
  fullName: string;
  mobile: string;
  email: string;
  address: string;
  city: string;
  stateField: string;
  country: string;
}) {
  const [state, action] = useActionState<ProfileFormState, FormData>(updateProfile, {});

  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      <Field label="Full name" name="fullName" defaultValue={fullName} required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Mobile" name="mobile" defaultValue={mobile} placeholder="+91 98765 43210" />
        <Field label="Email address" name="email" defaultValue={email} type="email" disabled readOnly />
      </div>
      <TextareaField
        label="Permanent residential address"
        name="address"
        defaultValue={address}
        placeholder="House / flat, street, area"
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="City" name="city" defaultValue={city} placeholder="Mumbai" />
        <Field label="State" name="state" defaultValue={stateField} placeholder="Maharashtra" />
        <Field label="Country" name="country" defaultValue={country} placeholder="India" />
      </div>
      <SubmitButton size="sm" pendingLabel="Saving…">
        Save details
      </SubmitButton>
    </form>
  );
}

export function KycForm() {
  const [state, action] = useActionState<ProfileFormState, FormData>(submitKyc, {});

  if (state.success) return <Alert tone="success">{state.success}</Alert>;

  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Field
        label="Aadhaar card"
        name="aadhaar"
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.pdf"
        required
        hint="JPG, PNG, WEBP or PDF — up to 8 MB."
      />
      <Field
        label="PAN card"
        name="pan"
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.pdf"
        required
        hint="JPG, PNG, WEBP or PDF — up to 8 MB."
      />
      <SubmitButton size="sm" pendingLabel="Uploading…">
        Submit for review
      </SubmitButton>
    </form>
  );
}

export type BankingInitial = {
  accountNumber: string;
  ifsc: string;
  upiId: string;
  accountType: string;
};

export type CryptoWalletInitial = {
  usdtAddress: string;
  usdtNetwork: string;
};

export function BankingForm({
  initial,
  twoFactorEnabled = false,
}: {
  initial: BankingInitial;
  twoFactorEnabled?: boolean;
}) {
  const [state, action] = useActionState<FinancialDetailsFormState, FormData>(updateBanking, {});

  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      <Field
        label="Account number"
        name="accountNumber"
        defaultValue={initial.accountNumber}
        inputMode="numeric"
        placeholder="Enter your bank account number"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="IFSC code" name="ifsc" defaultValue={initial.ifsc} placeholder="SBIN0001234" />
        <SelectField label="Account type" name="accountType" defaultValue={initial.accountType || "SAVINGS"}>
          <option value="SAVINGS">Savings</option>
          <option value="CURRENT">Current</option>
        </SelectField>
      </div>
      <Field label="UPI ID" name="upiId" defaultValue={initial.upiId} placeholder="name@bank" />
      {twoFactorEnabled && (
        <Field
          label="Authenticator code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          placeholder="000000"
          hint="Required to authorize changes to your payout destination."
        />
      )}
      <SubmitButton size="sm" pendingLabel="Saving…">
        Save bank details
      </SubmitButton>
    </form>
  );
}

export function CryptoWalletForm({ initial }: { initial: CryptoWalletInitial }) {
  const [state, action] = useActionState<FinancialDetailsFormState, FormData>(updateCryptoWallet, {});

  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      <SelectField label="Network" name="usdtNetwork" defaultValue={initial.usdtNetwork || "TRC20"}>
        <option value="TRC20">USDT · TRC20 (Tron)</option>
        <option value="ERC20">USDT · ERC20 (Ethereum)</option>
        <option value="BEP20">USDT · BEP20 (BNB Chain)</option>
      </SelectField>
      <Field
        label="USDT wallet address"
        name="usdtAddress"
        defaultValue={initial.usdtAddress}
        placeholder="Paste your USDT address"
      />
      <SubmitButton size="sm" pendingLabel="Saving…">
        Save crypto wallet
      </SubmitButton>
    </form>
  );
}

export function TotpSection({ enabled }: { enabled: boolean }) {
  const [enrol, setEnrol] = useState<TotpEnrolState | null>(null);
  const [starting, startTransition] = useTransition();
  const [enableState, enableAction] = useActionState<ProfileFormState, FormData>(enableTotp, {});
  const [disableState, disableAction] = useActionState<ProfileFormState, FormData>(disableTotp, {});

  if (enabled && !disableState.success) {
    return (
      <div className="space-y-4">
        <Alert tone="success">Two-factor authentication is enabled on your account.</Alert>
        <form action={disableAction} className="space-y-3">
          {disableState.error && <Alert tone="error">{disableState.error}</Alert>}
          <Field
            label="Enter a current code to disable"
            name="code"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            required
            placeholder="000000"
          />
          <SubmitButton size="sm" variant="danger" pendingLabel="Disabling…">
            Disable 2FA
          </SubmitButton>
        </form>
      </div>
    );
  }

  if (enableState.success) {
    return <Alert tone="success">{enableState.success} It will be required at your next sign-in.</Alert>;
  }
  if (disableState.success) {
    return <Alert tone="success">{disableState.success}</Alert>;
  }

  if (!enrol?.qr) {
    return (
      <div className="space-y-3">
        {enrol?.error && <Alert tone="error">{enrol.error}</Alert>}
        <p className="text-sm leading-relaxed text-ink-dim">
          Add a 6-digit code from an authenticator app (Google Authenticator, 1Password, Authy) to
          every sign-in.
        </p>
        <Button
          size="sm"
          variant="ghost"
          disabled={starting}
          onClick={() => startTransition(async () => setEnrol(await startTotpEnrolment()))}
        >
          {starting ? "Preparing…" : "Set up 2FA"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-ink-dim">
        Scan this QR code with your authenticator app, then enter the 6-digit code it shows.
      </p>
      <div className="flex flex-col items-start gap-4 sm:flex-row">
        <Image
          src={enrol.qr}
          alt="TOTP enrolment QR code"
          width={140}
          height={140}
          unoptimized
          className="rounded-lg border border-gold-600/25 bg-white p-1.5"
        />
        <div className="min-w-0 text-xs text-ink-faint">
          <p>Can&apos;t scan? Enter this key manually:</p>
          <p className="mt-1.5 break-all font-mono text-ink-dim">{enrol.secret}</p>
          {enrol.secret && <CopyButton value={enrol.secret} className="mt-2" />}
        </div>
      </div>
      <form action={enableAction} className="space-y-3">
        {enableState.error && <Alert tone="error">{enableState.error}</Alert>}
        <Field
          label="6-digit code"
          name="code"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          required
          placeholder="000000"
        />
        <SubmitButton size="sm" pendingLabel="Verifying…">
          Verify and enable
        </SubmitButton>
      </form>
    </div>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState<ProfileFormState, FormData>(changePassword, {});

  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      <Field label="Current password" name="currentPassword" type="password" autoComplete="current-password" required />
      <Field
        label="New password"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        hint="At least 8 characters."
      />
      <SubmitButton size="sm" pendingLabel="Changing…">
        Change password
      </SubmitButton>
    </form>
  );
}
