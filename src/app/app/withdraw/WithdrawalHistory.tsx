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
  status:
    | "REQUESTED"
    | "APPROVED"
    | "BROKER_RECEIVED"
    | "INR_READY"
    | "PROCESSED"
    | "REJECTED"
    | "CANCELLED";
  amount: string;
  editAmount: string;
  requestedInrAmount: string | null;
  requestExchangeRate: string | null;
  network: string;
  address: string;
  paidAmount: string | null;
  paidInrAmount: string | null;
  brokerReceivedUsdt: string | null;
  convertedInrAmount: string | null;
  weekKey: string;
  adminNote: string | null;
  createdAt: string;
};

const statusClass: Record<Withdrawal["status"], string> = {
  REQUESTED: "border-gold-500/40 bg-gold-600/10 text-gold-300",
  APPROVED: "border-gold-500/40 bg-gold-600/10 text-gold-300",
  BROKER_RECEIVED: "border-sky-400/40 bg-sky-400/10 text-sky-300",
  INR_READY: "border-sky-400/40 bg-sky-400/10 text-sky-300",
  PROCESSED: "border-positive/40 bg-positive/10 text-positive",
  REJECTED: "border-negative/40 bg-negative/10 text-negative",
  CANCELLED: "border-gold-600/20 bg-vault-900/70 text-ink-faint",
};

function methodLabel(withdrawal: Withdrawal): string {
  if (withdrawal.method === "CRYPTO") return "Crypto · " + withdrawal.network;
  if (withdrawal.method === "BANK") return "Bank transfer";
  return "Cash";
}

function statusLabel(withdrawal: Withdrawal): string {
  if (withdrawal.status === "REQUESTED") return "pending approval";
  if (withdrawal.status === "APPROVED") return "broker withdrawal pending";
  if (withdrawal.status === "BROKER_RECEIVED") {
    return withdrawal.method === "CRYPTO" ? "ready for wallet payout" : "awaiting INR conversion";
  }
  if (withdrawal.status === "INR_READY") return "INR ready for payout";
  if (withdrawal.status === "PROCESSED") return "paid";
  return withdrawal.status.toLowerCase();
}

