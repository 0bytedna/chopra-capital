import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/cn";
import { formatInr, formatUsdt } from "@/lib/money";
import { TransactionBatchEditAction } from "@/components/admin/TransactionBatchEditAction";

export const metadata: Metadata = { title: "Admin · Transactions" };

const transactionTypes = [
  "DEPOSITS",
  "WITHDRAWALS",
  "CONVERSIONS",
  "BROKER",
] as const;
const methods = ["ALL", "BANK", "CRYPTO", "CASH"] as const;
const depositStatuses = [
  { value: "ALL", label: "All statuses" },
  { value: "NEEDS_CORRECTION", label: "Action needed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CONFIRMED", label: "Invested" },
] as const;
const withdrawalStatuses = [
  { value: "ALL", label: "All statuses" },
  { value: "PROCESSED", label: "Paid" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REJECTED", label: "Rejected" },
] as const;

const typeLabels = {
  DEPOSITS: "Deposits",
  WITHDRAWALS: "Withdrawals",
  CONVERSIONS: "Conversions",
  BROKER: "Broker",
} as const;

type TransactionType = (typeof transactionTypes)[number];
type Method = (typeof methods)[number];
type DepositHistoryStatus = (typeof depositStatuses)[number]["value"];
type WithdrawalHistoryStatus = (typeof withdrawalStatuses)[number]["value"];

type Props = {
  searchParams: Promise<{
    type?: string | string[];
    method?: string | string[];
    status?: string | string[];
  }>;
};

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function isTransactionType(value: string | undefined): value is TransactionType {
  return transactionTypes.some((item) => item === value);
}

function isMethod(value: string | undefined): value is Method {
  return methods.some((item) => item === value);
}

function isDepositStatus(value: string | undefined): value is DepositHistoryStatus {
  return depositStatuses.some((item) => item.value === value);
}

function isWithdrawalStatus(
  value: string | undefined,
): value is WithdrawalHistoryStatus {
  return withdrawalStatuses.some((item) => item.value === value);
}

function typeHref(type: TransactionType) {
  return `/admin/transactions?type=${type}`;
}

function methodLabel(method: Exclude<Method, "ALL">) {
  if (method === "BANK") return "Bank transfer";
  if (method === "CRYPTO") return "Crypto";
  return "Cash";
}

function statusLabel(status: string) {
  if (status === "NEEDS_CORRECTION") return "action needed";
  if (status === "CONFIRMED") return "invested";
  if (status === "PROCESSED") return "paid";
  return status.toLowerCase();
}

function statusClass(status: string) {
  if (status === "CONFIRMED" || status === "PROCESSED") {
    return "border-positive/25 bg-positive/8 text-positive";
  }
  if (status === "CANCELLED") {
    return "border-stone-300 bg-stone-100 text-ink-faint";
  }
  return "border-negative/25 bg-negative/8 text-negative";
}

function dateLabel(value: Date) {
  return value.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function groupByMonth<T>(items: T[], getDate: (item: T) => Date) {
  const groups = new Map<string, { label: string; items: T[] }>();
  for (const item of items) {
    const date = getDate(item);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const current = groups.get(key);
    if (current) {
      current.items.push(item);
    } else {
      groups.set(key, {
        label: date.toLocaleDateString("en-IN", {
          month: "long",
          year: "numeric",
        }),
        items: [item],
      });
    }
  }
  return Array.from(groups.entries()).map(([key, group]) => ({ key, ...group }));
}

export default async function AdminTransactionsPage({ searchParams }: Props) {
  const query = await searchParams;
  const requestedType = one(query.type);
  const requestedMethod = one(query.method);
  const requestedStatus = one(query.status);
  const selectedType: TransactionType = isTransactionType(requestedType)
    ? requestedType
    : "DEPOSITS";
  const selectedMethod: Method = isMethod(requestedMethod)
    ? requestedMethod
    : "ALL";
  const conversionMethod =
    selectedMethod === "BANK" || selectedMethod === "CASH"
      ? selectedMethod
      : "ALL";
  const selectedDepositStatus: DepositHistoryStatus = isDepositStatus(
    requestedStatus,
  )
    ? requestedStatus
    : "ALL";
  const selectedWithdrawalStatus: WithdrawalHistoryStatus = isWithdrawalStatus(
    requestedStatus,
  )
    ? requestedStatus
    : "ALL";

  const [deposits, withdrawals, conversionBatches, brokerBatches] =
    await Promise.all([
      selectedType === "DEPOSITS"
        ? prisma.deposit.findMany({
            where: {
              method: selectedMethod === "ALL" ? undefined : selectedMethod,
              status:
                selectedDepositStatus === "ALL"
                  ? {
                      in: [
                        "NEEDS_CORRECTION",
                        "CANCELLED",
                        "REJECTED",
                        "CONFIRMED",
                      ],
                    }
                  : selectedDepositStatus,
            },
            orderBy: { createdAt: "desc" },
            take: 100,
            include: { user: { select: { email: true, fullName: true } } },
          })
        : Promise.resolve([]),
      selectedType === "WITHDRAWALS"
        ? prisma.withdrawal.findMany({
            where: {
              method: selectedMethod === "ALL" ? undefined : selectedMethod,
              status:
                selectedWithdrawalStatus === "ALL"
                  ? { in: ["PROCESSED", "REJECTED", "CANCELLED"] }
                  : selectedWithdrawalStatus,
            },
            orderBy: { createdAt: "desc" },
            take: 100,
            include: { user: { select: { email: true, fullName: true } } },
          })
        : Promise.resolve([]),
      selectedType === "CONVERSIONS"
        ? prisma.depositAllocationBatch.findMany({
            where: {
              method:
                conversionMethod === "ALL"
                  ? { in: ["BANK", "CASH"] }
                  : conversionMethod,
            },
            orderBy: { createdAt: "desc" },
            take: 100,
            include: {
              admin: { select: { fullName: true, email: true } },
              _count: { select: { deposits: true } },
            },
          })
        : Promise.resolve([]),
      selectedType === "BROKER"
        ? prisma.brokerTransferBatch.findMany({
            orderBy: { createdAt: "desc" },
            take: 100,
            include: {
              admin: { select: { fullName: true, email: true } },
              _count: { select: { deposits: true } },
            },
          })
        : Promise.resolve([]),
    ]);

  const selectedStatus =
    selectedType === "DEPOSITS"
      ? selectedDepositStatus
      : selectedWithdrawalStatus;
  const statusFilters =
    selectedType === "DEPOSITS" ? depositStatuses : withdrawalStatuses;
  const activeMethod =
    selectedType === "CONVERSIONS" ? conversionMethod : selectedMethod;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <h1 className="font-serif text-3xl text-ink">
          <em className="gold-text italic">Transactions</em>
        </h1>
      </header>

      <nav
        className="grid grid-cols-4 gap-1 rounded-xl border border-stone-200 bg-white p-1"
        aria-label="Transaction history category"
      >
        {transactionTypes.map((type) => (
          <Link
            key={type}
            href={typeHref(type)}
            className={cn(
              "min-w-0 truncate rounded-lg px-1.5 py-2.5 text-center text-[11px] font-medium transition-colors sm:px-3 sm:text-sm",
              selectedType === type
                ? "bg-gold-100 text-gold-700"
                : "text-ink-dim hover:bg-stone-50",
            )}
            aria-current={selectedType === type ? "page" : undefined}
            title={typeLabels[type]}
          >
            {typeLabels[type]}
          </Link>
        ))}
      </nav>

      {selectedType !== "BROKER" && (
        <form
          action="/admin/transactions"
          method="get"
          className={cn(
            "grid gap-2 rounded-xl border border-stone-200 bg-white p-2",
            selectedType === "CONVERSIONS"
              ? "grid-cols-[minmax(0,1fr)_auto]"
              : "grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]",
          )}
        >
          <input type="hidden" name="type" value={selectedType} />
          <select
            name="method"
            defaultValue={activeMethod}
            aria-label="Payment method"
            className="min-w-0 rounded-lg border border-stone-200 bg-white px-2 py-2 text-xs text-ink outline-none focus:border-gold-300 sm:text-sm"
          >
            <option value="ALL">All methods</option>
            <option value="BANK">Bank</option>
            {selectedType !== "CONVERSIONS" && (
              <option value="CRYPTO">Crypto</option>
            )}
            <option value="CASH">Cash</option>
          </select>

          {selectedType !== "CONVERSIONS" && (
            <select
              name="status"
              defaultValue={selectedStatus}
              aria-label="Transaction status"
              className="min-w-0 rounded-lg border border-stone-200 bg-white px-2 py-2 text-xs text-ink outline-none focus:border-gold-300 sm:text-sm"
            >
              {statusFilters.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          )}

          <button
            type="submit"
            className="rounded-lg bg-gold-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-gold-700 sm:text-sm"
          >
            Apply
          </button>
        </form>
      )}

      {selectedType === "DEPOSITS" ? (
        deposits.length === 0 ? (
          <EmptyState>No matching deposit transactions.</EmptyState>
        ) : (
          <div className="space-y-5">
            {groupByMonth(deposits, (deposit) => deposit.createdAt).map(
              (group) => (
                <section key={group.key} className="space-y-2">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-dim">
                    {group.label}
                  </h2>
                  <ul className="divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white">
                    {group.items.map((deposit) => {
                      const sourceAmount =
                        deposit.method === "CRYPTO"
                          ? `${formatUsdt(deposit.reportedUsdtAmount ?? deposit.amount)} USDT`
                          : `${formatInr(deposit.inrAmount ?? 0)} INR`;
                      const reference =
                        deposit.method === "BANK" && deposit.reference
                          ? `UTR ${deposit.reference}`
                          : deposit.method === "CRYPTO" && deposit.txHash
                            ? `${deposit.network ?? "USDT"} · ${deposit.txHash}`
                            : null;
                      const details = [
                        reference,
                        deposit.status === "CONFIRMED"
                          ? `${formatUsdt(deposit.amount)} USDT invested`
                          : null,
                        deposit.adminNote,
                      ].filter(Boolean);

                      return (
                        <li key={deposit.id} className="px-3 py-3 sm:px-4">
                          <div className="flex items-center justify-between gap-3">
                            <span className="currency-value min-w-0 truncate text-base text-ink">
                              {sourceAmount}
                            </span>
                            <span
                              className={cn(
                                "shrink-0 rounded-full border px-2.5 py-1 text-xs",
                                statusClass(deposit.status),
                              )}
                            >
                              {statusLabel(deposit.status)}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-sm text-ink-dim">
                            {deposit.user.fullName ?? deposit.user.email} · {methodLabel(deposit.method)}
                          </p>
                          <p className="mt-1 text-xs text-ink-faint">
                            {dateLabel(deposit.createdAt)}
                          </p>
                          {details.length > 0 && (
                            <details className="mt-1.5 text-xs text-ink-dim">
                              <summary className="cursor-pointer select-none text-gold-700">
                                Details
                              </summary>
                              <p className="mt-1 break-all">{details.join(" · ")}</p>
                            </details>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ),
            )}
          </div>
        )
      ) : selectedType === "WITHDRAWALS" ? (
        withdrawals.length === 0 ? (
          <EmptyState>No matching withdrawal transactions.</EmptyState>
        ) : (
          <div className="space-y-5">
            {groupByMonth(
              withdrawals,
              (withdrawal) => withdrawal.processedAt ?? withdrawal.createdAt,
            ).map((group) => (
              <section key={group.key} className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-dim">
                  {group.label}
                </h2>
                <ul className="divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white">
                  {group.items.map((withdrawal) => {
                    const paid =
                      withdrawal.status === "PROCESSED"
                        ? withdrawal.method === "CRYPTO"
                          ? `${formatUsdt(withdrawal.paidAmount ?? 0)} USDT paid`
                          : `${formatInr(withdrawal.paidInrAmount ?? 0)} INR paid`
                        : null;
                    const details = [
                      paid,
                      withdrawal.txHash
                        ? `Reference ${withdrawal.txHash}`
                        : null,
                      withdrawal.adminNote,
                    ].filter(Boolean);

                    return (
                      <li key={withdrawal.id} className="px-3 py-3 sm:px-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="currency-value min-w-0 truncate text-base text-ink">
                            {formatUsdt(withdrawal.amount)} USD
                          </span>
                          <span
                            className={cn(
                              "shrink-0 rounded-full border px-2.5 py-1 text-xs",
                              statusClass(withdrawal.status),
                            )}
                          >
                            {statusLabel(withdrawal.status)}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-sm text-ink-dim">
                          {withdrawal.user.fullName ?? withdrawal.user.email} · {methodLabel(withdrawal.method)}
                        </p>
                        <p className="mt-1 text-xs text-ink-faint">
                          {dateLabel(withdrawal.processedAt ?? withdrawal.createdAt)}
                        </p>
                        {details.length > 0 && (
                          <details className="mt-1.5 text-xs text-ink-dim">
                            <summary className="cursor-pointer select-none text-gold-700">
                              Details
                            </summary>
                            <p className="mt-1 break-all">{details.join(" · ")}</p>
                          </details>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )
      ) : selectedType === "CONVERSIONS" ? (
        conversionBatches.length === 0 ? (
          <EmptyState>No matching INR-to-USDT conversion batches.</EmptyState>
        ) : (
          <div className="space-y-5">
            {groupByMonth(conversionBatches, (batch) => batch.createdAt).map(
              (group) => (
                <section key={group.key} className="space-y-2">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-dim">
                    {group.label}
                  </h2>
                  <ul className="divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white">
                    {group.items.map((batch) => (
                      <li key={batch.id} className="px-3 py-3 sm:px-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="currency-value text-base text-ink">
                            {formatUsdt(batch.totalUsdt)} USDT queued
                          </span>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="rounded-full border border-gold-200 bg-gold-50 px-2.5 py-1 text-xs text-gold-700">
                              {methodLabel(batch.method)}
                            </span>
                            <TransactionBatchEditAction
                              kind="CONVERSION"
                              id={batch.id}
                              currentTotal={batch.totalUsdt.toString()}
                            />
                          </div>
                        </div>
                        <p className="mt-1 text-sm text-ink-dim">
                          {formatInr(batch.totalSourceAmount)} INR · {batch._count.deposits} deposit{batch._count.deposits === 1 ? "" : "s"}
                        </p>
                        <p className="mt-1 text-xs text-ink-faint">
                          {dateLabel(batch.createdAt)} · {batch.admin.fullName ?? batch.admin.email}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              ),
            )}
          </div>
        )
      ) : brokerBatches.length === 0 ? (
        <EmptyState>No broker transfer batches recorded.</EmptyState>
      ) : (
        <div className="space-y-5">
          {groupByMonth(brokerBatches, (batch) => batch.createdAt).map(
            (group) => (
              <section key={group.key} className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-dim">
                  {group.label}
                </h2>
                <ul className="divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white">
                  {group.items.map((batch) => (
                    <li key={batch.id} className="px-3 py-3 sm:px-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="currency-value text-base text-ink">
                          {formatUsdt(batch.totalReceivedUsdt)} USDT invested
                        </p>
                        <TransactionBatchEditAction
                          kind="BROKER"
                          id={batch.id}
                          currentTotal={batch.totalReceivedUsdt.toString()}
                          maximumTotal={batch.totalQueuedUsdt.toString()}
                        />
                      </div>
                      <p className="mt-1 text-sm text-ink-dim">
                        {formatUsdt(batch.totalQueuedUsdt)} queued · fee {formatUsdt(batch.totalQueuedUsdt.sub(batch.totalReceivedUsdt))} · {batch._count.deposits} deposit{batch._count.deposits === 1 ? "" : "s"}
                      </p>
                      <p className="mt-1 text-xs text-ink-faint">
                        NAV {formatUsdt(batch.navPrice)} · {dateLabel(batch.createdAt)} · {batch.admin.fullName ?? batch.admin.email}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-stone-300 bg-white px-4 py-8 text-center text-sm text-ink-faint">
      {children}
    </p>
  );
}