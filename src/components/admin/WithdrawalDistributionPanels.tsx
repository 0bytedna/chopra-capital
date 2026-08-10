"use client";

import { useState } from "react";
import {
  adminApproveWithdrawalPayoutDetails,
  adminCompleteWithdrawalPayout,
  adminEditWithdrawalInrConversion,
  adminRejectWithdrawalPayoutDetails,
  adminRequestWithdrawalPayoutCorrection,
} from "@/app/admin/actions";
import { AdminActionForm } from "@/components/admin/AdminActionForm";
import {
  CryptoPayouts,
  type SettlementWithdrawal,
} from "@/components/admin/WithdrawalSettlementTabs";
import { cn } from "@/lib/cn";

type Method = "CRYPTO" | "BANK" | "CASH";

type Investor = {
  fullName: string | null;
  mobile: string | null;
  bankingDetail: {
    accountNumber: string | null;
    ifsc: string | null;
    upiId: string | null;
    accountType: string | null;
    usdtAddress: string | null;
    usdtNetwork: string | null;
  } | null;
};

export type InrDistributionWithdrawal = {
  id: string;
  method: "BANK" | "CASH";
  convertedInrAmount: string;
  payoutAccountNumber: string | null;
  payoutIfsc: string | null;
  payoutUpiId: string | null;
  payoutAccountType: string | null;
  user: Investor;
};

export type PayoutCorrectionWithdrawal = {
  id: string;
  status: "PAYOUT_DETAILS_REQUIRED" | "PAYOUT_DETAILS_REVIEW";
  convertedInrAmount: string;
  payoutCorrectionNote: string | null;
  payoutAccountNumber: string | null;
  payoutIfsc: string | null;
  payoutUpiId: string | null;
  payoutAccountType: string | null;
  proposedAccountNumber: string | null;
  proposedIfsc: string | null;
  proposedUpiId: string | null;
  proposedAccountType: string | null;
  user: Pick<Investor, "fullName">;
};

type Props = {
  cryptoWithdrawals: SettlementWithdrawal[];
  inrWithdrawals: InrDistributionWithdrawal[];
  payoutCorrections: PayoutCorrectionWithdrawal[];
};

const tabs: Array<{ id: Method; label: string }> = [
  { id: "CRYPTO", label: "Crypto" },
  { id: "BANK", label: "Bank" },
  { id: "CASH", label: "Cash" },
];

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-blue-400 focus:outline-none";

function formatInr(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? amount.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + " INR"
    : "—";
}

function EmptyPanel({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-center text-sm text-ink-faint">
      {children}
    </p>
  );
}

function ConversionEditForm({
  id,
  currentAmount,
}: {
  id: string;
  currentAmount: string;
}) {
  return (
    <details className="rounded-xl border border-slate-200 bg-white p-3">
      <summary className="cursor-pointer text-sm font-medium text-blue-700">
        Edit conversion value
      </summary>
      <AdminActionForm
        action={adminEditWithdrawalInrConversion}
        showSuccess={false}
        submitLabel="Save conversion"
        pendingLabel="Saving..."
        confirmMessage="Save this corrected INR conversion value?"
        className="mt-3"
      >
        <input type="hidden" name="id" value={id} />
        <input
          name="newInrAmount"
          type="number"
          min="0.01"
          step="0.01"
          defaultValue={currentAmount}
          required
          aria-label="Corrected INR amount"
          className={inputClass}
        />
        <input
          name="reason"
          required
          maxLength={500}
          placeholder="Reason for this correction"
          aria-label="Reason for conversion correction"
          className={inputClass}
        />
      </AdminActionForm>
    </details>
  );
}

function BankDestination({
  accountNumber,
  ifsc,
  upiId,
  accountType,
}: {
  accountNumber: string | null;
  ifsc: string | null;
  upiId: string | null;
  accountType: string | null;
}) {
  return (
    <div className="space-y-0.5 text-xs">
      <p className="font-mono text-ink">A/C {accountNumber ?? "Not provided"}</p>
      <p className="font-mono text-ink-dim">IFSC {ifsc ?? "Not provided"}</p>
      <p className="text-ink-dim">
        {accountType ?? "Account type not provided"}
        {upiId ? " · UPI " + upiId : ""}
      </p>
    </div>
  );
}

