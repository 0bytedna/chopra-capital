import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/cn";
import { formatInr, formatUsdt } from "@/lib/money";

export const metadata: Metadata = { title: "Admin · Transactions" };

const transactionTypes = ["DEPOSITS", "WITHDRAWALS"] as const;
const methods = ["ALL", "BANK", "CRYPTO", "CASH"] as const;
const depositStatuses = [
  { value: "ALL", label: "All" },
  { value: "NEEDS_CORRECTION", label: "Action needed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CONFIRMED", label: "Invested" },
] as const;
const withdrawalStatuses = [
  { value: "ALL", label: "All" },
  { value: "PROCESSED", label: "Paid" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REJECTED", label: "Rejected" },
] as const;

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

function href(type: TransactionType, method: Method, status: string) {
  const params = new URLSearchParams({ type, method, status });
  return `/admin/transactions?${params.toString()}`;
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
    return "border-slate-300 bg-slate-100 text-ink-faint";
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

  const deposits =
    selectedType === "DEPOSITS"
      ? await prisma.deposit.findMany({
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
      : [];

  const withdrawals =
    selectedType === "WITHDRAWALS"
      ? await prisma.withdrawal.findMany({
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
      : [];

  const activeStatus =
    selectedType === "DEPOSITS"
      ? selectedDepositStatus
      : selectedWithdrawalStatus;
  const statusFilters =
    selectedType === "DEPOSITS" ? depositStatuses : withdrawalStatuses;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="eyebrow">Account activity</p>
        <h1 className="mt-2 font-serif text-3xl text-ink">
          <em className="gold-text italic">Transactions</em>
        </h1>
      </header>

      <nav
        className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-white p-1"
        aria-label="Transaction type"
      >
        <Link
          href={href("DEPOSITS", selectedMethod, "ALL")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            selectedType === "DEPOSITS"
              ? "bg-blue-100 text-blue-700"
              : "text-ink-dim hover:bg-slate-50",
          )}
          aria-current={selectedType === "DEPOSITS" ? "page" : undefined}
        >
          <ArrowDownToLine className="size-4" aria-hidden />
          Deposits
        </Link>
        <Link
          href={href("WITHDRAWALS", selectedMethod, "ALL")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            selectedType === "WITHDRAWALS"
              ? "bg-blue-100 text-blue-700"
              : "text-ink-dim hover:bg-slate-50",
          )}
          aria-current={selectedType === "WITHDRAWALS" ? "page" : undefined}
        >
          <ArrowUpFromLine className="size-4" aria-hidden />
          Withdrawals
        </Link>
      </nav>

      <section className="glass-card space-y-3 rounded-2xl p-3 sm:p-4">
        <nav className="grid grid-cols-4 gap-1.5" aria-label="Transaction method">
          {methods.map((method) => (
            <Link
              key={method}
              href={href(selectedType, method, activeStatus)}
              className={cn(
                "min-w-0 truncate rounded-lg border px-2 py-2 text-center text-xs transition-colors sm:text-sm",
                selectedMethod === method
                  ? "border-blue-300 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-ink-dim",
              )}
              aria-current={selectedMethod === method ? "page" : undefined}
            >
              {method === "ALL" ? "All methods" : methodLabel(method)}
            </Link>
          ))}
        </nav>

        <nav
          className="flex gap-2 overflow-x-auto pb-1"
          aria-label="Transaction status"
        >
          {statusFilters.map((filter) => (
            <Link
              key={filter.value}
              href={href(selectedType, selectedMethod, filter.value)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors",
                activeStatus === filter.value
                  ? "border-blue-300 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-ink-dim",
              )}
            >
              {filter.label}
            </Link>
          ))}
        </nav>
      </section>

      {selectedType === "DEPOSITS" ? (
        deposits.length === 0 ? (
          <EmptyState>No matching deposit transactions.</EmptyState>
        ) : (
          <ul className="space-y-2">
            {deposits.map((deposit) => {
              const sourceAmount =
                deposit.method === "CRYPTO"
                  ? `${formatUsdt(deposit.reportedUsdtAmount ?? deposit.amount)} USDT`
                  : `${formatInr(deposit.inrAmount ?? 0)} INR`;
              const detail =
                deposit.method === "BANK" && deposit.reference
                  ? ` · UTR ${deposit.reference}`
                  : deposit.method === "CRYPTO" && deposit.network
                    ? ` · ${deposit.network}`
                    : "";
              return (
                <li
                  key={deposit.id}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3"
                >
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
                    {detail}
                  </p>
                  <p className="mt-1 text-xs text-ink-faint">
                    {dateLabel(deposit.createdAt)}
                    {deposit.status === "CONFIRMED"
                      ? ` · ${formatUsdt(deposit.amount)} USDT invested`
                      : ""}
                    {deposit.adminNote ? ` · ${deposit.adminNote}` : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        )
      ) : withdrawals.length === 0 ? (
        <EmptyState>No matching withdrawal transactions.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {withdrawals.map((withdrawal) => {
            const paid =
              withdrawal.status === "PROCESSED"
                ? withdrawal.method === "CRYPTO"
                  ? ` · ${formatUsdt(withdrawal.paidAmount ?? 0)} USDT paid`
                  : ` · ${formatInr(withdrawal.paidInrAmount ?? 0)} INR paid`
                : "";
            return (
              <li
                key={withdrawal.id}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3"
              >
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
                  {paid}
                  {withdrawal.adminNote ? ` · ${withdrawal.adminNote}` : ""}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-ink-faint">
      {children}
    </p>
  );
}
