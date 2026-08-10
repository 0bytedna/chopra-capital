import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatInr, formatUsdt } from "@/lib/money";
import { cn } from "@/lib/cn";
import { BulkDepositAllocationForm } from "@/components/admin/BulkDepositAllocationForm";
import { BrokerTransferForm } from "@/components/admin/BrokerTransferForm";
import { DepositReviewActions } from "@/components/admin/ReviewDecisionButtons";
import { adminConfirmDeposit, adminRejectDeposit, adminRequestDepositCorrection } from "../actions";

export const metadata: Metadata = { title: "Admin · Deposits" };

const methods = [
  { value: "BANK", label: "Bank transfer", navLabel: "Bank", source: "INR received" },
  { value: "CRYPTO", label: "Crypto", navLabel: "Crypto", source: "USDT received" },
  { value: "CASH", label: "Cash", navLabel: "Cash", source: "INR received" },
] as const;



type DepositMethod = (typeof methods)[number]["value"];

function isMethod(value: string | undefined): value is DepositMethod {
  return methods.some((method) => method.value === value);
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
    ? formatUsdt(amount) + " USDT"
    : formatInr(amount) + " INR";
}
type Props = {
  searchParams: Promise<{ method?: string | string[] }>;
};

export default async function AdminDepositsPage({ searchParams }: Props) {
  const query = await searchParams;
  const requestedMethod = typeof query.method === "string" ? query.method : undefined;
  const selectedMethod: DepositMethod = isMethod(requestedMethod) ? requestedMethod : "BANK";
  const methodMeta = methods.find((method) => method.value === selectedMethod) ?? methods[0];

  const [methodCounts, activeDeposits, queuedDeposits] =
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
        include: { user: { select: { fullName: true, kycStatus: true } } },
      }),
      prisma.deposit.findMany({
        where: { status: "QUEUED" },
        orderBy: { createdAt: "asc" },
        include: { user: { select: { fullName: true } } },
      }),
    ]);

  const pending = activeDeposits.filter((deposit) => deposit.status === "PENDING");
  const conversionReady = activeDeposits.filter((deposit) => deposit.status === "RECEIVED");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="eyebrow">Money in</p>
        <h1 className="mt-2 font-serif text-3xl text-ink">
          Deposit <em className="gold-text italic">operations</em>
        </h1>

      </header>

      <nav className="grid grid-cols-3 gap-2" aria-label="Deposit method sections">
        {methods.map((method) => {
          const count = methodCounts.find((item) => item.method === method.value)?.count ?? 0;
          return (
            <Link
              key={method.value}
              href={`/admin/deposits?method=${method.value}`}
              className={cn(
                "flex min-w-0 items-center justify-between gap-2 rounded-xl border px-3 py-3 transition-colors",
                selectedMethod === method.value
                  ? "border-gold-500/55 bg-gold-600/12"
                  : "border-gold-600/15 bg-vault-900/45 hover:border-gold-600/35",
              )}
              aria-current={selectedMethod === method.value ? "page" : undefined}
            >
              <span className="min-w-0">
                <span className="block truncate text-xs font-medium text-ink sm:text-sm">{method.navLabel}</span>
              </span>
              <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full border font-mono text-sm font-semibold", count > 0 ? "border-gold-600 bg-gold-600 text-white" : "border-slate-200 bg-slate-100 text-ink-faint")} aria-label={`${count} active requests`}>
                {count}
              </span>
            </Link>
          );
        })}
      </nav>

      <section className="glass-card rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-full border border-gold-500/35 bg-gold-600/10 font-mono text-xs text-gold-300">1</span>
              <p className="eyebrow">Step 1</p>
            </div>
          </div>
          <span className={cn("flex size-10 items-center justify-center rounded-full border font-mono text-lg font-semibold", pending.length > 0 ? "border-gold-600 bg-gold-600 text-white" : "border-slate-200 bg-slate-100 text-ink-faint")}>{pending.length}</span>
        </div>

        {pending.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-gold-600/20 px-4 py-3 text-center text-sm text-ink-faint">
            No {methodMeta.label.toLowerCase()} deposits need receipt verification.
          </p>
        ) : (
          <DepositReviewTable deposits={pending} />

        )}
      </section>

      {selectedMethod !== "CRYPTO" && (
        <>

          <section className="glass-card rounded-2xl border-gold-500/20 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-full border border-gold-500/35 bg-gold-600/10 font-mono text-xs text-gold-300">2</span>
                  <p className="eyebrow">Step 2</p>
                </div>
              </div>
              <span className="rounded-full border border-positive/25 bg-positive/5 px-3 py-1 font-mono text-xs text-positive">
                {conversionReady.length} ready
              </span>
            </div>
            <div className="mt-4">
              <BulkDepositAllocationForm
                key={`${selectedMethod}-${conversionReady.map((deposit) => deposit.id).join("-")}`}
                method={selectedMethod}
                deposits={conversionReady.map((deposit) => ({
                  id: deposit.id,
                  investor: deposit.user.fullName ?? "Unnamed investor",
                  sourceAmount: String(sourceAmount(deposit)),
                }))}
              />
            </div>
          </section>
        </>
      )}


      <section className="glass-card rounded-2xl border-gold-500/30 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-full border border-gold-500/35 bg-gold-600/10 font-mono text-xs text-gold-300">
                {selectedMethod === "CRYPTO" ? "2" : "3"}
              </span>
              <p className="eyebrow">Step {selectedMethod === "CRYPTO" ? "2" : "3"}</p>
            </div>
          </div>
          <span className="rounded-full border border-gold-500/30 bg-gold-600/8 px-3 py-1 font-mono text-xs text-gold-300">
            {queuedDeposits.length} queued
          </span>
        </div>
        <div className="mt-4">
          <BrokerTransferForm
            key={queuedDeposits.map((deposit) => deposit.id).join("-")}
            deposits={queuedDeposits.map((deposit) => ({
              id: deposit.id,
              investor: deposit.user.fullName ?? "Unnamed investor",
              method: deposit.method,
              queuedAmount: String(deposit.queuedUsdtAmount ?? 0),
            }))}
          />
        </div>
      </section>

    </div>
  );
}

