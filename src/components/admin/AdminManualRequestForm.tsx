"use client";

import { useState } from "react";
import { AdminActionForm } from "@/components/admin/AdminActionForm";
import type { AdminFormState } from "@/app/admin/actions";

type InvestorOption = { id: string; label: string };
type RequestMethod = "CRYPTO" | "BANK" | "CASH";

const inputClass = "h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-ink";
const labelClass = "space-y-1.5 text-xs font-medium text-ink-dim";

export function AdminManualRequestForm({
  kind,
  investors,
  action,
  allowedMethods = ["CRYPTO", "BANK", "CASH"],
}: {
  kind: "deposit" | "withdrawal";
  investors: InvestorOption[];
  action: (prev: AdminFormState, formData: FormData) => Promise<AdminFormState>;
  allowedMethods?: RequestMethod[];
}) {
  const [method, setMethod] = useState<RequestMethod>(allowedMethods[0] ?? "CRYPTO");
  const deposit = kind === "deposit";
  const activeMethod = allowedMethods.includes(method) ? method : allowedMethods[0] ?? "CRYPTO";

  if (allowedMethods.length === 0) {
    return (
      <section className="glass-card rounded-xl p-4 sm:p-5">
        <p className="font-semibold text-ink">Create {kind} request on behalf of investor</p>
        <p className="mt-2 text-sm text-negative">This request type or all of its payment methods are paused globally.</p>
      </section>
    );
  }

  return (
    <details className="glass-card rounded-xl p-4 sm:p-5">
      <summary className="cursor-pointer list-none font-semibold text-ink [&::-webkit-details-marker]:hidden">
        Create {kind} request on behalf of investor
        <span className="ml-2 text-xs font-normal text-ink-faint">Expand form</span>
      </summary>
      <AdminActionForm
        action={action}
        submitLabel={`Create ${kind} request`}
        pendingLabel="Creating…"
        resetOnSuccess
        confirmMessage={`Create this ${kind} request on behalf of the selected investor?`}
        className="mt-4 border-t border-stone-200 pt-4"
      >
        <div className="grid gap-3 md:grid-cols-3">
          <label className={`${labelClass} md:col-span-2`}>Investor
            <select name="userId" required defaultValue="" className={inputClass}>
              <option value="" disabled>Select investor</option>
              {investors.map((investor) => <option key={investor.id} value={investor.id}>{investor.label}</option>)}
            </select>
          </label>
          <label className={labelClass}>Method
            <select name="method" value={activeMethod} onChange={(event) => setMethod(event.target.value as RequestMethod)} className={inputClass} disabled={allowedMethods.length === 0}>
              {allowedMethods.includes("CRYPTO") && <option value="CRYPTO">Crypto</option>}{allowedMethods.includes("BANK") && <option value="BANK">Bank transfer</option>}{allowedMethods.includes("CASH") && <option value="CASH">Cash</option>}
            </select>
          </label>
          <label className={labelClass}>{deposit && activeMethod !== "CRYPTO" ? "Amount (INR)" : "Amount (USD / USDT)"}
            <input name="amount" type="number" min="0.01" step={deposit && activeMethod !== "CRYPTO" ? "0.01" : "0.000001"} required disabled={allowedMethods.length === 0} className={inputClass} />
          </label>
          {deposit && activeMethod === "CRYPTO" && allowedMethods.length > 0 && <>
            <label className={labelClass}>Network<select name="network" defaultValue="TRC20" className={inputClass}><option value="TRC20">TRC20</option><option value="ERC20">ERC20</option><option value="BEP20">BEP20</option></select></label>
            <label className={`${labelClass} md:col-span-3`}>Transaction hash<input name="txHash" required maxLength={200} className={inputClass} /></label>
          </>}
          {deposit && activeMethod === "BANK" && <label className={`${labelClass} md:col-span-2`}>UTR / reference<input name="reference" required maxLength={100} className={inputClass} /></label>}
        </div>
        {!deposit && <p className="text-xs text-ink-faint">The saved payout destination is copied from the investor profile. The request bypasses the investor request window and 2FA, then follows the normal approval workflow.</p>}
      </AdminActionForm>
    </details>
  );
}
