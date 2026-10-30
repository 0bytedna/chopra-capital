"use client";

import { useMemo, useState } from "react";
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, Search } from "lucide-react";
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

export function InvestorAuditTrail({ entries }: { entries: InvestorAuditEntry[] }) {
  const [type, setType] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
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

  return <div>
    <div className="grid gap-2 border-b border-stone-200 bg-stone-50 p-3 sm:grid-cols-2 xl:grid-cols-5">
      <label className="relative sm:col-span-2 xl:col-span-1"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-ink-faint" aria-hidden /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reference or note" className={`${inputClass} w-full pl-9`} /></label>
      <select value={type} onChange={(event) => setType(event.target.value)} className={inputClass} aria-label="Transaction type"><option value="ALL">All activity</option><option value="DEPOSIT">Deposits</option><option value="WITHDRAWAL">Withdrawals</option><option value="TRANSFER">Internal transfers</option></select>
      <select value={status} onChange={(event) => setStatus(event.target.value)} className={inputClass} aria-label="Transaction status"><option value="ALL">All statuses</option>{statuses.map((value) => <option key={value} value={value}>{value}</option>)}</select>
      <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className={inputClass} aria-label="From date" />
      <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className={inputClass} aria-label="To date" />
    </div>
    <div className="divide-y divide-stone-200">
      {filtered.map((entry) => {
        const Icon = entry.type === "DEPOSIT" ? ArrowDownToLine : entry.type === "WITHDRAWAL" ? ArrowUpFromLine : ArrowLeftRight;
        return <article key={`${entry.type}-${entry.id}`} className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="flex min-w-0 items-start gap-3"><span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-gold-700"><Icon className="size-4" aria-hidden /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="font-semibold text-ink">{entry.title}</p><span className="rounded-full border border-stone-200 bg-white px-2 py-0.5 text-[0.7rem] font-medium text-ink-dim">{entry.status}</span></div><p className="mt-1 text-xs text-ink-faint">{new Date(entry.date).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })} · {entry.method}</p>{(entry.reference || entry.note) && <p className="mt-1 break-words text-xs text-ink-dim">{[entry.reference, entry.note].filter(Boolean).join(" · ")}</p>}</div></div>
          <p className={cn("currency-value pl-12 text-sm sm:pl-0 sm:text-right", entry.tone === "positive" ? "text-positive" : entry.tone === "negative" ? "text-negative" : "text-ink")}>{entry.amount}</p>
        </article>;
      })}
      {filtered.length === 0 && <p className="px-4 py-10 text-center text-sm text-ink-faint">No activity matches these filters.</p>}
    </div>
  </div>;
}