function DepositReviewTable({
  deposits,
}: {
  deposits: Array<{
    id: string;
    method: DepositMethod;
    amount: Parameters<typeof formatUsdt>[0];
    reportedUsdtAmount: Parameters<typeof formatUsdt>[0] | null;
    inrAmount: Parameters<typeof formatInr>[0] | null;
    network: string | null;
    txHash: string | null;
    reference: string | null;
    user: { fullName: string | null };
  }>;
}) {
  return (
    <div className="mt-5 overflow-x-auto rounded-xl border border-gold-600/15 bg-white">
      <table className="w-full min-w-[600px] border-collapse text-left">
        <thead className="bg-vault-950/45 text-xs uppercase tracking-[0.12em] text-ink-dim">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">Investor</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Amount</th>
            <th scope="col" className="px-4 py-3 font-medium">Payment reference</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Decision</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gold-600/10">
          {deposits.map((deposit) => {
            const reference =
              deposit.method === "CRYPTO"
                ? deposit.txHash
                  ? `${deposit.network ?? "USDT"} · ${deposit.txHash}`
                  : `${deposit.network ?? "USDT"} · No hash supplied`
                : deposit.method === "BANK"
                  ? deposit.reference
                    ? `UTR ${deposit.reference}`
                    : "UTR missing"
                  : "Cash request";

            return (
              <tr key={deposit.id} className="hover:bg-vault-950/25">
                <td className="px-4 py-3">
                  <p className="whitespace-nowrap text-[clamp(0.72rem,3.2vw,0.875rem)] font-medium text-ink">
                    {deposit.user.fullName ?? "Unnamed investor"}
                  </p>
                </td>
                <td className="currency-value whitespace-nowrap px-4 py-3 text-right text-[clamp(0.7rem,3vw,0.875rem)] text-ink">
                  {sourceAmountLabel(deposit)}
                </td>
                <td className="max-w-64 px-4 py-3">
                  <p className="truncate font-mono text-xs text-ink" title={reference}>
                    {reference}
                  </p>
                </td>

                <td className="px-4 py-3">
                  <DepositReviewActions
                    id={deposit.id}
                    method={deposit.method}
                    approveAction={adminConfirmDeposit}
                    correctionAction={adminRequestDepositCorrection}
                    rejectAction={adminRejectDeposit}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

    </div>
  );
}
