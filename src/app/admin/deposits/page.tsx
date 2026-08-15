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
  { value: "BANK", label: "Bank transfer", navLabel: "Bank" },
  { value: "CASH", label: "Cash", navLabel: "Cash" },
  { value: "CRYPTO", label: "Crypto", navLabel: "Crypto" },
] as const;

const conversionMethods = methods.filter((method) => method.value !== "CRYPTO");

type DepositMethod = (typeof methods)[number]["value"];
type ConversionMethod = Exclude<DepositMethod, "CRYPTO">;

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
  searchParams: Promise<{
    approvalMethod?: string | string[];
    conversionMethod?: string | string[];
  }>;
};

function depositHref(
  approvalMethod: DepositMethod,
  conversionMethod: ConversionMethod,
): string {
  const params = new URLSearchParams({ approvalMethod, conversionMethod });
  return `/admin/deposits?${params.toString()}`;
}

export default async function AdminDepositsPage({ searchParams }: Props) {
  const query = await searchParams;
  const requestedApprovalMethod =
    typeof query.approvalMethod === "string" ? query.approvalMethod : undefined;
  const requestedConversionMethod =
    typeof query.conversionMethod === "string" ? query.conversionMethod : undefined;
  const approvalMethod: DepositMethod = isMethod(requestedApprovalMethod)
    ? requestedApprovalMethod
    : "BANK";
  const conversionMethod: ConversionMethod =
    requestedConversionMethod === "CASH" ? "CASH" : "BANK";
  const approvalMeta =
    methods.find((method) => method.value === approvalMethod) ?? methods[0];

  const [approvalCounts, conversionCounts, pending, conversionReady, queuedDeposits] =
    await Promise.all([
      Promise.all(
        methods.map(async (method) => ({
          method: method.value,
          count: await prisma.deposit.count({
            where: { method: method.value, status: "PENDING" },
          }),
        })),
      ),
      Promise.all(
        conversionMethods.map(async (method) => ({
          method: method.value,
          count: await prisma.deposit.count({
            where: { method: method.value, status: "RECEIVED" },
          }),
        })),
      ),
      prisma.deposit.findMany({
        where: { method: approvalMethod, status: "PENDING" },
        orderBy: { createdAt: "asc" },
        include: { user: { select: { fullName: true } } },
      }),
      prisma.deposit.findMany({
        where: { method: conversionMethod, status: "RECEIVED" },
        orderBy: { createdAt: "asc" },
        include: { user: { select: { fullName: true } } },
      }),
      prisma.deposit.findMany({
        where: { status: "QUEUED" },
        orderBy: { createdAt: "asc" },
        include: { user: { select: { fullName: true } } },
      }),
    ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="eyebrow">Money in</p>
        <h1 className="mt-2 font-serif text-3xl text-ink">
          Deposit <em className="gold-text italic">operations</em>
        </h1>
      </header>

      <section className="glass-card rounded-2xl p-4 sm:p-5">
        <StageHeader
          number="1"
          title="Step 1 - Approval"
          count={pending.length}
          attention={pending.length > 0}
        />
        <StageMethodTabs
          className="mt-4"
          methods={methods}
          counts={approvalCounts}
          selectedMethod={approvalMethod}
          hrefFor={(method) => depositHref(method, conversionMethod)}
          label="Approval method filters"
        />
        {pending.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-gold-600/20 px-4 py-3 text-center text-sm text-ink-faint">
            No {approvalMeta.label.toLowerCase()} deposits need approval.
          </p>
        ) : (
          <DepositReviewTable deposits={pending} />
        )}
      </section>

      <section className="glass-card rounded-2xl border-gold-500/20 p-4 sm:p-5">
        <StageHeader
          number="2"
          title="Step 2 - INR to USDT Conversion"
          count={conversionReady.length}
          suffix="ready"
          attention={conversionReady.length > 0}
        />
        <StageMethodTabs
          className="mt-4"
          methods={conversionMethods}
          counts={conversionCounts}
          selectedMethod={conversionMethod}
          hrefFor={(method) => depositHref(approvalMethod, method as ConversionMethod)}
          label="INR conversion method filters"
        />
        <div className="mt-4">
          <BulkDepositAllocationForm
            key={`${conversionMethod}-${conversionReady.map((deposit) => deposit.id).join("-")}`}
            method={conversionMethod}
            deposits={conversionReady.map((deposit) => ({
              id: deposit.id,
              investor: deposit.user.fullName ?? "Unnamed investor",
              sourceAmount: String(sourceAmount(deposit)),
            }))}
          />
        </div>
      </section>

      <section className="glass-card rounded-2xl border-gold-500/30 p-4 sm:p-5">
        <StageHeader
          number="3"
          title="Step 3 - Broker Deposit"
          count={queuedDeposits.length}
          suffix="queued"
          attention={queuedDeposits.length > 0}
        />
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

function StageHeader({
  number,
  title,
  count,
  suffix,
  attention,
}: {
  number: string;
  title: string;
  count: number;
  suffix?: string;
  attention: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-gold-500/35 bg-gold-600/10 font-mono text-xs text-gold-300">
          {number}
        </span>
        <h2 className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-blue-700 sm:text-sm">
          {title}
        </h2>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full border px-3 py-1 font-mono text-xs font-semibold",
          attention
            ? "border-blue-600 bg-blue-600 text-white"
            : "border-slate-200 bg-slate-100 text-ink-faint",
        )}
      >
        {count}{suffix ? ` ${suffix}` : ""}
      </span>
    </div>
  );
}

function StageMethodTabs<TMethod extends DepositMethod>({
  className,
  methods: stageMethods,
  counts,
  selectedMethod,
  hrefFor,
  label,
}: {
  className?: string;
  methods: readonly { value: TMethod; navLabel: string }[];
  counts: readonly { method: string; count: number }[];
  selectedMethod: TMethod;
  hrefFor: (method: TMethod) => string;
  label: string;
}) {
  return (
    <nav className={cn("grid gap-2", stageMethods.length === 3 ? "grid-cols-3" : "grid-cols-2", className)} aria-label={label}>
      {stageMethods.map((method) => {
        const count = counts.find((item) => item.method === method.value)?.count ?? 0;
        const selected = selectedMethod === method.value;
        return (
          <Link
            key={method.value}
            href={hrefFor(method.value)}
            className={cn(
              "flex min-w-0 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors",
              selected
                ? "border-blue-500 bg-blue-100 text-blue-800"
                : "border-slate-200 bg-white text-ink hover:border-blue-300 hover:bg-blue-50",
            )}
            aria-current={selected ? "page" : undefined}
          >
            <span className="truncate">{method.navLabel}</span>
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-semibold",
                count > 0
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-200 bg-slate-100 text-ink-faint",
              )}
              aria-label={`${count} requests`}
            >
              {count}
            </span>
          </Link>
        );
      })}
    </nav>
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