function WithdrawalEditForm({
  withdrawal,
  twoFactorEnabled,
  onCancel,
}: {
  withdrawal: Withdrawal;
  twoFactorEnabled: boolean;
  onCancel: () => void;
}) {
  const [state, action] = useActionState<WithdrawFormState, FormData>(editWithdrawal, {});
  const [selectedMethod, setSelectedMethod] = useState(withdrawal.method);
  const [amountInput, setAmountInput] = useState(withdrawal.editAmount);
  const crypto = selectedMethod === "CRYPTO";
  const referenceRate = Number(withdrawal.requestExchangeRate ?? 0);
  const amountNumber = Number(amountInput);
  const estimatedInr =
    !crypto && Number.isFinite(amountNumber) && amountNumber > 0 && referenceRate > 0
      ? amountNumber * referenceRate
      : 0;

  useEffect(() => {
    if (state.success) onCancel();
  }, [state.success, onCancel]);

  return (
    <form action={action} className="mt-4 space-y-4 border-t border-gold-600/15 pt-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="id" value={withdrawal.id} />
      <Field
        id={"edit-withdraw-" + withdrawal.id + "-amount"}
        label="Amount (USD)"
        name="amount"
        type="number"
        step="0.01"
        min="0.01"
        value={amountInput}
        onChange={(event) => setAmountInput(event.target.value)}
        required
      />
      {!crypto && (
        <div className="rounded-lg border border-gold-600/20 bg-gold-600/8 px-3.5 py-3">
          <p className="text-xs uppercase tracking-[0.14em] text-ink-faint">
            Estimated INR payout
          </p>
          <p className="mt-1 font-mono text-sm text-gold-300">
            {estimatedInr > 0
              ? estimatedInr.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) + " INR"
              : "—"}
          </p>
          <p className="mt-1 text-xs text-ink-faint">
            Reference rate{" "}
            {referenceRate.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            INR/USD. The final INR is recorded after conversion.
          </p>
        </div>
      )}
      <SelectField
        id={"edit-withdraw-" + withdrawal.id + "-method"}
        label="Withdrawal method"
        name="method"
        value={selectedMethod}
        onChange={(event) => setSelectedMethod(event.target.value as Withdrawal["method"])}
        required
      >
        <option value="CRYPTO">Crypto (USDT wallet payout)</option>
        <option value="BANK">Bank transfer (INR payout)</option>
        <option value="CASH">Cash (INR payout)</option>
      </SelectField>
      <p className="text-xs leading-relaxed text-ink-faint">
        Changing the method uses the current payout details saved in Profile &amp; Security.
      </p>
      {twoFactorEnabled && (
        <Field
          id={"edit-withdraw-" + withdrawal.id + "-code"}
          label="Authenticator code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          placeholder="000000"
          hint="Required to authorize changes to this withdrawal request."
        />
      )}
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

function CancelWithdrawalForm({
  withdrawal,
  onDismiss,
}: {
  withdrawal: Withdrawal;
  onDismiss: () => void;
}) {
  const [state, action] = useActionState<WithdrawFormState, FormData>(cancelWithdrawal, {});

  useEffect(() => {
    if (state.success) onDismiss();
  }, [state.success, onDismiss]);

  return (
    <form action={action} className="mt-4 space-y-3 border-t border-gold-600/15 pt-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="id" value={withdrawal.id} />
      <p className="text-sm text-ink-dim">
        Cancel this pending withdrawal request? This cannot be undone.
      </p>
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

export function WithdrawalHistory({ withdrawals, twoFactorEnabled = false }: { withdrawals: Withdrawal[]; twoFactorEnabled?: boolean }) {
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
        const crypto = withdrawal.method === "CRYPTO";

        return (
          <li key={withdrawal.id} className="glass-card rounded-xl px-4 py-3.5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="font-mono text-sm text-ink">
                  {withdrawal.amount} USD requested
                </p>
                {!crypto && (
                  <p className="mt-0.5 text-xs text-ink-faint">
                    Estimated INR payout at request: {withdrawal.requestedInrAmount ?? "—"} INR
                    {withdrawal.requestExchangeRate
                      ? " · reference rate " + withdrawal.requestExchangeRate + " INR/USD"
                      : ""}
                  </p>
                )}
                {withdrawal.brokerReceivedUsdt && (
                  <p className="mt-1 text-xs text-ink-dim">
                    Received from broker: {withdrawal.brokerReceivedUsdt} USDT
                  </p>
                )}
                {withdrawal.convertedInrAmount && (
                  <p className="mt-1 text-xs text-ink-dim">
                    Converted for payout: {withdrawal.convertedInrAmount} INR
                  </p>
                )}
                {withdrawal.paidAmount && (
                  <p className="mt-1 text-xs text-positive">
                    Sent to wallet: {withdrawal.paidAmount} USDT
                  </p>
                )}
                {withdrawal.paidInrAmount && (
                  <p className="mt-1 text-xs text-positive">
                    Paid: {withdrawal.paidInrAmount} INR
                  </p>
                )}
                <p className="mt-1 text-xs text-ink-faint">
                  {methodLabel(withdrawal)} · {new Date(withdrawal.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })} · week {withdrawal.weekKey}
                  {withdrawal.adminNote ? " · " + withdrawal.adminNote : ""}
                </p>
                <p className="mt-0.5 break-all font-mono text-xs text-ink-faint">
                  to: {withdrawal.address}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-medium",
                    statusClass[withdrawal.status],
                  )}
                >
                  {statusLabel(withdrawal)}
                </span>
                {canEdit && !editing && !cancelling && (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingId(withdrawal.id);
                        setCancellingId(null);
                      }}
                    >
                      <Pencil className="size-3.5" aria-hidden />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setCancellingId(withdrawal.id);
                        setEditingId(null);
                      }}
                    >
                      <Ban className="size-3.5" aria-hidden />
                      Cancel request
                    </Button>
                  </>
                )}
              </div>
            </div>
            {editing && (
              <WithdrawalEditForm
                key={withdrawal.id}
                withdrawal={withdrawal}
                twoFactorEnabled={twoFactorEnabled}
                onCancel={() => setEditingId(null)}
              />
            )}
            {cancelling && (
              <CancelWithdrawalForm
                withdrawal={withdrawal}
                onDismiss={() => setCancellingId(null)}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
