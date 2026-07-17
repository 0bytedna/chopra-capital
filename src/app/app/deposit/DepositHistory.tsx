"use client";

import { useActionState, useEffect, useState } from "react";
import { Ban, Pencil, X } from "lucide-react";
import { cancelDeposit, editDeposit, type DepositFormState } from "./actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, SelectField } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { cn } from "@/lib/cn";

type Deposit = {
  id: string;
  method: "CRYPTO" | "BANK" | "CASH";
  status: "PENDING" | "NEEDS_CORRECTION" | "CONFIRMED" | "REJECTED" | "CANCELLED";
  amount: string;
  inrAmount: string | null;
  editAmount: string;
  editInrAmount: string | null;
  network: string | null;
  txHash: string | null;
  reference: string | null;
  adminNote: string | null;
  createdAt: string;
};

type Props = { deposits: Deposit[] };

const statusClass: Record<Deposit["status"], string> = {
  PENDING: "border-gold-500/40 bg-gold-600/10 text-gold-300",
  NEEDS_CORRECTION: "border-negative/40 bg-negative/10 text-negative",
  CONFIRMED: "border-positive/40 bg-positive/10 text-positive",
  REJECTED: "border-negative/40 bg-negative/10 text-negative",
  CANCELLED: "border-gold-600/20 bg-vault-900/70 text-ink-faint",
};

function methodLabel(deposit: Deposit): string {
  if (deposit.method === "CRYPTO") return `Crypto${deposit.network ? ` · ${deposit.network}` : ""}`;
  if (deposit.method === "BANK") return `Bank transfer${deposit.reference ? ` · UTR ${deposit.reference}` : ""}`;
  return "Cash";
}

function reportedAmount(deposit: Deposit): string {
  if (deposit.method === "CRYPTO") return `${deposit.amount} USDT`;
  return deposit.inrAmount ? `₹ ${deposit.inrAmount}` : `${deposit.amount} USDT`;
}

function statusLabel(status: Deposit["status"]): string {
  return status === "NEEDS_CORRECTION" ? "action needed" : status.toLowerCase();
}

function DepositEditForm({ deposit, onCancel }: { deposit: Deposit; onCancel: () => void }) {
  const [state, action] = useActionState<DepositFormState, FormData>(editDeposit, {});
  const initialAmount = deposit.method === "CRYPTO" ? deposit.editAmount : deposit.editInrAmount ?? "";
  const correctionRequired = deposit.status === "NEEDS_CORRECTION";

  useEffect(() => {
    if (state.success) onCancel();
  }, [state.success, onCancel]);

  return (
    <form action={action} className="mt-4 space-y-4 border-t border-gold-600/15 pt-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      {correctionRequired && (
        <Alert tone="warning">
          {deposit.adminNote ?? "We could not verify your payment details. Correct the UTR or transaction hash and resubmit."}
        </Alert>
      )}
      <input type="hidden" name="id" value={deposit.id} />
      <input type="hidden" name="method" value={deposit.method} />

      <Field
        id={`edit-${deposit.id}-amount`}
        label={deposit.method === "CRYPTO" ? "Amount sent (USDT)" : "Amount sent (INR)"}
        name="amount"
        type="number"
        step="0.01"
        min={deposit.method === "CRYPTO" ? "2000" : "0.01"}
        defaultValue={initialAmount}
        readOnly={correctionRequired}
        hint={correctionRequired ? "The deposited amount is locked while payment details are corrected." : undefined}
        required
      />

      {deposit.method === "CRYPTO" && (
        <>
          {correctionRequired && <input type="hidden" name="network" value={deposit.network ?? "TRC20"} />}
          <SelectField
            id={`edit-${deposit.id}-network`}
            label="USDT network"
            name="network"
            defaultValue={deposit.network ?? "TRC20"}
            disabled={correctionRequired}
            required
          >
            <option value="TRC20">TRC20</option>
            <option value="ERC20">ERC20</option>
            <option value="BEP20">BEP20</option>
          </SelectField>
          <Field
            id={`edit-${deposit.id}-tx-hash`}
            label="Transaction hash (optional)"
            name="txHash"
            defaultValue={deposit.txHash ?? ""}
            placeholder="Paste the tx hash from your exchange"
            required={correctionRequired}
          />
        </>
      )}

      {deposit.method === "BANK" && (
        <Field
          id={`edit-${deposit.id}-reference`}
          label="UTR number"
          name="reference"
          defaultValue={deposit.reference ?? ""}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          placeholder="Enter the UTR from your bank"
          required
          onChange={(event) => {
            event.currentTarget.value = event.currentTarget.value.replace(/\D/g, "");
          }}
        />
      )}

      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingLabel={correctionRequired ? "Submitting..." : "Saving..."} size="sm">
          {correctionRequired ? "Submit corrected details" : "Save changes"}
        </SubmitButton>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          <X className="size-3.5" aria-hidden />
          Cancel
        </Button>
      </div>
    </form>
  );
}

