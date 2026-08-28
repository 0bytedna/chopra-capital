"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Ban, Pencil, X } from "lucide-react";
import { cancelWithdrawal, editWithdrawal, type WithdrawFormState } from "./actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, SelectField } from "@/components/ui/Field";
import { OtpField } from "@/components/ui/OtpField";
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
    | "PAYOUT_DETAILS_REQUIRED"
    | "PAYOUT_DETAILS_REVIEW"
    | "PROCESSED"
    | "REJECTED"
    | "CANCELLED";
  amount: string;
  editAmount: string;
  referenceRate: string;
  network: string;
  address: string;
  paidAmount: string | null;
  paidInrAmount: string | null;
  brokerReceivedUsdt: string | null;
  convertedInrAmount: string | null;
  weekKey: string;
  adminNote: string | null;
  payoutCorrectionNote: string | null;
  createdAt: string;
};

type MethodAvailability = {
  bank: boolean;
  cash: boolean;
};

const statusClass: Record<Withdrawal["status"], string> = {
  REQUESTED: "border-gold-500/40 bg-gold-600/10 text-gold-300",
  APPROVED: "border-gold-500/40 bg-gold-600/10 text-gold-300",
  BROKER_RECEIVED: "border-gold-400/40 bg-gold-400/10 text-gold-300",
  INR_READY: "border-gold-400/40 bg-gold-400/10 text-gold-300",
  PAYOUT_DETAILS_REQUIRED: "border-amber-500/40 bg-amber-50 text-amber-800",
  PAYOUT_DETAILS_REVIEW: "border-amber-500/40 bg-amber-50 text-amber-800",
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
  if (withdrawal.status === "PAYOUT_DETAILS_REQUIRED") return "bank details required";
  if (withdrawal.status === "PAYOUT_DETAILS_REVIEW") return "corrected details in review";
  if (withdrawal.status === "PROCESSED") return "paid";
  return withdrawal.status.toLowerCase();
}

