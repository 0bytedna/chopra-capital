"use client";

// Three-step deposit rail: pick a network → send to the company address →
// report the transfer. Creates a PENDING deposit for admin confirmation.

import { useActionState, useState } from "react";
import { submitDeposit, type DepositFormState } from "./actions";
import { CopyButton } from "@/components/ui/CopyButton";
import { Field } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { cn } from "@/lib/cn";

type Network = "TRC20" | "ERC20" | "BEP20";

type Props = {
  addresses: Record<Network, string>;
  minDeposit: number;
  kycApproved: boolean;
};

const networkMeta: Record<Network, { chain: string; note: string }> = {
  TRC20: { chain: "Tron", note: "Lowest fees — usually the best choice" },
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

export function DepositForm({ addresses, minDeposit, kycApproved }: Props) {
  const [network, setNetwork] = useState<Network>("TRC20");
  const [state, action] = useActionState<DepositFormState, FormData>(submitDeposit, {});
  const address = addresses[network];

  return (
    <ol className="space-y-9">
      <Step n={1} title="Choose a network">
        <div className="grid gap-2.5 sm:grid-cols-3" role="radiogroup" aria-label="USDT network">
          {(Object.keys(networkMeta) as Network[]).map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={network === n}
              onClick={() => setNetwork(n)}
              className={cn(
                "rounded-xl border px-4 py-3.5 text-left transition-colors",
                network === n
                  ? "border-gold-500/60 bg-gold-600/10"
                  : "border-gold-600/15 bg-vault-900/50 hover:border-gold-600/35",
              )}
            >
              <span className="block font-mono text-sm text-ink">USDT · {n}</span>
              <span className="mt-0.5 block text-xs text-ink-faint">
                {networkMeta[n].chain} — {networkMeta[n].note}
              </span>
            </button>
          ))}
        </div>
      </Step>

      <Step n={2} title="Send USDT to the company address">
        <div className="rounded-xl border border-gold-600/20 bg-vault-950/60 p-4">
          <p className="text-[10px] uppercase tracking-[0.16em] text-ink-faint">
            {network} deposit address
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="break-all font-mono text-sm text-ink">{address || "Address not configured yet — contact support."}</p>
            {address && <CopyButton value={address} label="Copy address" className="shrink-0" />}
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink-faint">
          Send only USDT on the <strong className="text-ink-dim">{network}</strong> network to this
          address. Transfers on the wrong network can be lost permanently. Minimum deposit: $
          {minDeposit.toLocaleString()} USDT.
        </p>
      </Step>

      <Step n={3} title="Tell us what you sent">
        {state.success ? (
          <Alert tone="success">{state.success}</Alert>
        ) : (
          <form action={action} className="space-y-4">
            {state.error && <Alert tone="error">{state.error}</Alert>}
            {!kycApproved && (
              <Alert tone="warning">
                Identity verification is required before depositing — complete KYC from your
                profile page first.
              </Alert>
            )}
            <input type="hidden" name="network" value={network} />
            <Field
              label="Amount sent (USDT)"
              name="amount"
              type="number"
              step="0.01"
              min={minDeposit}
              required
              placeholder={`${minDeposit.toLocaleString()} minimum`}
            />
            <Field
              label="Transaction hash (optional)"
              name="txHash"
              placeholder="Paste the tx hash from your exchange"
              hint="Helps our team find and confirm your transfer faster."
            />
            <SubmitButton pendingLabel="Submitting…" disabled={!kycApproved}>
              Submit deposit for confirmation
            </SubmitButton>
          </form>
        )}
      </Step>
    </ol>
  );
}
