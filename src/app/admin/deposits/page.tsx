import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, Layers3, WalletCards } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatInr, formatUsdt } from "@/lib/money";
import { cn } from "@/lib/cn";
import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { BulkDepositAllocationForm } from "@/components/admin/BulkDepositAllocationForm";
import { BrokerTransferForm } from "@/components/admin/BrokerTransferForm";
import { adminConfirmDeposit, adminRejectDeposit, adminRequestDepositCorrection } from "../actions";

export const metadata: Metadata = { title: "Admin · Deposits" };

const methods = [
  { value: "BANK", label: "Bank transfer", source: "INR received" },
  { value: "CRYPTO", label: "Crypto", source: "USDT received" },
  { value: "CASH", label: "Cash", source: "INR received" },
] as const;

const historyFilters = [
  { value: "ALL", label: "All history" },
  { value: "NEEDS_CORRECTION", label: "Action needed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CONFIRMED", label: "Invested" },
] as const;

type DepositMethod = (typeof methods)[number]["value"];
type HistoryFilter = (typeof historyFilters)[number]["value"];

function isMethod(value: string | undefined): value is DepositMethod {
  return methods.some((method) => method.value === value);
}

function isHistoryFilter(value: string | undefined): value is HistoryFilter {
  return historyFilters.some((filter) => filter.value === value);
}

function sourceAmount(deposit: {
  method: DepositMethod;
  amount: Parameters<typeof formatUsdt>[0];
  reportedUsdtAmount: Parameters<typeof formatUsdt>[0] | null;
  inrAmount: Parameters<typeof formatInr>[0] | null;
}): Parameters<typeof formatUsdt>[0] {
  return deposit.method === "CRYPTO"
    ? deposit.reportedUsdtAmount ?? deposit.amount
    : deposit.inrAmount ?? 0;
}

function sourceAmountLabel(deposit: Parameters<typeof sourceAmount>[0]): string {
  const amount = sourceAmount(deposit);
  return deposit.method === "CRYPTO"
    ? formatUsdt(amount, 8) + " USDT"
    : formatInr(amount) + " INR";
}
function depositMethodLabel(deposit: {
  method: DepositMethod;
  network: string | null;
  reference: string | null;
}): string {
  if (deposit.method === "CRYPTO") return `Crypto${deposit.network ? ` · ${deposit.network}` : ""}`;
  if (deposit.method === "BANK") return `Bank transfer${deposit.reference ? ` · UTR ${deposit.reference}` : ""}`;
  return "Cash";
}

function historyStatusLabel(status: string): string {
  if (status === "NEEDS_CORRECTION") return "action needed";
  if (status === "CONFIRMED") return "invested";
  return status.toLowerCase();
}

const inputClass =
  "w-full rounded-lg border border-gold-600/20 bg-vault-900/80 px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-gold-500/50 focus:outline-none";

type Props = {
  searchParams: Promise<{ method?: string | string[]; history?: string | string[] }>;
};

