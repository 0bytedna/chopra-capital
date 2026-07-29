"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { submitDeposit, type DepositFormState } from "./actions";
import { CopyButton } from "@/components/ui/CopyButton";
import { Field, SelectField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { FinancialRestriction } from "@/lib/financialEligibility";

type Network = "TRC20" | "ERC20" | "BEP20";
type Method = "CRYPTO" | "BANK" | "CASH";

type Props = {
  addresses: Record<Network, string>;
  qrCodes: Record<Network, string>;
  restriction: FinancialRestriction | null;
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
    <li>
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
    </li>
  );
}

function BankRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_2.25rem] items-center gap-3 py-2 sm:grid-cols-[7rem_minmax(0,1fr)_2.25rem]">
      <span className="text-xs uppercase tracking-[0.14em] text-ink-faint">{label}</span>
      <span className="min-w-0 break-all font-mono text-sm text-ink max-sm:col-span-2 max-sm:col-start-1 max-sm:row-start-2">{value}</span>
      {value && <CopyButton value={value} label={`Copy ${label}`} />}
    </div>
  );
}

export function DepositForm({
  addresses,
  qrCodes,
  restriction,
  bankEnabled,
  cashEnabled,
  bank,
  cashInstruction,
}: Props) {
  const [method, setMethod] = useState<Method>("CRYPTO");
  const [network, setNetwork] = useState<Network>("TRC20");
  const [formVersion, setFormVersion] = useState(0);
  const methods: { id: Method; label: string; note: string }[] = [
    { id: "CRYPTO", label: "Crypto (USDT)", note: "Processed by end of day" },
    ...(bankEnabled ? [{ id: "BANK" as const, label: "Bank transfer / UPI", note: "Processed in 4-7 days" }] : []),
    ...(cashEnabled ? [{ id: "CASH" as const, label: "Cash", note: "Processed in 7-15 days" }] : []),
  ];
  const activeMethod = methods.some((option) => option.id === method) ? method : "CRYPTO";
  const activeMethodMeta = methods.find((option) => option.id === activeMethod) ?? methods[0];
  const address = addresses[network];

  return (
    <ol className="space-y-6">
      <Step n={1} title="Choose a deposit method">
        <SelectField
          label="Deposit method"
          name="depositMethodPicker"
          value={activeMethod}
          onChange={(event) => setMethod(event.target.value as Method)}
          hint={activeMethodMeta?.note}
        >
          {methods.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </SelectField>
      </Step>

      {activeMethod === "CRYPTO" && (
        <Step n={2} title="Send USDT to the company address">
          <SelectField
            label="USDT network"
            name="depositNetworkPicker"
            value={network}
            onChange={(event) => setNetwork(event.target.value as Network)}
            hint={`${networkMeta[network].chain} - ${networkMeta[network].note}`}
          >
            {(Object.keys(networkMeta) as Network[]).map((option) => (
              <option key={option} value={option}>USDT / {option} ({networkMeta[option].chain})</option>
            ))}
          </SelectField>
          <div className="mt-4 rounded-xl border border-gold-600/20 bg-vault-950/60 p-3.5 sm:p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-ink-faint">{network} deposit address</p>
            <div className="mt-3 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
                {address && qrCodes[network] && (
                  <Image
                    src={qrCodes[network]}
                    alt={`QR code for the ${network} deposit address`}
                    width={112}
                    height={112}
                    unoptimized
                    className="size-28 shrink-0 self-center rounded-lg bg-white p-1.5 sm:self-auto"
                  />
                )}
              <div className="flex w-full min-w-0 items-start gap-2">
                <p className="min-w-0 flex-1 break-all font-mono text-sm text-ink">{address || "Address not configured yet - contact support."}</p>
                {address && <CopyButton value={address} label="Copy address" />}
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ink-faint">
            Send only USDT on the <strong className="text-ink-dim">{network}</strong> network to this address. Transfers on the wrong network can be lost permanently.
          </p>
        </Step>
      )}

      {activeMethod === "BANK" && (
        <Step n={2} title="Send via bank transfer / UPI">
          <div className="rounded-xl border border-gold-600/20 bg-vault-950/60 p-3.5 sm:p-4">
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
            Transfer to the account above, then enter the INR amount and UTR below for verification.
          </p>
        </Step>
      )}

      {activeMethod === "CASH" && (
        <Step n={2} title="Deposit cash at our office">
          <div className="rounded-xl border border-gold-600/20 bg-vault-950/60 p-3.5 sm:p-4">
            <p className="text-sm leading-relaxed text-ink-dim">{cashInstruction}</p>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ink-faint">
            Enter the INR amount below to create a cash deposit request.
          </p>
        </Step>
      )}

      <DepositDetailsForm
        key={`${activeMethod}-${formVersion}`}
        method={activeMethod}
        network={network}
        restriction={restriction}
        onDismiss={() => setFormVersion((version) => version + 1)}
      />
    </ol>
  );
}

function DepositDialog({
  eyebrow,
  title,
  message,
  onConfirm,
}: {
  eyebrow: string;
  title: string;
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
        aria-labelledby="deposit-dialog-title"
        className="w-full max-w-md rounded-2xl border border-gold-500/30 bg-vault-900 p-5 shadow-2xl shadow-vault-950/60 sm:p-6"
      >
        <p className="eyebrow">{eyebrow}</p>
        <h2 id="deposit-dialog-title" className="mt-2 font-serif text-xl text-ink sm:text-2xl">
          {title}
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
  restriction,
  onDismiss,
}: {
  method: Method;
  network: Network;
  restriction: FinancialRestriction | null;
  onDismiss: () => void;
}) {
  const [state, action] = useActionState<DepositFormState, FormData>(submitDeposit, {});

  return (
    <Step n={3} title="Tell us what you sent">
      {state.restriction ? (
        <DepositDialog
          eyebrow="Deposit unavailable"
          title={state.restriction.title}
          message={state.restriction.message}
          onConfirm={onDismiss}
        />
      ) : state.success ? (
        <DepositDialog
          eyebrow="Deposit request received"
          title="Deposit submitted"
          message={state.success}
          onConfirm={onDismiss}
        />
      ) : (
        <form action={action} className="space-y-4">
          {state.error && <Alert tone="error">{state.error}</Alert>}
          {restriction && <Alert tone="warning">{restriction.message}</Alert>}
          <input type="hidden" name="method" value={method} />
          {method === "CRYPTO" && <input type="hidden" name="network" value={network} />}
          <Field
            label={method === "CRYPTO" ? "Amount sent (USDT)" : "Amount sent (INR)"}
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder={method === "CRYPTO" ? "Enter amount in USDT" : "Enter amount in INR"}
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
          <SubmitButton pendingLabel="Submitting..." className="w-full sm:w-auto">
            Submit deposit for confirmation
          </SubmitButton>
        </form>
      )}
    </Step>
  );
}
