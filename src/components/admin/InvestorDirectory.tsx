"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, RotateCcw, Search, ShieldCheck, Trash2 } from "lucide-react";
import { adminDeleteInvestor, type AdminFormState } from "@/app/admin/actions";
import { cn } from "@/lib/cn";

type KycState = "NOT_SUBMITTED" | "PENDING" | "APPROVED" | "REJECTED";
type BalanceFilter = "ALL" | "FUNDED" | "ZERO";

export type InvestorDirectoryRow = {
  id: string;
  name: string;
  email: string;
  mobile: string;
  kyc: KycState;
  balance: number;
  share: number;
  isCompanyAccount: boolean;
};


function DeleteInvestorButton({ userId, name }: { userId: string; name: string }) {
  const [state, action] = useActionState<AdminFormState, FormData>(adminDeleteInvestor, {});
  return (
    <form
      action={action}
      onClick={(event) => event.stopPropagation()}
      onSubmit={(event) => {
        if (!window.confirm(`Permanently delete ${name}? This also removes all linked history and cannot be undone.`)) event.preventDefault();
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <button type="submit" className="inline-flex size-8 items-center justify-center rounded-md border border-negative/25 text-negative transition-colors hover:bg-negative/10" aria-label={`Delete ${name}`} title={state.error ?? `Delete ${name}`}>
        <Trash2 className="size-3.5" aria-hidden />
      </button>
    </form>
  );
}
const kycDetails: Record<KycState, { label: string; className: string }> = {
  NOT_SUBMITTED: {
    label: "Not submitted",
    className: "border-ink-faint/25 bg-ink/5 text-ink-faint",
  },
  PENDING: {
    label: "In review",
    className: "border-gold-500/30 bg-gold-500/10 text-gold-300",
  },
  APPROVED: {
    label: "Verified",
    className: "border-positive/30 bg-positive/10 text-positive",
  },
  REJECTED: {
    label: "Rejected",
    className: "border-negative/30 bg-negative/10 text-negative",
  },
};

function formatUsd(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function KycBadge({ state }: { state: KycState }) {
  const details = kycDetails[state];
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        details.className,
      )}
    >
      <ShieldCheck className="size-3" aria-hidden />
      {details.label}
    </span>
  );
}

const controlClass =
  "h-10 rounded-lg border border-gold-600/15 bg-vault-950/70 px-3 text-sm text-ink focus:border-gold-500/45 focus:outline-none focus:ring-2 focus:ring-gold-500/15";