function CancelDepositForm({ deposit, onDismiss }: { deposit: Deposit; onDismiss: () => void }) {
  const [state, action] = useActionState<DepositFormState, FormData>(cancelDeposit, {});

  useEffect(() => {
    if (state.success) onDismiss();
  }, [state.success, onDismiss]);

  return (
    <form action={action} className="mt-4 space-y-3 border-t border-gold-600/15 pt-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="id" value={deposit.id} />
      <p className="text-sm text-ink-dim">Cancel this pending deposit request? This cannot be undone.</p>
      <div className="flex flex-wrap gap-2">
        <SubmitButton variant="danger" pendingLabel="Cancelling..." size="sm">
          Cancel request
        </SubmitButton>
        <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
          Keep request
        </Button>
      </div>
    </form>
  );
}

export function DepositHistory({ deposits }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  if (deposits.length === 0) {
    return (
      <p className="mt-4 rounded-xl border border-dashed border-gold-600/20 px-4 py-8 text-center text-sm text-ink-faint">
        No deposits yet.
      </p>
    );
  }

  return (
    <ul className="mt-4 space-y-2.5">
      {deposits.map((deposit) => {
        const canEdit = deposit.status === "PENDING" || deposit.status === "NEEDS_CORRECTION";
        const canCancel = deposit.status === "PENDING";
        const editing = canEdit && editingId === deposit.id;
        const cancelling = canEdit && cancellingId === deposit.id;

        return (
          <li key={deposit.id} className="glass-card rounded-xl px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-sm text-ink">{reportedAmount(deposit)}</p>
                <p className="mt-0.5 text-xs text-ink-faint">
                  {methodLabel(deposit)} · {new Date(deposit.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  {deposit.status === "CONFIRMED" && deposit.method !== "CRYPTO" ? ` · ${deposit.amount} USDT credited` : ""}
                  {deposit.adminNote ? ` · ${deposit.adminNote}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-medium", statusClass[deposit.status])}>
                  {statusLabel(deposit.status)}
                </span>
                {canEdit && !editing && !cancelling && (
                  <>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(deposit.id)}>
                      <Pencil className="size-3.5" aria-hidden />
                      {deposit.status === "NEEDS_CORRECTION" ? "Correct details" : "Edit"}
                    </Button>
                    {canCancel && (
                      <Button type="button" variant="danger" size="sm" onClick={() => setCancellingId(deposit.id)}>
                        <Ban className="size-3.5" aria-hidden />
                        Cancel request
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
            {editing && <DepositEditForm key={deposit.id} deposit={deposit} onCancel={() => setEditingId(null)} />}
            {cancelling && <CancelDepositForm deposit={deposit} onDismiss={() => setCancellingId(null)} />}
          </li>
        );
      })}
    </ul>
  );
}
