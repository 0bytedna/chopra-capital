"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { submitDeposit, type DepositFormState } from "./actions";
import { CopyButton } from "@/components/ui/CopyButton";
import { Field } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { cn } from "@/lib/cn";

type Network = "TRC20" | "ERC20" | "BEP20";
type Method = "CRYPTO" | "BANK" | "CASH";

type Props = {
  addresses: Record<Network, string>;
  qrCodes: Record<Network, string>;
  minDeposit: number;
  kycApproved: boolean;
  bankEnabled: boolean;
  cashEnabled: boolean;
  bank: { accountNumber: string; ifsc: string; holder: string; upi: string };
  cashInstruction: string;
};

const networkMeta: Record<Network, { chain: string; note: string }> = {
  TRC20: { chain: "Tron", note: "Lowest fees - usually the best choice" },
  ERC20: { chain: "Ethereum", note: "Widely supported, higher gas fees" },
  BEP20: { chain: "BNB Smart Chain", note: "Low fees, broad exchange support" },
};

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="relative pl-12">
      <span
        aria-hidden
        className="absolute left-0 top-0 flex size-8 items-center justify-center rounded-full border border-gold-500/40 bg-gold-600/10 font-serif text-sm text-gold-400"
      >
        {n}
      </span>
      <h2 className="pt-1 font-serif text-lg text-ink">{title}</h2>
      <div className="mt-3">{children}</div>
    </li>
  );
}

function BankRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-xs uppercase tracking-[0.14em] text-ink-faint">{label}</span>
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate font-mono text-sm text-ink">{value}</span>
        {value && <CopyButton value={value} label={`Copy ${label}`} className="shrink-0" />}
      </span>
    </div>
  );
}

