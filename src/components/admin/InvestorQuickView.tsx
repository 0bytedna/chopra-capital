"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, X } from "lucide-react";

type InvestorSummary = {
  id: string;
  name: string;
  email: string;
  kycStatus: string;
  twoFactorEnabled: boolean;
  referralEnabled: boolean;
  balance: number;
  queued: number;
  commission: number;
  deposits: number;
  withdrawals: number;
};

function money(value: number) {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function InvestorQuickView({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<InvestorSummary | null>(null);
  const [error, setError] = useState("");

  async function show() {
    setOpen(true);
    if (summary || loading) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/investors/${id}/portfolio`, { cache: "no-store" });
      if (!response.ok) throw new Error("Investor details could not be loaded.");
      const payload = (await response.json()) as { investor?: InvestorSummary };
      if (!payload.investor) throw new Error("Investor details are unavailable.");
      setSummary(payload.investor);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Investor details could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => void show()} className="whitespace-nowrap text-left font-medium text-ink underline decoration-gold-400/60 underline-offset-4 hover:text-gold-700">
        {name}
      </button>
      {open && (
        <div className="fixed inset-0 z-[80]">
          <button type="button" aria-label="Close investor quick view" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/45 backdrop-blur-sm" />
          <aside className="product-window absolute inset-y-2 right-2 flex w-[26rem] max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-2xl shadow-2xl">
            <header className="flex items-center justify-between gap-3 border-b border-stone-200 px-5 py-4">
              <div className="min-w-0">
                <p className="eyebrow">Investor quick view</p>
                <h2 className="mt-1 truncate font-serif text-xl text-ink">{name}</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-full border border-stone-200 p-2 text-ink-dim hover:text-ink"><X className="size-4" /></button>
            </header>
            <div className="flex-1 overflow-y-auto p-5">
              {loading ? <Loader2 className="mx-auto mt-12 size-6 animate-spin text-gold-600" /> : error ? <p className="text-sm text-negative">{error}</p> : summary ? (
                <div className="space-y-5">
                  <div><p className="text-sm font-semibold text-ink">{summary.name}</p><p className="mt-1 text-xs text-ink-faint">{summary.email}</p></div>
                  <dl className="grid grid-cols-2 gap-3">
                    {[
                      ["Balance", `${money(summary.balance)} USD`], ["In queue", `${money(summary.queued)} USD`],
                      ["Commission", `${money(summary.commission)} USD`], ["KYC", summary.kycStatus],
                      ["Deposits", String(summary.deposits)], ["Withdrawals", String(summary.withdrawals)],
                      ["2FA", summary.twoFactorEnabled ? "Enabled" : "Not enabled"], ["Referrals", summary.referralEnabled ? "Enabled" : "Disabled"],
                    ].map(([label, value]) => <div key={label} className="rounded-xl border border-stone-200 bg-white p-3"><dt className="text-[11px] uppercase tracking-[0.12em] text-ink-faint">{label}</dt><dd className="currency-value mt-1.5 text-sm font-semibold text-ink">{value}</dd></div>)}
                  </dl>
                  <Link href={`/admin/investors/${id}`} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gold-600 px-4 py-3 text-sm font-semibold text-white hover:bg-gold-700">Open full investor page <ExternalLink className="size-4" /></Link>
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