function WithdrawalEditForm({
  withdrawal,
  twoFactorEnabled,
  methodAvailability,
  onCancel,
}: {
  withdrawal: Withdrawal;
  twoFactorEnabled: boolean;
  methodAvailability: MethodAvailability;
  onCancel: () => void;
}) {
  const [state, action] = useActionState<WithdrawFormState, FormData>(editWithdrawal, {});
  const [selectedMethod, setSelectedMethod] = useState(withdrawal.method);
  const [amountInput, setAmountInput] = useState(withdrawal.editAmount);
  const crypto = selectedMethod === "CRYPTO";
  const referenceRate = Number(withdrawal.referenceRate);
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
          <p className="currency-value mt-1 text-sm text-gold-300">
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
        <option value="BANK" disabled={!methodAvailability.bank}>Bank transfer (INR payout){methodAvailability.bank ? "" : " - unavailable"}</option>
        <option value="CASH" disabled={!methodAvailability.cash}>Cash (INR payout){methodAvailability.cash ? "" : " - unavailable"}</option>
      </SelectField>
      <p className="text-xs leading-relaxed text-ink-faint">
        Changing the method uses the current payout details saved in Profile &amp; Security.
      </p>
      {twoFactorEnabled && (
        <OtpField
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

export function WithdrawalHistory({
  withdrawals,
  twoFactorEnabled = false,
  methodAvailability,
}: {
  withdrawals: Withdrawal[];
  twoFactorEnabled?: boolean;
  methodAvailability: MethodAvailability;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);

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
        const detailsOpen = detailsId === withdrawal.id;
        const crypto = withdrawal.method === "CRYPTO";
        const currentReferenceRate = Number(withdrawal.referenceRate);
        const requestedUsd = Number(withdrawal.editAmount);
        const currentReferenceEstimate =
          !crypto && Number.isFinite(requestedUsd) && Number.isFinite(currentReferenceRate)
            ? requestedUsd * currentReferenceRate
            : 0;

        return (
          <li key={withdrawal.id} className="glass-card rounded-xl px-4 py-3.5">
            <div className="min-w-0">
              <div className="flex items-start justify-between gap-3">
                <p className="currency-value min-w-0 text-sm text-ink">
                  {withdrawal.amount} USD requested
                </p>
                <button
                  type="button"
                  aria-expanded={detailsOpen}
                  aria-controls={`withdrawal-details-${withdrawal.id}`}
                  title={detailsOpen ? "Hide withdrawal details" : "Show withdrawal details"}
                  onClick={() => {
                    setDetailsId(detailsOpen ? null : withdrawal.id);
                    setEditingId(null);
                    setCancellingId(null);
                  }}
                  className={cn(
                    "shrink-0 cursor-pointer rounded-full border px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-75",
                    statusClass[withdrawal.status],
                  )}
                >
                  {statusLabel(withdrawal)}
                </button>
              </div>
              <p className="mt-1 text-xs text-ink-faint">
                {methodLabel(withdrawal)} · {new Date(withdrawal.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
              {withdrawal.paidAmount && (
                <p className="currency-value mt-1 text-xs text-positive">
                  Paid {withdrawal.paidAmount} USDT
                </p>
              )}
              {withdrawal.paidInrAmount && (
                <p className="currency-value mt-1 text-xs text-positive">
                  Paid {withdrawal.paidInrAmount} INR
                </p>
              )}
              {withdrawal.status === "REJECTED" && withdrawal.adminNote && (
                <p className="mt-2 text-xs text-negative">Reason: {withdrawal.adminNote}</p>
              )}
              {withdrawal.status === "PAYOUT_DETAILS_REQUIRED" && (
                <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  <p>
                    This payout is on hold{withdrawal.payoutCorrectionNote ? `: ${withdrawal.payoutCorrectionNote}` : "."}
                  </p>
                  <Link href="/app/profile#banking-details" className="mt-1 inline-block font-medium text-gold-600 underline underline-offset-2">
                    Correct bank details in Profile &amp; Security
                  </Link>
                </div>
              )}
              {withdrawal.status === "PAYOUT_DETAILS_REVIEW" && (
                <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Your corrected bank details were submitted. The payout remains blocked until an admin approves them.
                </p>
              )}
              {canEdit && !editing && !cancelling && (
                <div className="mt-3 flex flex-wrap items-center gap-2 sm:justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingId(withdrawal.id);
                      setCancellingId(null);
                      setDetailsId(null);
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
                      setDetailsId(null);
                    }}
                  >
                    <Ban className="size-3.5" aria-hidden />
                    Cancel request
                  </Button>
                </div>
              )}
            </div>
            {detailsOpen && (
              <dl
                id={`withdrawal-details-${withdrawal.id}`}
                className="mt-4 grid gap-3 border-t border-gold-600/15 pt-4 sm:grid-cols-2"
              >
                {!crypto && (
                  <div className="rounded-lg bg-vault-950/35 px-3 py-2">
                    <dt className="text-xs uppercase tracking-[0.12em] text-ink-faint">Current INR estimate</dt>
                    <dd className="mt-1 text-xs text-ink-dim">
                      {currentReferenceEstimate > 0
                        ? currentReferenceEstimate.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : "—"} INR at {withdrawal.referenceRate} INR/USD
                    </dd>
                  </div>
                )}
                {withdrawal.brokerReceivedUsdt && (
                  <div className="rounded-lg bg-vault-950/35 px-3 py-2">
                    <dt className="text-xs uppercase tracking-[0.12em] text-ink-faint">Received from broker</dt>
                    <dd className="currency-value mt-1 text-xs text-ink">{withdrawal.brokerReceivedUsdt} USDT</dd>
                  </div>
                )}
                {withdrawal.convertedInrAmount && (
                  <div className="rounded-lg bg-vault-950/35 px-3 py-2">
                    <dt className="text-xs uppercase tracking-[0.12em] text-ink-faint">Converted for payout</dt>
                    <dd className="currency-value mt-1 text-xs text-ink">{withdrawal.convertedInrAmount} INR</dd>
                  </div>
                )}
                <div className="rounded-lg bg-vault-950/35 px-3 py-2">
                  <dt className="text-xs uppercase tracking-[0.12em] text-ink-faint">Processing week</dt>
                  <dd className="mt-1 font-mono text-xs text-ink">{withdrawal.weekKey}</dd>
                </div>
                <div className="rounded-lg bg-vault-950/35 px-3 py-2 sm:col-span-2">
                  <dt className="text-xs uppercase tracking-[0.12em] text-ink-faint">Destination</dt>
                  <dd className="mt-1 break-all font-mono text-xs text-ink">{withdrawal.address}</dd>
                </div>
                {withdrawal.adminNote && withdrawal.status !== "REJECTED" && (
                  <div className="rounded-lg bg-vault-950/35 px-3 py-2 sm:col-span-2">
                    <dt className="text-xs uppercase tracking-[0.12em] text-ink-faint">Admin note</dt>
                    <dd className="mt-1 text-xs text-ink-dim">{withdrawal.adminNote}</dd>
                  </div>
                )}
              </dl>
            )}
            {editing && (
              <WithdrawalEditForm
                key={withdrawal.id}
                withdrawal={withdrawal}
                twoFactorEnabled={twoFactorEnabled}
                methodAvailability={methodAvailability}
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
