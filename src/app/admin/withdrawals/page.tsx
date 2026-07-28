import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatInr, formatUsdt, type Dec } from "@/lib/money";
import { cn } from "@/lib/cn";
import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { BulkBrokerWithdrawalForm } from "@/components/admin/BulkBrokerWithdrawalForm";
import { WithdrawalReviewActions } from "@/components/admin/ReviewDecisionButtons";
import { WithdrawalSettlementTabs } from "@/components/admin/WithdrawalSettlementTabs";
import {
  adminApproveWithdrawal,
  adminCompleteWithdrawalPayout,
  adminRequestWithdrawalPayoutCorrection,
  adminApproveWithdrawalPayoutDetails,
  adminRejectWithdrawalPayoutDetails,
  adminRejectWithdrawal,
} from "../actions";

export const metadata: Metadata = { title: "Admin · Withdrawals" };

const inputCls =
  "w-full rounded-lg border border-gold-600/20 bg-vault-900/80 px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-gold-500/50 focus:outline-none";

type WithdrawalMethod = "CRYPTO" | "BANK" | "CASH";

type BankDestination = {
  accountNumber: string | null;
  ifsc: string | null;
  upiId: string | null;
  accountType: string | null;
};
type InvestorDetails = {
  email: string;
  fullName: string | null;
  mobile: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  bankingDetail: {
    accountNumber: string | null;
    ifsc: string | null;
    upiId: string | null;
    accountType: string | null;
    usdtAddress: string | null;
    usdtNetwork: string | null;
  } | null;
};

const investorSelect = {
  email: true,
  fullName: true,
  mobile: true,
  address: true,
  city: true,
  state: true,
  bankingDetail: {
    select: {
      accountNumber: true,
      ifsc: true,
      upiId: true,
      accountType: true,
      usdtAddress: true,
      usdtNetwork: true,
    },
  },
} as const;

function methodLabel(method: WithdrawalMethod): string {
  if (method === "CRYPTO") return "Crypto (USDT wallet payout)";
  if (method === "BANK") return "Bank transfer (INR payout)";
  return "Cash (INR payout)";
}

function methodShortLabel(method: WithdrawalMethod): string {
  if (method === "CRYPTO") return "Crypto";
  if (method === "BANK") return "Bank transfer";
  return "Cash";
}

function requestedAmountLabel(usdAmount: Dec): string {
  return formatUsdt(usdAmount) + " USD";
}

