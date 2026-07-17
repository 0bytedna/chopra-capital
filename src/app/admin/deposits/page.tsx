import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatInr, formatUsdt } from "@/lib/money";
import { cn } from "@/lib/cn";
import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { adminConfirmDeposit, adminRejectDeposit, adminRequestDepositCorrection } from "../actions";

export const metadata: Metadata = { title: "Admin · Deposits" };

const filters = [
  { value: "PENDING", label: "Pending" },
  { value: "NEEDS_CORRECTION", label: "Action needed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CONFIRMED", label: "Accepted" },
] as const;

type DepositFilter = (typeof filters)[number]["value"];

function isDepositFilter(value: string | undefined): value is DepositFilter {
  return filters.some((filter) => filter.value === value);
}

function depositMethodLabel(d: {
  method: string;
  network: string | null;
  reference: string | null;
}): string {
  const base = d.method === "CRYPTO" ? d.network ?? "Crypto" : d.method === "BANK" ? "Bank" : "Cash";
  return d.reference ? `${base} · ${d.reference}` : base;
}

const inputCls =
  "w-full rounded-lg border border-gold-600/20 bg-vault-900/80 px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-gold-500/50 focus:outline-none";

type Props = {
  searchParams: Promise<{ status?: string | string[] }>;
};