export default async function AdminDepositsPage({ searchParams }: Props) {
  const query = await searchParams;
  const requestedMethod = typeof query.method === "string" ? query.method : undefined;
  const requestedHistory = typeof query.history === "string" ? query.history : undefined;
  const selectedMethod: DepositMethod = isMethod(requestedMethod) ? requestedMethod : "BANK";
  const selectedHistory: HistoryFilter = isHistoryFilter(requestedHistory) ? requestedHistory : "ALL";
  const methodMeta = methods.find((method) => method.value === selectedMethod) ?? methods[0];

  const [methodCounts, activeDeposits, queuedDeposits, history, conversionBatches, brokerBatches] =
    await Promise.all([
      Promise.all(
        methods.map(async (method) => ({
          method: method.value,
          count: await prisma.deposit.count({
            where: {
              method: method.value,
              status: { in: ["PENDING", "NEEDS_CORRECTION", "RECEIVED", "QUEUED"] },
            },
          }),
        })),
      ),
      prisma.deposit.findMany({
        where: { method: selectedMethod, status: { in: ["PENDING", "RECEIVED"] } },
        orderBy: { createdAt: "asc" },
        include: { user: { select: { email: true, fullName: true, kycStatus: true } } },
      }),
      prisma.deposit.findMany({
        where: { status: "QUEUED" },
        orderBy: { createdAt: "asc" },
        include: { user: { select: { email: true, fullName: true } } },
      }),
      prisma.deposit.findMany({
        where: {
          method: selectedMethod,
          status:
            selectedHistory === "ALL"
              ? { in: ["NEEDS_CORRECTION", "CANCELLED", "REJECTED", "CONFIRMED"] }
              : selectedHistory,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { user: { select: { email: true, fullName: true, kycStatus: true } } },
      }),
      selectedMethod === "CRYPTO"
        ? Promise.resolve([])
        : prisma.depositAllocationBatch.findMany({
            where: { method: selectedMethod },
            orderBy: { createdAt: "desc" },
            take: 6,
            include: {
              admin: { select: { fullName: true, email: true } },
              _count: { select: { deposits: true } },
            },
          }),
      prisma.brokerTransferBatch.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          admin: { select: { fullName: true, email: true } },
          _count: { select: { deposits: true } },
        },
      }),
    ]);

  const pending = activeDeposits.filter((deposit) => deposit.status === "PENDING");
  const conversionReady = activeDeposits.filter((deposit) => deposit.status === "RECEIVED");

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <p className="eyebrow">Money in</p>
        <h1 className="mt-2 font-serif text-3xl text-ink">
          Deposit <em className="gold-text italic">operations</em>
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-dim">
          Confirm payments first. INR deposits enter the queue only after conversion to USDT; confirmed crypto enters immediately. On weekends, transfer the company-wallet queue to the broker and invest the net amount received.
        </p>
      </header>

      <nav className="grid gap-3 sm:grid-cols-3" aria-label="Deposit method sections">
        {methods.map((method) => {
          const count = methodCounts.find((item) => item.method === method.value)?.count ?? 0;
          return (
            <Link
              key={method.value}
              href={`/admin/deposits?method=${method.value}`}
              className={cn(
                "flex min-h-40 items-center justify-between gap-4 rounded-2xl border px-5 py-5 transition-colors",
                selectedMethod === method.value
                  ? "border-gold-500/55 bg-gold-600/12"
                  : "border-gold-600/15 bg-vault-900/45 hover:border-gold-600/35",
              )}
              aria-current={selectedMethod === method.value ? "page" : undefined}
            >
              <span className="min-w-0">
                <span className="block font-serif text-xl text-ink">{method.label}</span>
                <span className="mt-2 block text-xs text-ink-faint">{method.source} · active work</span>
                <span className="mt-2 block text-xs font-medium text-ink-dim">{count > 0 ? "Requires attention" : "Nothing pending"}</span>
              </span>
              <span className={cn("flex size-20 shrink-0 items-center justify-center rounded-full border font-mono text-3xl font-semibold shadow-lg", count > 0 ? "border-gold-600 bg-gold-600 text-white shadow-gold-600/20" : "border-slate-200 bg-slate-100 text-ink-faint shadow-slate-200/40")} aria-label={`${count} active requests`}>
                {count}
              </span>
            </Link>
          );
        })}
      </nav>

      <section className="glass-card rounded-2xl p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-full border border-gold-500/35 bg-gold-600/10 font-mono text-xs text-gold-300">1</span>
              <p className="eyebrow">Receipt verification</p>
            </div>
            <h2 className="mt-2 font-serif text-xl text-ink">Confirm {methodMeta.source}</h2>
            <p className="mt-1 text-sm text-ink-dim">
              {selectedMethod === "CRYPTO"
                ? "Once the company wallet receipt is verified, the USDT moves directly into the queue."
                : "Confirm only that the INR was received. It still needs to be converted before entering the USDT queue."}
            </p>
          </div>
          <div className="text-center"><span className={cn("flex size-16 items-center justify-center rounded-full border font-mono text-2xl font-semibold", pending.length > 0 ? "border-gold-600 bg-gold-600 text-white" : "border-slate-200 bg-slate-100 text-ink-faint")}>{pending.length}</span><span className="mt-1 block text-xs text-ink-faint">pending</span></div>
        </div>

        {pending.length === 0 ? (
          <p className="mt-5 rounded-xl border border-dashed border-gold-600/20 px-4 py-9 text-center text-sm text-ink-faint">
            No {methodMeta.label.toLowerCase()} deposits need receipt verification.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {pending.map((deposit) => (
              <DepositReviewCard key={deposit.id} deposit={deposit} />
            ))}
          </div>
        )}
      </section>

      {selectedMethod !== "CRYPTO" && (
        <>
          <div className="flex justify-center text-gold-500/60" aria-hidden>
            <ArrowRight className="size-5 rotate-90" />
          </div>
          <section className="glass-card rounded-2xl border-gold-500/20 p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full border border-gold-500/35 bg-gold-600/10 font-mono text-xs text-gold-300">2</span>
                  <p className="eyebrow">INR conversion</p>
                </div>
                <h2 className="mt-2 font-serif text-xl text-ink">Convert confirmed INR to USDT</h2>
                <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink-dim">
                  Select received INR deposits and enter the total USDT bought in the company wallet. It is distributed proportionally and moved into the weekend queue.
                </p>
              </div>
              <span className="rounded-full border border-positive/25 bg-positive/5 px-3 py-1 font-mono text-xs text-positive">
                {conversionReady.length} ready
              </span>
            </div>
            <div className="mt-5">
              <BulkDepositAllocationForm
                key={`${selectedMethod}-${conversionReady.map((deposit) => deposit.id).join("-")}`}
                method={selectedMethod}
                deposits={conversionReady.map((deposit) => ({
                  id: deposit.id,
                  investor: deposit.user.fullName ?? "Unnamed investor",
                  email: deposit.user.email,
                  sourceAmount: String(sourceAmount(deposit)),
                  reference: deposit.method === "BANK" && deposit.reference ? `UTR ${deposit.reference}` : deposit.reference,
                  network: null,
                  receivedAt: (deposit.receivedAt ?? deposit.createdAt).toISOString(),
                }))}
              />
            </div>
          </section>
        </>
      )}

      <div className="flex justify-center text-gold-500/60" aria-hidden>
        <ArrowRight className="size-5 rotate-90" />
      </div>

      <section className="glass-card rounded-2xl border-gold-500/30 p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-full border border-gold-500/35 bg-gold-600/10 font-mono text-xs text-gold-300">
                {selectedMethod === "CRYPTO" ? "2" : "3"}
              </span>
              <p className="eyebrow">Weekend broker transfer</p>
            </div>
            <h2 className="mt-2 font-serif text-xl text-ink">Transfer the company USDT queue and invest</h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink-dim">
              Select queued deposits from any method, then enter the net USDT received by the broker after transfer fees. The net amount is distributed proportionally and invested at the current NAV.
            </p>
          </div>
          <span className="rounded-full border border-gold-500/30 bg-gold-600/8 px-3 py-1 font-mono text-xs text-gold-300">
            {queuedDeposits.length} queued
          </span>
        </div>
        <div className="mt-5">
          <BrokerTransferForm
            key={queuedDeposits.map((deposit) => deposit.id).join("-")}
            deposits={queuedDeposits.map((deposit) => ({
              id: deposit.id,
              investor: deposit.user.fullName ?? "Unnamed investor",
              email: deposit.user.email,
              method: deposit.method,
              detail:
                deposit.method === "BANK"
                  ? deposit.reference
                    ? `UTR ${deposit.reference}`
                    : null
                  : deposit.method === "CRYPTO"
                    ? deposit.network
                    : null,
              queuedAmount: String(deposit.queuedUsdtAmount ?? 0),
            }))}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Requests</p>
            <h2 className="mt-2 font-serif text-xl text-ink">{methodMeta.label} history</h2>
          </div>
          <nav className="flex flex-wrap gap-2" aria-label="Deposit history filters">
            {historyFilters.map((filter) => (
              <Link
                key={filter.value}
                href={`/admin/deposits?method=${selectedMethod}&history=${filter.value}`}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition-colors",
                  selectedHistory === filter.value
                    ? "border-gold-500/50 bg-gold-600/12 text-gold-300"
                    : "border-gold-600/15 text-ink-faint hover:text-ink",
                )}
              >
                {filter.label}
              </Link>
            ))}
          </nav>
        </div>

        {history.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gold-600/20 px-4 py-8 text-center text-sm text-ink-faint">
            No matching deposit history.
          </p>
        ) : (
          <ul className="space-y-2">
            {history.map((deposit) => (
              <li key={deposit.id} className="rounded-xl border border-gold-600/10 bg-vault-900/30 px-4 py-3 text-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-ink-dim">
                      <span className="font-mono text-ink">{sourceAmountLabel(deposit)}</span> · {deposit.user.fullName ?? deposit.user.email} · {depositMethodLabel(deposit)}
                    </p>
                    <p className="mt-1 text-xs text-ink-faint">
                      {deposit.createdAt.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      {deposit.status === "CONFIRMED" ? ` · ${formatUsdt(deposit.amount, 8)} USDT invested` : ""}
                      {deposit.adminNote ? ` · ${deposit.adminNote}` : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-xs",
                      deposit.status === "CONFIRMED"
                        ? "text-positive"
                        : deposit.status === "CANCELLED"
                          ? "text-ink-faint"
                          : "text-negative",
                    )}
                  >
                    {historyStatusLabel(deposit.status)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selectedMethod !== "CRYPTO" && (
        <section className="space-y-4">
          <div>
            <p className="eyebrow">Conversion audit</p>
            <h2 className="mt-2 font-serif text-xl text-ink">Recent INR-to-USDT batches</h2>
          </div>
          {conversionBatches.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gold-600/20 px-4 py-8 text-center text-sm text-ink-faint">
              No conversion batches recorded for this method yet.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {conversionBatches.map((batch) => (
                <li key={batch.id} className="rounded-xl border border-gold-600/12 bg-vault-900/35 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm text-ink">{formatUsdt(batch.totalUsdt, 8)} USDT queued</p>
                      <p className="mt-1 text-xs text-ink-faint">
                        from {formatInr(batch.totalSourceAmount)} INR · {batch._count.deposits} user{batch._count.deposits === 1 ? "" : "s"}
                      </p>
                    </div>
                    <Layers3 className="size-4 shrink-0 text-gold-500" aria-hidden />
                  </div>
                  <p className="mt-3 text-xs text-ink-faint">
                    {batch.createdAt.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} · {batch.admin.fullName ?? batch.admin.email}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="space-y-4">
        <div>
          <p className="eyebrow">Broker audit</p>
          <h2 className="mt-2 font-serif text-xl text-ink">Recent weekend transfers</h2>
        </div>
        {brokerBatches.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gold-600/20 px-4 py-8 text-center text-sm text-ink-faint">
            No broker transfers recorded yet.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {brokerBatches.map((batch) => (
              <li key={batch.id} className="rounded-xl border border-gold-600/12 bg-vault-900/35 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm text-ink">{formatUsdt(batch.totalReceivedUsdt, 8)} USDT invested</p>
                    <p className="mt-1 text-xs text-ink-faint">
                      from {formatUsdt(batch.totalQueuedUsdt, 8)} queued · fee {formatUsdt(batch.totalQueuedUsdt.sub(batch.totalReceivedUsdt), 8)} · {batch._count.deposits} deposit{batch._count.deposits === 1 ? "" : "s"}
                    </p>
                  </div>
                  <WalletCards className="size-4 shrink-0 text-gold-500" aria-hidden />
                </div>
                <p className="mt-3 text-xs text-ink-faint">
                  NAV {formatUsdt(batch.navPrice, 6)} · {batch.createdAt.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} · {batch.admin.fullName ?? batch.admin.email}
                </p>
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
    method: DepositMethod;
    amount: Parameters<typeof formatUsdt>[0];
    reportedUsdtAmount: Parameters<typeof formatUsdt>[0] | null;
    inrAmount: Parameters<typeof formatInr>[0] | null;
    network: string | null;
    txHash: string | null;
    reference: string | null;
    adminNote: string | null;
    createdAt: Date;
    user: { email: string; fullName: string | null; kycStatus: string };
  };
}) {
  const crypto = deposit.method === "CRYPTO";

  return (
    <article className="rounded-xl border border-gold-600/15 bg-vault-950/35 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-lg text-ink">{sourceAmountLabel(deposit)}</p>
          <p className="mt-1 truncate text-xs text-ink-faint">
            {deposit.user.fullName ?? "Unnamed investor"} · {deposit.user.email} · KYC {deposit.user.kycStatus.toLowerCase()} · {deposit.createdAt.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </p>
          {crypto && deposit.txHash && (
            <p className="mt-2 break-all font-mono text-xs text-ink-dim">Transaction hash: {deposit.txHash}</p>
          )}
          {deposit.method === "BANK" && deposit.reference && (
            <p className="mt-2 break-all font-mono text-xs text-ink-dim">UTR: {deposit.reference}</p>
          )}
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-500/35 bg-gold-600/8 px-2.5 py-1 text-xs text-gold-300">
          <Clock3 className="size-3" aria-hidden /> Pending
        </span>
      </div>

      <div className={`mt-5 grid gap-5 ${deposit.method === "CASH" ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
        <AdminActionForm
          action={adminConfirmDeposit}
          submitLabel="Confirm funds received"
          pendingLabel="Confirming…"
          confirmMessage={
            crypto
              ? "Confirm that the company wallet received this USDT? It will move directly into the weekend queue."
              : "Confirm that the INR was received? It will wait for conversion to USDT before entering the queue."
          }
        >
          <input type="hidden" name="id" value={deposit.id} />
          <div className="flex min-h-10 items-start gap-2 rounded-lg border border-positive/20 bg-positive/5 px-3 py-2 text-xs leading-relaxed text-ink-dim">
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-positive" aria-hidden />
            {crypto
              ? "Verified USDT enters the company-wallet queue immediately."
              : "Verified INR waits for the conversion batch in step 2."}
          </div>
        </AdminActionForm>

        <AdminActionForm action={adminRejectDeposit} submitLabel="Reject" variant="danger" pendingLabel="Rejecting…">
          <input type="hidden" name="id" value={deposit.id} />
          <label className="block text-xs uppercase tracking-[0.14em] text-ink-dim" htmlFor={`reject-${deposit.id}`}>
            Reason shown to investor
          </label>
          <input id={`reject-${deposit.id}`} name="note" placeholder="e.g. no matching payment found" className={inputClass} />
        </AdminActionForm>

        {deposit.method !== "CASH" && (
          <AdminActionForm
            action={adminRequestDepositCorrection}
            submitLabel="Request correction"
            variant="ghost"
            pendingLabel="Requesting…"
            confirmMessage="Request corrected payment details from this investor?"
          >
            <input type="hidden" name="id" value={deposit.id} />
            <label className="block text-xs uppercase tracking-[0.14em] text-ink-dim" htmlFor={`correction-${deposit.id}`}>
              What needs correction?
            </label>
            <input
              id={`correction-${deposit.id}`}
              name="note"
              placeholder={deposit.method === "BANK" ? "e.g. UTR does not match" : "e.g. transaction hash not found"}
              required
              className={inputClass}
            />
          </AdminActionForm>
        )}
      </div>
    </article>
  );
}