function BankCorrections({
  withdrawals,
}: {
  withdrawals: PayoutCorrectionWithdrawal[];
}) {
  if (withdrawals.length === 0) return null;

  return (
    <div className="space-y-3">
      {withdrawals.map((withdrawal) => {
        const awaitingReview = withdrawal.status === "PAYOUT_DETAILS_REVIEW";
        return (
          <article
            key={withdrawal.id}
            className="rounded-xl border border-amber-300 bg-amber-50/60 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-ink">
                  {withdrawal.user.fullName ?? "Unnamed investor"}
                </p>
                <p className="currency-value mt-1 text-sm text-ink">
                  {formatInr(withdrawal.convertedInrAmount)}
                </p>
              </div>
              <span className="rounded-full border border-amber-300 bg-white px-2.5 py-1 text-xs text-amber-800">
                correction
              </span>
            </div>
            <p className="mt-2 text-sm text-amber-900">
              {withdrawal.payoutCorrectionNote ??
                "Bank destination needs correction"}
            </p>
            <div className="mt-3">
              <ConversionEditForm
                id={withdrawal.id}
                currentAmount={withdrawal.convertedInrAmount}
              />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-amber-200 bg-white p-3">
                <p className="mb-2 text-xs uppercase tracking-wider text-ink-faint">
                  Approved details
                </p>
                <BankDestination
                  accountNumber={withdrawal.payoutAccountNumber}
                  ifsc={withdrawal.payoutIfsc}
                  upiId={withdrawal.payoutUpiId}
                  accountType={withdrawal.payoutAccountType}
                />
              </div>
              <div className="rounded-lg border border-amber-200 bg-white p-3">
                <p className="mb-2 text-xs uppercase tracking-wider text-ink-faint">
                  Proposed correction
                </p>
                {awaitingReview ? (
                  <BankDestination
                    accountNumber={withdrawal.proposedAccountNumber}
                    ifsc={withdrawal.proposedIfsc}
                    upiId={withdrawal.proposedUpiId}
                    accountType={withdrawal.proposedAccountType}
                  />
                ) : (
                  <p className="text-sm text-amber-800">
                    Waiting for investor
                  </p>
                )}
              </div>
            </div>

            {awaitingReview && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <AdminActionForm
                  action={adminApproveWithdrawalPayoutDetails}
                  showSuccess={false}
                  submitLabel="Approve corrected details"
                  pendingLabel="Approving..."
                  confirmMessage="Approve this new bank destination and return the withdrawal to ready for payout?"
                  submitClassName="w-full"
                >
                  <input type="hidden" name="id" value={withdrawal.id} />
                </AdminActionForm>
                <AdminActionForm
                  action={adminRejectWithdrawalPayoutDetails}
                  showSuccess={false}
                  submitLabel="Request another correction"
                  pendingLabel="Sending..."
                  variant="danger"
                  submitClassName="w-full"
                >
                  <input type="hidden" name="id" value={withdrawal.id} />
                  <input
                    name="note"
                    required
                    placeholder="What is still incorrect?"
                    className={inputClass}
                  />
                </AdminActionForm>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function PayoutCards({
  method,
  withdrawals,
}: {
  method: "BANK" | "CASH";
  withdrawals: InrDistributionWithdrawal[];
}) {
  if (withdrawals.length === 0) {
    return (
      <EmptyPanel>
        No {method === "BANK" ? "bank" : "cash"} payouts are ready.
      </EmptyPanel>
    );
  }

  return (
    <div className="space-y-3">
      {withdrawals.map((withdrawal) => (
        <article
          key={withdrawal.id}
          className="glass-card rounded-2xl p-4 sm:p-5"
        >
          <div className="flex min-w-0 items-center justify-between gap-3">
            <p className="currency-value whitespace-nowrap text-lg text-ink">
              {formatInr(withdrawal.convertedInrAmount)} ready
            </p>
            <p className="min-w-0 truncate text-right text-[clamp(0.7rem,3.2vw,0.875rem)] font-medium text-ink">
              {withdrawal.user.fullName ?? "Unnamed investor"}
            </p>
          </div>

          {method === "BANK" ? (
            <dl className="mt-3 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-ink-faint">Account number</dt>
                <dd className="mt-0.5 break-all font-mono text-ink">
                  {withdrawal.payoutAccountNumber ?? "Not provided"}
                </dd>
              </div>
              <div>
                <dt className="text-ink-faint">IFSC</dt>
                <dd className="mt-0.5 font-mono text-ink">
                  {withdrawal.payoutIfsc ?? "Not provided"}
                </dd>
              </div>
              <div>
                <dt className="text-ink-faint">Account type</dt>
                <dd className="mt-0.5 text-ink">
                  {withdrawal.payoutAccountType ?? "Not provided"}
                </dd>
              </div>
              <div>
                <dt className="text-ink-faint">UPI ID</dt>
                <dd className="mt-0.5 break-all font-mono text-ink">
                  {withdrawal.payoutUpiId ??
                    withdrawal.user.bankingDetail?.upiId ??
                    "Not provided"}
                </dd>
              </div>
            </dl>
          ) : (
            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-ink-dim">
              Cash payout · Mobile{" "}
              {withdrawal.user.mobile ?? "not provided"}
            </div>
          )}

          <div className="mt-3">
            <ConversionEditForm
              id={withdrawal.id}
              currentAmount={withdrawal.convertedInrAmount}
            />
          </div>

          <div
            className={
              method === "BANK"
                ? "mt-3 grid gap-3 lg:grid-cols-2"
                : "mt-3 max-w-xl"
            }
          >
            <AdminActionForm
              action={adminCompleteWithdrawalPayout}
              showSuccess={false}
              submitLabel={
                method === "BANK"
                  ? "Mark bank / UPI transfer paid"
                  : "Mark cash paid"
              }
              pendingLabel="Recording payout..."
              confirmMessage="Confirm that this INR payout was completed using the approved details shown above?"
            >
              <input type="hidden" name="id" value={withdrawal.id} />
              <input
                name="payoutReference"
                placeholder={
                  method === "BANK"
                    ? "Bank UTR or UPI transaction ID"
                    : "Cash receipt reference"
                }
                required
                className={inputClass}
                aria-label={
                  method === "BANK"
                    ? "Bank transaction reference"
                    : "Cash receipt reference"
                }
              />
            </AdminActionForm>

            {method === "BANK" && (
              <AdminActionForm
                action={adminRequestWithdrawalPayoutCorrection}
                showSuccess={false}
                submitLabel="Bank details are incorrect"
                pendingLabel="Blocking payout..."
                variant="danger"
                confirmMessage="Block this payout and ask the investor to correct their bank details?"
              >
                <input type="hidden" name="id" value={withdrawal.id} />
                <input
                  name="note"
                  required
                  placeholder="What needs to be corrected?"
                  className={inputClass}
                  aria-label="Correction required"
                />
              </AdminActionForm>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

export function WithdrawalDistributionPanels({
  cryptoWithdrawals,
  inrWithdrawals,
  payoutCorrections,
}: Props) {
  const counts = {
    CRYPTO: cryptoWithdrawals.length,
    BANK:
      inrWithdrawals.filter((item) => item.method === "BANK").length +
      payoutCorrections.length,
    CASH: inrWithdrawals.filter((item) => item.method === "CASH").length,
  };
  const [active, setActive] = useState<Method>(() => {
    if (counts.CRYPTO > 0) return "CRYPTO";
    if (counts.BANK > 0) return "BANK";
    if (counts.CASH > 0) return "CASH";
    return "CRYPTO";
  });

  return (
    <div>
      <div
        className="mb-3 grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-white p-1"
        role="tablist"
        aria-label="Fund distribution method"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            onClick={() => setActive(tab.id)}
            className={cn(
              "min-w-0 rounded-lg px-2 py-2 text-xs transition-colors sm:text-sm",
              active === tab.id
                ? "bg-blue-100 text-blue-700"
                : "text-ink-dim hover:bg-slate-50 hover:text-ink",
            )}
          >
            {tab.label}
            <span className="ml-1.5 rounded-full bg-white/75 px-1.5 py-0.5 font-mono text-[11px]">
              {counts[tab.id]}
            </span>
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {active === "CRYPTO" ? (
          <CryptoPayouts withdrawals={cryptoWithdrawals} />
        ) : active === "BANK" ? (
          <div className="space-y-3">
            <BankCorrections withdrawals={payoutCorrections} />
            <PayoutCards
              method="BANK"
              withdrawals={inrWithdrawals.filter(
                (item) => item.method === "BANK",
              )}
            />
          </div>
        ) : (
          <PayoutCards
            method="CASH"
            withdrawals={inrWithdrawals.filter(
              (item) => item.method === "CASH",
            )}
          />
        )}
      </div>
    </div>
  );
}