export default async function AdminDepositsPage({ searchParams }: Props) {
  const query = await searchParams;
  const requestedStatus = typeof query.status === "string" ? query.status : undefined;
  const selectedStatus: DepositFilter = isDepositFilter(requestedStatus) ? requestedStatus : "PENDING";
  const selectedLabel = filters.find((filter) => filter.value === selectedStatus)?.label ?? "Pending";
  const deposits = await prisma.deposit.findMany({
    where: { status: selectedStatus },
    orderBy: { createdAt: selectedStatus === "PENDING" || selectedStatus === "NEEDS_CORRECTION" ? "asc" : "desc" },
    include: { user: { select: { email: true, fullName: true, kycStatus: true } } },
  });
  const needsReview = selectedStatus === "PENDING" || selectedStatus === "NEEDS_CORRECTION";

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <p className="eyebrow">Money in</p>
        <h1 className="mt-2 font-serif text-3xl text-ink">
          Deposit <em className="gold-text italic">confirmations</em>
        </h1>
        <p className="mt-2 text-sm text-ink-dim">Choose a status to focus the review queue.</p>
      </header>

      <nav className="flex flex-wrap gap-2" aria-label="Deposit status filters">
        {filters.map((filter) => (
          <Link
            key={filter.value}
            href={`/admin/deposits?status=${filter.value}`}
            className={cn(
              "rounded-full border px-4 py-2 text-sm transition-colors",
              selectedStatus === filter.value
                ? "border-gold-500/60 bg-gold-600/15 text-gold-300"
                : "border-gold-600/20 bg-vault-900/50 text-ink-dim hover:border-gold-600/40 hover:text-ink",
            )}
          >
            {filter.label}
          </Link>
        ))}
      </nav>

      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">{selectedLabel}</p>
            <h2 className="mt-2 font-serif text-xl text-ink">{selectedLabel} deposits</h2>
          </div>
          <p className="text-sm text-ink-faint">{deposits.length} request{deposits.length === 1 ? "" : "s"}</p>
        </div>

        {deposits.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-gold-600/20 px-4 py-10 text-center text-sm text-ink-faint">
            No {selectedLabel.toLowerCase()} deposit requests.
          </p>
        ) : needsReview ? (
          <div className="mt-4 space-y-4">
            {deposits.map((deposit) => (
              <DepositReviewCard key={deposit.id} deposit={deposit} />
            ))}
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {deposits.map((deposit) => (
              <li key={deposit.id} className="rounded-xl border border-gold-600/10 px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-ink-dim">
                    {deposit.method === "CRYPTO" ? `${formatUsdt(deposit.amount)} USDT` : `₹ ${formatInr(deposit.inrAmount ?? deposit.amount)}`}
                    {deposit.status === "CONFIRMED" && deposit.method !== "CRYPTO" ? ` · ${formatUsdt(deposit.amount)} USDT credited` : ""} · {depositMethodLabel(deposit)} · {deposit.user.email}
                  </span>
                  <span
                    className={
                      deposit.status === "CONFIRMED"
                        ? "text-positive"
                        : deposit.status === "CANCELLED"
                          ? "text-ink-faint"
                          : "text-negative"
                    }
                  >
                    {selectedLabel.toLowerCase()}
                  </span>
                </div>
                {deposit.adminNote && <p className="mt-1 text-xs text-ink-faint">Note: {deposit.adminNote}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function DepositReviewCard({
  deposit,
}: {
  deposit: {
    id: string;
    method: "CRYPTO" | "BANK" | "CASH";
    amount: Parameters<typeof formatUsdt>[0];
    inrAmount: Parameters<typeof formatInr>[0] | null;
    network: string | null;
    txHash: string | null;
    reference: string | null;
    status: string;
    adminNote: string | null;
    createdAt: Date;
    user: { email: string; fullName: string | null; kycStatus: string };
  };
}) {
  const actionNeeded = deposit.status === "NEEDS_CORRECTION";

  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-lg text-ink">
            {deposit.method === "CRYPTO" ? `${formatUsdt(deposit.amount)} USDT` : `₹ ${formatInr(deposit.inrAmount ?? deposit.amount)}`} · {depositMethodLabel(deposit)}
          </p>
          <p className="mt-1 truncate text-xs text-ink-faint">
            {deposit.user.fullName ?? "—"} · {deposit.user.email} · KYC {deposit.user.kycStatus.toLowerCase()} · {" "}
            {deposit.createdAt.toLocaleString("en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </p>
          {deposit.method === "CRYPTO" && deposit.txHash && (
            <p className="mt-1.5 break-all font-mono text-xs text-ink-dim">tx: {deposit.txHash}</p>
          )}
          {deposit.method === "BANK" && deposit.reference && (
            <p className="mt-1.5 break-all font-mono text-xs text-ink-dim">UTR: {deposit.reference}</p>
          )}
          {deposit.adminNote && <p className="mt-1.5 text-xs text-negative">Note: {deposit.adminNote}</p>}
        </div>
        <span
          className={
            actionNeeded
              ? "rounded-full border border-negative/40 bg-negative/10 px-2.5 py-1 text-[11px] font-medium text-negative"
              : "rounded-full border border-gold-500/40 bg-gold-600/10 px-2.5 py-1 text-[11px] font-medium text-gold-300"
          }
        >
          {actionNeeded ? "Action needed" : "Pending"}
        </span>
      </div>

      {actionNeeded ? (
        <div className="mt-5 rounded-xl border border-negative/25 bg-negative/5 px-4 py-3 text-sm text-ink-dim">
          Awaiting the investor’s corrected {deposit.method === "BANK" ? "UTR" : "transaction hash"}. This request cannot be credited until it is resubmitted for review.
        </div>
      ) : (
        <div className={`mt-5 grid gap-5 ${deposit.method === "CASH" ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
          <AdminActionForm action={adminConfirmDeposit} submitLabel="Confirm & credit" pendingLabel="Confirming...">
            <input type="hidden" name="id" value={deposit.id} />
            <label className="block text-xs uppercase tracking-[0.14em] text-ink-dim" htmlFor={`landed-${deposit.id}`}>
              USDT to credit
            </label>
            <input
              id={`landed-${deposit.id}`}
              name="landedAmount"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={deposit.method === "CRYPTO" ? formatUsdt(deposit.amount).replaceAll(",", "") : ""}
              placeholder={deposit.method === "CRYPTO" ? undefined : "Enter confirmed USDT amount"}
              required
              className={inputCls}
            />
          </AdminActionForm>

          <AdminActionForm action={adminRejectDeposit} submitLabel="Reject" variant="danger" pendingLabel="Rejecting...">
            <input type="hidden" name="id" value={deposit.id} />
            <label className="block text-xs uppercase tracking-[0.14em] text-ink-dim" htmlFor={`rej-${deposit.id}`}>
              Reason (shown to investor)
            </label>
            <input id={`rej-${deposit.id}`} name="note" placeholder="e.g. no matching transfer found" className={inputCls} />
          </AdminActionForm>

          {deposit.method !== "CASH" && (
            <AdminActionForm
              action={adminRequestDepositCorrection}
              submitLabel="Request correction"
              variant="ghost"
              pendingLabel="Requesting..."
              confirmMessage="Request correction? This deposit cannot be credited until the investor resubmits the payment details."
            >
              <input type="hidden" name="id" value={deposit.id} />
              <label className="block text-xs uppercase tracking-[0.14em] text-ink-dim" htmlFor={`correction-${deposit.id}`}>
                What needs correction?
              </label>
              <input
                id={`correction-${deposit.id}`}
                name="note"
                placeholder={deposit.method === "BANK" ? "e.g. UTR does not match the bank transfer" : "e.g. transaction hash was not found"}
                required
                className={inputCls}
              />
            </AdminActionForm>
          )}
        </div>
      )}
    </div>
  );
}