export function InvestorDirectory({ rows }: { rows: InvestorDirectoryRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [kycFilter, setKycFilter] = useState<"ALL" | KycState>("ALL");
  const [balanceFilter, setBalanceFilter] = useState<BalanceFilter>("ALL");

  const filteredRows = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return rows.filter((row) => {
      const matchesSearch =
        !term ||
        row.name.toLocaleLowerCase().includes(term) ||
        row.email.toLocaleLowerCase().includes(term) ||
        row.mobile.toLocaleLowerCase().includes(term);
      const matchesKyc = kycFilter === "ALL" || row.kyc === kycFilter;
      const matchesBalance =
        balanceFilter === "ALL" ||
        (balanceFilter === "FUNDED" ? row.balance > 0 : row.balance <= 0);
      return matchesSearch && matchesKyc && matchesBalance;
    });
  }, [balanceFilter, kycFilter, query, rows]);

  const filtersActive = query.trim() !== "" || kycFilter !== "ALL" || balanceFilter !== "ALL";

  function resetFilters() {
    setQuery("");
    setKycFilter("ALL");
    setBalanceFilter("ALL");
  }

  function openInvestor(id: string) {
    router.push(`/admin/investors/${id}`);
  }

  return (
    <section className="space-y-4" aria-labelledby="investor-list-heading">
      <div className="glass-card rounded-xl p-3 sm:p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(16rem,1fr)_11rem_11rem_auto] md:items-end">
          <label className="space-y-1.5">
            <span className="block text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              Search investors
            </span>
            <span className="relative block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Name, email or phone"
                suppressHydrationWarning
                className={cn(controlClass, "w-full pl-9")}
              />
            </span>
          </label>

          <label className="space-y-1.5">
            <span className="block text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              KYC status
            </span>
            <select
              value={kycFilter}
              onChange={(event) => setKycFilter(event.target.value as "ALL" | KycState)}
              className={cn(controlClass, "w-full")}
            >
              <option value="ALL">All statuses</option>
              <option value="APPROVED">Verified</option>
              <option value="PENDING">In review</option>
              <option value="NOT_SUBMITTED">Not submitted</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="block text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              Balance
            </span>
            <select
              value={balanceFilter}
              onChange={(event) => setBalanceFilter(event.target.value as BalanceFilter)}
              className={cn(controlClass, "w-full")}
            >
              <option value="ALL">All balances</option>
              <option value="FUNDED">Funded accounts</option>
              <option value="ZERO">Zero balance</option>
            </select>
          </label>

          <button
            type="button"
            onClick={resetFilters}
            disabled={!filtersActive}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gold-600/20 px-3 text-xs font-medium text-ink-dim transition-colors hover:border-gold-500/40 hover:text-ink disabled:cursor-not-allowed disabled:opacity-35"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Clear
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <h2 id="investor-list-heading" className="text-sm font-medium text-ink">
          Investor accounts
        </h2>
        <p className="text-xs text-ink-faint" aria-live="polite">
          Showing {filteredRows.length} of {rows.length}
        </p>
      </div>

      <div className="glass-card overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[70rem] table-fixed text-left">
            <colgroup>
              <col className="w-[17%]" />
              <col className="w-[23%]" />
              <col className="w-[15%]" />
              <col className="w-[15%]" />
              <col className="w-[14%]" />
              <col className="w-[12%]" />
              <col className="w-[4%]" />
            </colgroup>
            <thead className="border-b border-gold-600/15 bg-black/10">
              <tr className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                <th scope="col" className="px-5 py-3 font-medium">Name</th>
                <th scope="col" className="px-5 py-3 font-medium">Email</th>
                <th scope="col" className="px-5 py-3 font-medium">Phone</th>
                <th scope="col" className="px-5 py-3 font-medium">Balance</th>
                <th scope="col" className="px-5 py-3 font-medium">KYC status</th>
                <th scope="col" className="px-5 py-3 font-medium">Pool share</th>
                <th scope="col" className="px-3 py-3 font-medium">
                  <span className="sr-only">Open investor</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold-600/10">
              {filteredRows.map((row) => (
                <tr
                  key={row.id}
                  tabIndex={0}
                  role="link"
                  onClick={() => openInvestor(row.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openInvestor(row.id);
                    }
                  }}
                  className="group cursor-pointer text-sm transition-colors hover:bg-gold-600/6 focus:bg-gold-600/6 focus:outline-none"
                  aria-label={`Open complete investor record for ${row.name}`}
                >
                                    <td className="px-5 py-4">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-medium text-ink">{row.name}</span>
                      {row.isCompanyAccount && (
                        <span className="shrink-0 rounded-full border border-gold-500/30 bg-gold-600/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-gold-300">
                          Company
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="truncate px-5 py-4 text-xs text-ink-dim" title={row.email}>
                    {row.email}
                  </td>
                  <td className="truncate px-5 py-4 text-xs text-ink-dim" title={row.mobile}>
                    {row.mobile}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 font-mono text-ink">
                    {formatUsd(row.balance)}
                  </td>
                  <td className="px-5 py-4">
                    <KycBadge state={row.kyc} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 font-mono text-ink">
                    {row.share.toFixed(2)}%
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex items-center gap-2">
                      <DeleteInvestorButton userId={row.id} name={row.name} />
                      <ArrowUpRight className="size-4 text-ink-faint transition-colors group-hover:text-gold-400" aria-hidden />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRows.length === 0 && (
          <div className="border-t border-gold-600/10 px-5 py-12 text-center">
            <Search className="mx-auto size-5 text-ink-faint" aria-hidden />
            <p className="mt-3 text-sm text-ink">No investors match these filters.</p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-2 text-xs text-gold-400 transition-colors hover:text-gold-300"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </section>
  );
}