function InvestorFinancialDetails({
  method,
  user,
  savedAddress,
  savedNetwork,
  bankSnapshot,
}: {
  method: WithdrawalMethod;
  user: InvestorDetails;
  savedAddress: string;
  savedNetwork: string;
  bankSnapshot?: BankDestination;
}) {
  const bank = user.bankingDetail;

  return (
    <div className="mt-4 rounded-xl border border-gold-600/15 bg-vault-950/50 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-ink-faint">
        {method === "CRYPTO"
          ? "Wallet payout details"
          : method === "BANK"
            ? "Bank / UPI payout details"
            : "Cash payout details"}
      </p>
      <p className="mt-2 text-sm text-ink">
        {user.fullName ?? "Name not provided"} · {user.email}
      </p>

      {method === "CRYPTO" && (
        <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-ink-faint">Network</dt>
            <dd className="mt-0.5 font-mono text-ink">
              {bank?.usdtNetwork ?? savedNetwork}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-ink-faint">USDT wallet address</dt>
            <dd className="mt-0.5 break-all font-mono text-ink">
              {bank?.usdtAddress ?? savedAddress}
            </dd>
          </div>
        </dl>
      )}

      {method === "BANK" && (
        <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-ink-faint">Account number</dt>
            <dd className="mt-0.5 break-all font-mono text-ink">
              {bankSnapshot?.accountNumber ?? "Not provided"}
            </dd>
          </div>
          <div>
            <dt className="text-ink-faint">IFSC</dt>
            <dd className="mt-0.5 font-mono text-ink">{bankSnapshot?.ifsc ?? "Not provided"}</dd>
          </div>
          <div>
            <dt className="text-ink-faint">Account type</dt>
            <dd className="mt-0.5 text-ink">{bankSnapshot?.accountType ?? "Not provided"}</dd>
          </div>
          <div>
            <dt className="text-ink-faint">UPI ID</dt>
            <dd className="mt-0.5 break-all font-mono text-ink">
              {bankSnapshot?.upiId ?? "Not provided"}
            </dd>
          </div>
        </dl>
      )}

      {method === "CASH" && (
        <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-ink-faint">Mobile</dt>
            <dd className="mt-0.5 font-mono text-ink">{user.mobile ?? "Not provided"}</dd>
          </div>
          <div>
            <dt className="text-ink-faint">City / state</dt>
            <dd className="mt-0.5 text-ink">
              {[user.city, user.state].filter(Boolean).join(", ") || "Not provided"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-ink-faint">Address</dt>
            <dd className="mt-0.5 text-ink">{user.address ?? "Not provided"}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}

function BankDestinationCompact({
  destination,
}: {
  destination: BankDestination;
}) {
  return (
    <div className="space-y-0.5 text-xs">
      <p className="font-mono text-ink">
        A/C {destination.accountNumber ?? "Not provided"}
      </p>
      <p className="font-mono text-ink-dim">
        IFSC {destination.ifsc ?? "Not provided"}
      </p>
      <p className="text-ink-dim">
        {destination.accountType ?? "Account type not provided"}
        {destination.upiId ? ` · UPI ${destination.upiId}` : ""}
      </p>
    </div>
  );
}
function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-gold-600/20 px-4 py-8 text-center text-sm text-ink-faint">
      {children}
    </p>
  );
}

export default async function AdminWithdrawalsPage() {
  const [requested, approved, brokerReceived, inrReady, payoutCorrections, recent] =
    await Promise.all([
      prisma.withdrawal.findMany({
        where: { status: "REQUESTED" },
        orderBy: { createdAt: "asc" },
        include: { user: { select: investorSelect } },
      }),
      prisma.withdrawal.findMany({
        where: { status: "APPROVED" },
        orderBy: { createdAt: "asc" },
        include: { user: { select: investorSelect } },
      }),
      prisma.withdrawal.findMany({
        where: { status: "BROKER_RECEIVED" },
        orderBy: { brokerReceivedAt: "asc" },
        include: { user: { select: investorSelect } },
      }),
      prisma.withdrawal.findMany({
        where: { status: "INR_READY" },
        orderBy: { convertedAt: "asc" },
        include: { user: { select: investorSelect } },
      }),
      prisma.withdrawal.findMany({
        where: { status: { in: ["PAYOUT_DETAILS_REQUIRED", "PAYOUT_DETAILS_REVIEW"] } },
        orderBy: { payoutCorrectionRequestedAt: "asc" },
        include: { user: { select: investorSelect } },
      }),
      prisma.withdrawal.findMany({
        where: { status: { in: ["PROCESSED", "REJECTED", "CANCELLED"] } },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { email: true } } },
      }),
    ]);

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <header>
        <p className="eyebrow">Money out</p>
        <h1 className="mt-2 font-serif text-3xl text-ink">
          Withdrawal <em className="gold-text italic">settlement</em>
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-dim">
          Review requests, withdraw approved USD from the broker in bulk, then complete
          each payout using the destination details shown at the payment stage.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Withdrawal work queue">
        {[
          { label: "Awaiting approval", count: requested.length },
          { label: "Broker withdrawal", count: approved.length },
          { label: "Conversion / crypto payout", count: brokerReceived.length },
          { label: "Payout action", count: inrReady.length + payoutCorrections.length },
        ].map((item) => (
          <div
            key={item.label}
            className="glass-card flex min-h-44 items-center justify-between gap-4 rounded-2xl p-5"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">{item.label}</p>
              <p className="mt-2 text-xs font-medium text-ink-dim">
                {item.count > 0 ? "Requires attention" : "Nothing pending"}
              </p>
            </div>
            <span
              className={cn(
                "flex size-20 shrink-0 items-center justify-center rounded-full border font-mono text-3xl font-semibold shadow-lg sm:size-24 sm:text-4xl",
                item.count > 0
                  ? "border-gold-600 bg-gold-600 text-white shadow-gold-600/20"
                  : "border-slate-200 bg-slate-100 text-ink-faint shadow-slate-200/40",
              )}
              aria-label={`${item.count} pending tasks`}
            >
              {item.count}
            </span>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <div>
          <p className="eyebrow">Step 1</p>
          <h2 className="mt-2 font-serif text-xl text-ink">
            Awaiting approval ({requested.length})
          </h2>
        </div>
        {requested.length === 0 ? (
          <EmptyState>No new withdrawal requests.</EmptyState>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gold-600/15 bg-white">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead className="bg-vault-950/45 text-xs uppercase tracking-[0.12em] text-ink-dim">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Investor</th>
                  <th scope="col" className="px-4 py-3 font-medium">Method</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">USD requested</th>
                  <th scope="col" className="px-4 py-3 font-medium">Requested</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-600/10">
                {requested.map((withdrawal) => (
                  <tr key={withdrawal.id} className="hover:bg-vault-950/25">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">
                        {withdrawal.user.fullName ?? "Unnamed investor"}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-dim">{withdrawal.user.email}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink">
                      {methodShortLabel(withdrawal.method)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-sm text-ink">
                      {requestedAmountLabel(withdrawal.amount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-dim">
                      {withdrawal.createdAt.toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <WithdrawalReviewActions
                        id={withdrawal.id}
                        grossUsd={withdrawal.amount.toString()}
                        approveAction={adminApproveWithdrawal}
                        rejectAction={adminRejectWithdrawal}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-gold-600/10 px-4 py-2 text-right text-xs text-ink-dim">
              ✓ approve · ✕ reject
            </p>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <p className="eyebrow">Step 2 · Monday</p>
          <h2 className="mt-2 font-serif text-xl text-ink">
            Withdraw from broker ({approved.length})
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink-dim">
            Select every approved USD request included in the broker withdrawal.
            Confirm once the USDT has reached the company wallet; the selected requests
            then move to individual bank, cash, or wallet payout processing.
          </p>
        </div>
        <BulkBrokerWithdrawalForm
          withdrawals={approved.map((withdrawal) => ({
            id: withdrawal.id,
            investor: withdrawal.user.fullName ?? "Unnamed investor",
            email: withdrawal.user.email,
            method: withdrawal.method,
            amount: withdrawal.amount.toString(),
            weekKey: withdrawal.weekKey,
          }))}
        />
      </section>
      <section className="space-y-4">
        <div>
          <p className="eyebrow">Step 3</p>
          <h2 className="mt-2 font-serif text-xl text-ink">
            Convert or send funds ({brokerReceived.length})
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink-dim">
            Process crypto payouts individually. For bank transfer and cash,
            select a batch and enter the total INR received after conversion;
            the INR is distributed proportionally by each request&apos;s USD value.
          </p>
        </div>
        <WithdrawalSettlementTabs
          withdrawals={brokerReceived.map((withdrawal) => ({
            id: withdrawal.id,
            method: withdrawal.method,
            investor: withdrawal.user.fullName ?? "Unnamed investor",
            email: withdrawal.user.email,
            amount: withdrawal.amount.toString(),
            brokerReceivedUsdt:
              withdrawal.brokerReceivedUsdt?.toString() ?? "0",
            network:
              withdrawal.user.bankingDetail?.usdtNetwork ??
              withdrawal.network,
            address:
              withdrawal.user.bankingDetail?.usdtAddress ??
              withdrawal.address,
          }))}
        />
      </section>
      <section className="space-y-5">
        <div>
          <p className="eyebrow">Step 4</p>
          <h2 className="mt-2 font-serif text-xl text-ink">
            Complete INR payouts ({inrReady.length + payoutCorrections.length})
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink-dim">
            Pay only to the approved destination snapshot. If it is wrong, block the payout and request a correction before sending any money.
          </p>
        </div>

        {payoutCorrections.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-amber-500/25 bg-white">
            <div className="border-b border-amber-500/20 bg-amber-50 px-4 py-3">
              <h3 className="font-medium text-ink">Bank-detail corrections</h3>
              <p className="mt-0.5 text-xs text-ink-dim">
                These payouts are blocked and cannot be marked paid.
              </p>
            </div>
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead className="bg-vault-950/45 text-xs uppercase tracking-[0.12em] text-ink-dim">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Investor</th>
                  <th scope="col" className="px-4 py-3 font-medium">Issue</th>
                  <th scope="col" className="px-4 py-3 font-medium">Approved snapshot</th>
                  <th scope="col" className="px-4 py-3 font-medium">Proposed correction</th>
                  <th scope="col" className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-600/10">
                {payoutCorrections.map((withdrawal) => {
                  const awaitingReview = withdrawal.status === "PAYOUT_DETAILS_REVIEW";
                  return (
                    <tr key={withdrawal.id} className="align-top hover:bg-vault-950/25">
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">
                          {withdrawal.user.fullName ?? "Unnamed investor"}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-dim">{withdrawal.user.email}</p>
                        <p className="mt-1 font-mono text-xs text-ink">
                          {formatInr(withdrawal.convertedInrAmount)} INR
                        </p>
                      </td>
                      <td className="max-w-56 px-4 py-3 text-sm text-ink-dim">
                        {withdrawal.payoutCorrectionNote ?? "Bank destination needs correction"}
                      </td>
                      <td className="px-4 py-3">
                        <BankDestinationCompact
                          destination={{
                            accountNumber: withdrawal.payoutAccountNumber,
                            ifsc: withdrawal.payoutIfsc,
                            upiId: withdrawal.payoutUpiId,
                            accountType: withdrawal.payoutAccountType,
                          }}
                        />
                      </td>
                      <td className="px-4 py-3">
                        {awaitingReview ? (
                          <BankDestinationCompact
                            destination={{
                              accountNumber: withdrawal.proposedAccountNumber,
                              ifsc: withdrawal.proposedIfsc,
                              upiId: withdrawal.proposedUpiId,
                              accountType: withdrawal.proposedAccountType,
                            }}
                          />
                        ) : (
                          <span className="text-sm text-amber-800">Waiting for investor</span>
                        )}
                      </td>
                      <td className="w-56 px-4 py-3">
                        {awaitingReview ? (
                          <div className="space-y-3">
                            <AdminActionForm
                              action={adminApproveWithdrawalPayoutDetails}
                              submitLabel="Approve corrected details"
                              pendingLabel="Approving..."
                              confirmMessage="Approve this new bank destination and return the withdrawal to ready for payout?"
                            >
                              <input type="hidden" name="id" value={withdrawal.id} />
                            </AdminActionForm>
                            <AdminActionForm
                              action={adminRejectWithdrawalPayoutDetails}
                              submitLabel="Request another correction"
                              pendingLabel="Sending..."
                              variant="danger"
                            >
                              <input type="hidden" name="id" value={withdrawal.id} />
                              <input
                                name="note"
                                required
                                placeholder="What is still incorrect?"
                                className={inputCls}
                              />
                            </AdminActionForm>
                          </div>
                        ) : (
                          <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                            Payout on hold
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div>
          <h3 className="font-medium text-ink">Ready to pay ({inrReady.length})</h3>
          <p className="mt-1 text-xs text-ink-dim">
            Record the transaction reference only after the transfer or cash payment succeeds.
          </p>
        </div>
        {inrReady.length === 0 ? (
          <EmptyState>No converted INR payouts are ready to be sent.</EmptyState>
        ) : (
          inrReady.map((withdrawal) => (
            <article key={withdrawal.id} className="glass-card rounded-2xl p-5 sm:p-6">
              <p className="font-mono text-lg text-ink">
                {formatInr(withdrawal.convertedInrAmount)} INR ready · {methodLabel(withdrawal.method)}
              </p>
              <p className="mt-1 text-xs text-ink-dim">
                {withdrawal.user.fullName ?? "Unnamed investor"} · {withdrawal.user.email}
              </p>
              <InvestorFinancialDetails
                method={withdrawal.method}
                user={withdrawal.user}
                savedAddress={withdrawal.address}
                savedNetwork={withdrawal.network}
                bankSnapshot={{
                  accountNumber: withdrawal.payoutAccountNumber,
                  ifsc: withdrawal.payoutIfsc,
                  upiId: withdrawal.payoutUpiId,
                  accountType: withdrawal.payoutAccountType,
                }}
              />
              <div className={withdrawal.method === "BANK" ? "mt-5 grid gap-5 lg:grid-cols-2" : "mt-5 max-w-xl"}>
                <AdminActionForm
                  action={adminCompleteWithdrawalPayout}
                  submitLabel={withdrawal.method === "BANK" ? "Mark bank / UPI transfer paid" : "Mark cash paid"}
                  pendingLabel="Recording payout..."
                  confirmMessage="Confirm that this INR payout was completed using the approved details shown above?"
                >
                  <input type="hidden" name="id" value={withdrawal.id} />
                  <label
                    className="block text-xs uppercase tracking-[0.14em] text-ink-dim"
                    htmlFor={"inr-payout-ref-" + withdrawal.id}
                  >
                    {withdrawal.method === "BANK" ? "Bank UTR / UPI transaction reference" : "Cash receipt reference"}
                  </label>
                  <input
                    id={"inr-payout-ref-" + withdrawal.id}
                    name="payoutReference"
                    placeholder={withdrawal.method === "BANK" ? "Enter the UTR or UPI transaction ID" : "Enter the cash receipt reference"}
                    required
                    className={inputCls}
                  />
                </AdminActionForm>

                {withdrawal.method === "BANK" && (
                  <AdminActionForm
                    action={adminRequestWithdrawalPayoutCorrection}
                    submitLabel="Bank details are incorrect"
                    pendingLabel="Blocking payout..."
                    variant="danger"
                    confirmMessage="Block this payout and ask the investor to correct their bank details?"
                  >
                    <input type="hidden" name="id" value={withdrawal.id} />
                    <label
                      className="block text-xs uppercase tracking-[0.14em] text-ink-dim"
                      htmlFor={"payout-correction-" + withdrawal.id}
                    >
                      Correction required
                    </label>
                    <input
                      id={"payout-correction-" + withdrawal.id}
                      name="note"
                      required
                      placeholder="e.g. account number rejected by bank"
                      className={inputCls}
                    />
                  </AdminActionForm>
                )}
              </div>
            </article>
          ))
        )}
      </section>
      <section>
        <p className="eyebrow">History</p>
        <h2 className="mt-2 font-serif text-xl text-ink">Recently completed or closed</h2>
        <ul className="mt-4 space-y-2">
          {recent.map((withdrawal) => (
            <li
              key={withdrawal.id}
              className="flex flex-col gap-1 rounded-xl border border-gold-600/10 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="min-w-0 text-ink-dim">
                {requestedAmountLabel(withdrawal.amount)}{" "}
                · {withdrawal.user.email} · week {withdrawal.weekKey}
              </span>
              <span
                className={
                  withdrawal.status === "PROCESSED"
                    ? "text-positive"
                    : withdrawal.status === "CANCELLED"
                      ? "text-ink-faint"
                      : "text-negative"
                }
              >
                {withdrawal.status.toLowerCase()}
              </span>
            </li>
          ))}
          {recent.length === 0 && <li className="text-sm text-ink-faint">No history yet.</li>}
        </ul>
      </section>
    </div>
  );
}
