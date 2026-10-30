"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/cn";

export type InvestorAuditEntry = {
  id: string;
  type: "DEPOSIT" | "WITHDRAWAL" | "TRANSFER";
  date: string;
  title: string;
  amount: string;
  status: string;
  method: string;
  reference?: string;
  note?: string;
  tone?: "positive" | "negative" | "neutral";
};

const inputClass = "h-10 min-w-0 rounded-lg border border-stone-300 bg-white px-3 text-sm text-ink";
const PAGE_SIZE = 5;

export function InvestorAuditTrail({ entries }: { entries: InvestorAuditEntry[] }) {
  const [type, setType] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const statuses = useMemo(() => [...new Set(entries.map((entry) => entry.status))].sort(), [entries]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries.filter((entry) => {
      const day = entry.date.slice(0, 10);
      return (type === "ALL" || entry.type === type) &&
        (status === "ALL" || entry.status === status) &&
        (!from || day >= from) && (!to || day <= to) &&
        (!needle || `${entry.title} ${entry.method} ${entry.reference ?? ""} ${entry.note ?? ""}`.toLowerCase().includes(needle));
    });
  }, [entries, from, query, status, to, type]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleEntries = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return <div className="bg-white">
    <div className="grid gap-2 border-b border-stone-200 bg-stone-50 p-3 sm:grid-cols-2 xl:grid-cols-5">
      <label className="relative sm:col-span-2 xl:col-span-1"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-ink-faint" aria-hidden /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search reference or note" className={`${inputClass} w-full pl-9`} /></label>
      <select value={type} onChange={(event) => { setType(event.target.value); setPage(1); }} className={inputClass} aria-label="Transaction type"><option value="ALL">All activity</option><option value="DEPOSIT">Deposits</option><option value="WITHDRAWAL">Withdrawals</option><option value="TRANSFER">Internal transfers</option></select>
      <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className={inputClass} aria-label="Transaction status"><option value="ALL">All statuses</option>{statuses.map((value) => <option key={value} value={value}>{value}</option>)}</select>
      <input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} className={inputClass} aria-label="From date" />
      <input type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} className={inputClass} aria-label="To date" />
    </div>
    <div className="overflow-x-auto bg-white">
      <table className="w-full min-w-[48rem] text-left text-xs">
        <thead className="border-b border-stone-200 bg-stone-100 uppercase tracking-[0.1em] text-ink-faint"><tr><th className="px-3 py-2 font-medium">Date</th><th className="px-3 py-2 font-medium">Type</th><th className="px-3 py-2 font-medium">Method / details</th><th className="px-3 py-2 font-medium">Status</th><th className="px-3 py-2 text-right font-medium">Amount</th></tr></thead>
        <tbody className="divide-y divide-stone-200 bg-white">
          {visibleEntries.map((entry) => <tr key={`${entry.type}-${entry.id}`} className="bg-white even:bg-stone-50 hover:bg-stone-100">
            <td className="whitespace-nowrap px-3 py-2 text-ink-faint">{new Date(entry.date).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}</td>
            <td className="whitespace-nowrap px-3 py-2 font-semibold text-ink">{entry.title}</td>
            <td className="max-w-sm px-3 py-2 text-ink-dim"><p>{entry.method}</p>{(entry.reference || entry.note) && <p className="mt-0.5 break-words text-[0.7rem] text-ink-faint">{[entry.reference, entry.note].filter(Boolean).join(" · ")}</p>}</td>
            <td className="whitespace-nowrap px-3 py-2 text-ink-dim">{entry.status}</td>
            <td className={cn("currency-value whitespace-nowrap px-3 py-2 text-right", entry.tone === "positive" ? "text-positive" : entry.tone === "negative" ? "text-negative" : "text-ink")}>{entry.amount}</td>
          </tr>)}
          {filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-ink-faint">No activity matches these filters.</td></tr>}
        </tbody>
      </table>
    </div>
    {filtered.length > 0 && <nav className="flex items-center justify-between gap-3 border-t border-stone-200 bg-stone-50 px-4 py-3" aria-label="Investor audit trail pages">
      <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={currentPage === 1} className="inline-flex size-10 items-center justify-center rounded-lg border border-stone-300 bg-white text-ink transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-35" aria-label="Previous audit entries"><ChevronLeft className="size-4" aria-hidden /></button>
      <p className="text-center text-xs font-medium text-ink-dim">{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}</p>
      <button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={currentPage === pageCount} className="inline-flex size-10 items-center justify-center rounded-lg border border-stone-300 bg-white text-ink transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-35" aria-label="Next audit entries"><ChevronRight className="size-4" aria-hidden /></button>
    </nav>}
  </div>;
}
