"use client";

import { useActionState, useEffect, useState } from "react";
import { Ban, Pencil, X } from "lucide-react";
import { cancelWithdrawal, editWithdrawal, type WithdrawFormState } from "./actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, SelectField } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { cn } from "@/lib/cn";

type Withdrawal = {
  id: string;
  method: "CRYPTO" | "BANK" | "CASH";
  status: "REQUESTED" | "APPROVED" | "PROCESSED" | "REJECTED" | "CANCELLED";
  amount: string;
  editAmount: string;
  network: string;
  address: string;
  paidAmount: string | null;
  weekKey: string;
  adminNote: string | null;
  createdAt: string;
};

const statusClass: Record<Withdrawal["status"], string> = {
  REQUESTED: "border-gold-500/40 bg-gold-600/10 text-gold-300",
  APPROVED: "border-gold-500/40 bg-gold-600/10 text-gold-300",
  PROCESSED: "border-positive/40 bg-positive/10 text-positive",
  REJECTED: "border-negative/40 bg-negative/10 text-negative",
  CANCELLED: "border-gold-600/20 bg-vault-900/70 text-ink-faint",
};

function methodLabel(withdrawal: Withdrawal): string {
  if (withdrawal.method === "CRYPTO") return `Crypto · ${withdrawal.network}`;
  if (withdrawal.method === "BANK") return "Bank transfer";
  return "Cash";
}

function statusLabel(status: Withdrawal["status"]): string {
  return status === "REQUESTED" ? "pending" : status.toLowerCase();
}

function WithdrawalEditForm({ withdrawal, onCancel }: { withdrawal: Withdrawal; onCancel: () => void }) {
  const [state, action] = useActionState<WithdrawFormState, FormData>(editWithdrawal, {});

  useEffect(() => {
    if (state.success) onCancel();
  }, [state.success, onCancel]);

  return (
    <form action={action} className="mt-4 space-y-4 border-t border-gold-600/15 pt-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="id" value={withdrawal.id} />
      <Field
        id={`edit-withdraw-${withdrawal.id}-amount`}
        label="Amount (USDT)"
        name="amount"
        type="number"
        step="0.01"
        min="0.01"
        defaultValue={withdrawal.editAmount}
        required
      />
      <SelectField id={`edit-withdraw-${withdrawal.id}-method`} label="Withdrawal method" name="method" defaultValue={withdrawal.method} required>
        <option value="CRYPTO">Crypto (USDT)</option>
        <option value="BANK">Bank transfer</option>
        <option value="CASH">Cash</option>
      </SelectField>
      <p className="text-xs leading-relaxed text-ink-faint">Changing the method uses the current payout details saved in Profile &amp; Security.</p>
      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingLabel="Saving..." size="sm">Save changes</SubmitButton>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          <X className="size-3.5" aria-hidden />
          Cancel
        </Button>
      </div>
    </form>
  );
}

function CancelWithdrawalForm({ withdrawal, onDismiss }: { withdrawal: Withdrawal; onDismiss: () => void }) {
  const [state, action] = useActionState<WithdrawFormState, FormData>(cancelWithdrawal, {});

  useEffect(() => {
    if (state.success) onDismiss();
  }, [state.success, onDismiss]);

  return (
    <form action={action} className="mt-4 space-y-3 border-t border-gold-600/15 pt-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="id" value={withdrawal.id} />
      <p className="text-sm text-ink-dim">Cancel this pending withdrawal request? This cannot be undone.</p>
      <div className="flex flex-wrap gap-2">
        <SubmitButton variant="danger" pendingLabel="Cancelling..." size="sm">Cancel request</SubmitButton>
        <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>Keep request</Button>
      </div>
    </form>
  );
}

export function WithdrawalHistory({ withdrawals }: { withdrawals: Withdrawal[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  if (withdrawals.length === 0) {
    return (
      <p className="mt-4 rounded-xl border border-dashed border-gold-600/20 px-4 py-8 text-center text-sm text-ink-faint">
        No withdrawal requests yet.
      </p>
    );
  }

  return (
    <ul className="mt-4 space-y-2.5">
      {withdrawals.map((withdrawal) => {
        const canEdit = withdrawal.status === "REQUESTED";
        const editing = canEdit && editingId === withdrawal.id;
        const cancelling = canEdit && cancellingId === withdrawal.id;

        return (
          <li key={withdrawal.id} className="glass-card rounded-xl px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-sm text-ink">
                  {withdrawal.amount} USDT
                  {withdrawal.paidAmount !== null && <span className="text-ink-faint"> · paid {withdrawal.paidAmount} USDT</span>}
                </p>
                <p className="mt-0.5 truncate text-xs text-ink-faint">
                  {methodLabel(withdrawal)} · {new Date(withdrawal.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })} · week {withdrawal.weekKey}
                  {withdrawal.adminNote ? ` · ${withdrawal.adminNote}` : ""}
                </p>
                <p className="mt-0.5 truncate font-mono text-[11px] text-ink-faint">to: {withdrawal.address}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-medium", statusClass[withdrawal.status])}>
                  {statusLabel(withdrawal.status)}
                </span>
                {canEdit && !editing && !cancelling && (
                  <>
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setEditingId(withdrawal.id); setCancellingId(null); }}>
                      <Pencil className="size-3.5" aria-hidden />
                      Edit
                    </Button>
                    <Button type="button" variant="danger" size="sm" onClick={() => { setCancellingId(withdrawal.id); setEditingId(null); }}>
                      <Ban className="size-3.5" aria-hidden />
                      Cancel request
                    </Button>
                  </>
                )}
              </div>
            </div>
            {editing && <WithdrawalEditForm key={withdrawal.id} withdrawal={withdrawal} onCancel={() => setEditingId(null)} />}
            {cancelling && <CancelWithdrawalForm withdrawal={withdrawal} onDismiss={() => setCancellingId(null)} />}
          </li>
        );
      })}
    </ul>
  );
}
