import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatInr, formatUsdt, type Dec } from "@/lib/money";
import { cn } from "@/lib/cn";
import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { BulkBrokerWithdrawalForm } from "@/components/admin/BulkBrokerWithdrawalForm";
import { WithdrawalSettlementTabs } from "@/components/admin/WithdrawalSettlementTabs";
import {
  adminApproveWithdrawal,
  adminCompleteWithdrawalPayout,
  adminRejectWithdrawal,
} from "../actions";

export const metadata: Metadata = { title: "Admin · Withdrawals" };

const inputCls =
  "w-full rounded-lg border border-gold-600/20 bg-vault-900/80 px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-gold-500/50 focus:outline-none";

type WithdrawalMethod = "CRYPTO" | "BANK" | "CASH";

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

function requestedAmountLabel(usdAmount: Dec): string {
  return formatUsdt(usdAmount) + " USD";
}

function InvestorFinancialDetails({
  method,
  user,
  savedAddress,
  savedNetwork,
}: {
  method: WithdrawalMethod;
  user: InvestorDetails;
  savedAddress: string;
  savedNetwork: string;
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
              {bank?.accountNumber ?? "Not provided"}
            </dd>
          </div>
          <div>
            <dt className="text-ink-faint">IFSC</dt>
            <dd className="mt-0.5 font-mono text-ink">{bank?.ifsc ?? "Not provided"}</dd>
          </div>
          <div>
            <dt className="text-ink-faint">Account type</dt>
            <dd className="mt-0.5 text-ink">{bank?.accountType ?? "Not provided"}</dd>
          </div>
          <div>
            <dt className="text-ink-faint">UPI ID</dt>
            <dd className="mt-0.5 break-all font-mono text-ink">
              {bank?.upiId ?? "Not provided"}
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

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-gold-600/20 px-4 py-8 text-center text-sm text-ink-faint">
      {children}
    </p>
  );
}

export default async function AdminWithdrawalsPage() {
  const [requested, approved, brokerReceived, inrReady, recent] =
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
          Approve each USD request, withdraw selected requests from the broker in one
          batch, then process every payout individually. Crypto goes to the saved USDT
          wallet; bank and cash requests are converted to INR first.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Withdrawal work queue">
        {[
          { label: "Awaiting approval", count: requested.length },
          { label: "Broker withdrawal", count: approved.length },
          { label: "Conversion / crypto payout", count: brokerReceived.length },
          { label: "INR ready to pay", count: inrReady.length },
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
          requested.map((withdrawal) => (
            <article key={withdrawal.id} className="glass-card rounded-2xl p-5 sm:p-6">
              <p className="font-mono text-lg text-ink">
                {requestedAmountLabel(withdrawal.amount)}{" "}
                · {methodLabel(withdrawal.method)}
              </p>
              <p className="mt-1 text-xs text-ink-faint">
                {withdrawal.user.fullName ?? "-"} · {withdrawal.user.email} · week{" "}
                {withdrawal.weekKey}
              </p>
              <InvestorFinancialDetails
                method={withdrawal.method}
                user={withdrawal.user}
                savedAddress={withdrawal.address}
                savedNetwork={withdrawal.network}
              />

              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <AdminActionForm
                  action={adminApproveWithdrawal}
                  submitLabel="Approve withdrawal"
                  pendingLabel="Approving..."
                  confirmMessage="Approve this withdrawal and reserve the entered USD debit?"
                >
                  <input type="hidden" name="id" value={withdrawal.id} />
                  <label
                    className="block text-xs uppercase tracking-[0.14em] text-ink-dim"
                    htmlFor={"gross-" + withdrawal.id}
                  >
                    USD to debit from investor holdings
                  </label>
                  <input
                    id={"gross-" + withdrawal.id}
                    name="grossUsd"
                    type="number"
                    step="0.00000001"
                    min="0.00000001"
                    defaultValue={withdrawal.amount.toString()}
                    readOnly
                    required
                    className={inputCls}
                  />
                  <label
                    className="block text-xs uppercase tracking-[0.14em] text-ink-dim"
                    htmlFor={"approve-note-" + withdrawal.id}
                  >
                    Note to investor (optional)
                  </label>
                  <input
                    id={"approve-note-" + withdrawal.id}
                    name="note"
                    placeholder="Optional"
                    className={inputCls}
                  />
                </AdminActionForm>

                <AdminActionForm
                  action={adminRejectWithdrawal}
                  submitLabel="Reject"
                  variant="danger"
                  pendingLabel="Rejecting..."
                >
                  <input type="hidden" name="id" value={withdrawal.id} />
                  <label
                    className="block text-xs uppercase tracking-[0.14em] text-ink-dim"
                    htmlFor={"reject-request-" + withdrawal.id}
                  >
                    Reason shown to investor
                  </label>
                  <input
                    id={"reject-request-" + withdrawal.id}
                    name="note"
                    placeholder="Optional"
                    className={inputCls}
                  />
                </AdminActionForm>
              </div>
            </article>
          ))
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
      <section className="space-y-4">
        <div>
          <p className="eyebrow">Step 4</p>
          <h2 className="mt-2 font-serif text-xl text-ink">
            INR ready for payout ({inrReady.length})
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink-dim">
            Send each payout manually using the saved bank account or UPI details below,
            then record its transaction reference.
          </p>
        </div>
        {inrReady.length === 0 ? (
          <EmptyState>No converted INR payouts are waiting to be sent.</EmptyState>
        ) : (
          inrReady.map((withdrawal) => (
            <article key={withdrawal.id} className="glass-card rounded-2xl p-5 sm:p-6">
              <p className="font-mono text-lg text-ink">
                {formatInr(withdrawal.convertedInrAmount)} INR ready ·{" "}
                {methodLabel(withdrawal.method)}
              </p>
              <p className="mt-1 text-xs text-ink-faint">
                {withdrawal.user.fullName ?? "-"} · {withdrawal.user.email}
              </p>
              <InvestorFinancialDetails
                method={withdrawal.method}
                user={withdrawal.user}
                savedAddress={withdrawal.address}
                savedNetwork={withdrawal.network}
              />
              <AdminActionForm
                action={adminCompleteWithdrawalPayout}
                submitLabel={withdrawal.method === "BANK" ? "Mark bank / UPI transfer paid" : "Mark cash paid"}
                pendingLabel="Recording payout..."
                confirmMessage="Confirm that this INR payout was completed using the details shown above?"
                className="mt-5 max-w-xl"
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