export function DepositForm({
  addresses,
  qrCodes,
  minDeposit,
  kycApproved,
  bankEnabled,
  cashEnabled,
  bank,
  cashInstruction,
}: Props) {
  const [method, setMethod] = useState<Method>("CRYPTO");
  const [network, setNetwork] = useState<Network>("TRC20");
  const [formVersion, setFormVersion] = useState(0);
  const methods: { id: Method; label: string; note: string }[] = [
    { id: "CRYPTO", label: "Crypto (USDT)", note: "TRC20 / ERC20 / BEP20" },
    ...(bankEnabled ? [{ id: "BANK" as const, label: "Bank transfer / UPI", note: "Enabled on your account" }] : []),
    ...(cashEnabled ? [{ id: "CASH" as const, label: "Cash", note: "Enabled on your account" }] : []),
  ];
  const activeMethod = methods.some((option) => option.id === method) ? method : "CRYPTO";
  const address = addresses[network];

  return (
    <ol className="space-y-9">
      <Step n={1} title="Choose a deposit method">
        <div className="grid gap-2.5 sm:grid-cols-3" role="radiogroup" aria-label="Deposit method">
          {methods.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={activeMethod === option.id}
              onClick={() => setMethod(option.id)}
              className={cn(
                "rounded-xl border px-4 py-3.5 text-left transition-colors",
                activeMethod === option.id
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

      {activeMethod === "CRYPTO" && (
        <Step n={2} title="Send USDT to the company address">
          <div className="grid gap-2.5 sm:grid-cols-3" role="radiogroup" aria-label="USDT network">
            {(Object.keys(networkMeta) as Network[]).map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={network === option}
                onClick={() => setNetwork(option)}
                className={cn(
                  "rounded-xl border px-4 py-3.5 text-left transition-colors",
                  network === option
                    ? "border-gold-500/60 bg-gold-600/10"
                    : "border-gold-600/15 bg-vault-900/50 hover:border-gold-600/35",
                )}
              >
                <span className="block font-mono text-sm text-ink">USDT / {option}</span>
                <span className="mt-0.5 block text-xs text-ink-faint">
                  {networkMeta[option].chain} - {networkMeta[option].note}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-gold-600/20 bg-vault-950/60 p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-ink-faint">{network} deposit address</p>
            <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                {address && qrCodes[network] && (
                  <Image
                    src={qrCodes[network]}
                    alt={`QR code for the ${network} deposit address`}
                    width={112}
                    height={112}
                    unoptimized
                    className="size-28 shrink-0 rounded-lg bg-white p-1.5"
                  />
                )}
                <p className="break-all font-mono text-sm text-ink">{address || "Address not configured yet - contact support."}</p>
              </div>
              {address && <CopyButton value={address} label="Copy address" className="shrink-0" />}
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ink-faint">
            Send only USDT on the <strong className="text-ink-dim">{network}</strong> network to this address. Transfers on the wrong network can be lost permanently. Minimum deposit: ${minDeposit.toLocaleString()} USDT.
          </p>
        </Step>
      )}

      {activeMethod === "BANK" && (
        <Step n={2} title="Send via bank transfer / UPI">
          <div className="rounded-xl border border-gold-600/20 bg-vault-950/60 p-4">
            {bank.accountNumber || bank.upi ? (
              <div className="divide-y divide-gold-600/10">
                {bank.accountNumber && <BankRow label="Account no." value={bank.accountNumber} />}
                {bank.ifsc && <BankRow label="IFSC" value={bank.ifsc} />}
                {bank.holder && <BankRow label="Holder" value={bank.holder} />}
                {bank.upi && <BankRow label="UPI" value={bank.upi} />}
              </div>
            ) : (
              <p className="text-sm text-ink-faint">Bank details are not configured yet - contact support for the account to transfer to.</p>
            )}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ink-faint">
            Enter the INR amount you transfer and the UTR number below. Our team will match the payment and confirm the USDT amount credited to your account.
          </p>
        </Step>
      )}

      {activeMethod === "CASH" && (
        <Step n={2} title="Deposit cash at our office">
          <div className="rounded-xl border border-gold-600/20 bg-vault-950/60 p-4">
            <p className="text-sm leading-relaxed text-ink-dim">{cashInstruction}</p>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ink-faint">
            Enter the INR cash amount below to create a request. Our team will confirm the USDT amount credited to your account after receiving the cash.
          </p>
        </Step>
      )}

      <DepositDetailsForm
        key={`${activeMethod}-${formVersion}`}
        method={activeMethod}
        network={network}
        minDeposit={minDeposit}
        kycApproved={kycApproved}
        onDismiss={() => setFormVersion((version) => version + 1)}
      />
    </ol>
  );
}

function DepositSubmittedDialog({ message, onConfirm }: { message: string; onConfirm: () => void }) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmButtonRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-vault-950/80 px-5 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="deposit-submitted-title"
        className="w-full max-w-md rounded-2xl border border-gold-500/30 bg-vault-900 p-6 shadow-2xl shadow-vault-950/60"
      >
        <p className="eyebrow">Deposit request received</p>
        <h2 id="deposit-submitted-title" className="mt-2 font-serif text-2xl text-ink">
          Deposit submitted
        </h2>
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

function DepositDetailsForm({
  method,
  network,
  minDeposit,
  kycApproved,
  onDismiss,
}: {
  method: Method;
  network: Network;
  minDeposit: number;
  kycApproved: boolean;
  onDismiss: () => void;
}) {
  const [state, action] = useActionState<DepositFormState, FormData>(submitDeposit, {});

  return (
    <Step n={3} title="Tell us what you sent">
      {state.success ? (
        <DepositSubmittedDialog message={state.success} onConfirm={onDismiss} />
      ) : (
        <form action={action} className="space-y-4">
          {state.error && <Alert tone="error">{state.error}</Alert>}
          {!kycApproved && (
            <Alert tone="warning">
              Identity verification is required before depositing - complete KYC from your profile page first.
            </Alert>
          )}
          <input type="hidden" name="method" value={method} />
          {method === "CRYPTO" && <input type="hidden" name="network" value={network} />}
          <Field
            label={method === "CRYPTO" ? "Amount sent (USDT)" : "Amount sent (INR)"}
            name="amount"
            type="number"
            step="0.01"
            min={method === "CRYPTO" ? minDeposit : "0.01"}
            required
            placeholder={method === "CRYPTO" ? `${minDeposit.toLocaleString()} minimum` : "Enter amount in INR"}
          />
          {method === "CRYPTO" ? (
            <Field
              label="Transaction hash (optional)"
              name="txHash"
              placeholder="Paste the tx hash from your exchange"
              hint="Helps our team find and confirm your transfer faster."
            />
          ) : method === "BANK" ? (
            <Field
              label="UTR number"
              name="reference"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              placeholder="Enter the UTR from your bank"
              hint="Required so our team can match your transfer."
              required
              onChange={(event) => {
                event.currentTarget.value = event.currentTarget.value.replace(/\D/g, "");
              }}
            />
          ) : null}
          <SubmitButton pendingLabel="Submitting..." disabled={!kycApproved}>
            Submit deposit for confirmation
          </SubmitButton>
        </form>
      )}
    </Step>
  );
}
