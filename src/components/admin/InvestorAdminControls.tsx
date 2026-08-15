"use client";

import { useState } from "react";
import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { adminDeleteInvestor, adminEditDepositRecord, adminEditWithdrawalRecord, adminResetInvestorPassword, adminSetInvestorBalances, adminUpdateInvestorProfile } from "@/app/admin/actions";

const inputClass = "h-10 w-full rounded-lg border border-gold-600/20 bg-vault-950/65 px-3 text-sm text-ink";
const labelClass = "space-y-1.5 text-xs text-ink-faint";

function formatUsd(value: string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type Props = {
  investor: {
    id: string; fullName: string | null; email: string; mobile: string | null;
    kycStatus: string; kycNote: string | null; bankTransferEnabled: boolean; cashEnabled: boolean;
    bankingDetail: { accountNumber: string | null; ifsc: string | null; upiId: string | null; accountType: string | null; usdtAddress: string | null; usdtNetwork: string | null } | null;
  };
  queued: string;
  invested: string;
  deposits: Array<{ id: string; method: string; amount: string; status: string; reference: string | null; txHash: string | null; adminNote: string | null }>;
  withdrawals: Array<{ id: string; method: string; amount: string; status: string; reference: string | null; adminNote: string | null }>;
};

export function InvestorAdminControls({ investor, queued, invested, deposits, withdrawals }: Props) {
  const [open, setOpen] = useState(false);
  return <section className="glass-card rounded-2xl p-5 sm:p-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="eyebrow">Administrator controls</p><h2 className="mt-1 font-serif text-xl text-ink">Edit this entire account</h2><p className="mt-1 text-xs text-ink-faint">Changes are applied directly. Balance corrections create financial audit entries.</p></div><button type="button" onClick={() => setOpen((value) => !value)} className="h-10 rounded-lg border border-gold-600/25 px-4 text-sm text-gold-300">{open ? "Hide controls" : "Open controls"}</button></div>
    {open && <div className="mt-6 space-y-5">
      <AdminActionForm action={adminUpdateInvestorProfile} submitLabel="Save account details" pendingLabel="Saving…" variant="gold" className="rounded-xl border border-gold-600/15 bg-slate-50 p-4">
        <input type="hidden" name="userId" value={investor.id}/><h3 className="text-sm font-medium text-ink">Profile, KYC, bank and crypto</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[
          ["fullName","Full name",investor.fullName],["email","Email",investor.email],["mobile","Mobile",investor.mobile],
          ["accountNumber","Bank account",investor.bankingDetail?.accountNumber],["ifsc","IFSC",investor.bankingDetail?.ifsc],["upiId","UPI ID",investor.bankingDetail?.upiId],["accountType","Account type",investor.bankingDetail?.accountType],["usdtAddress","USDT address",investor.bankingDetail?.usdtAddress],["usdtNetwork","USDT network",investor.bankingDetail?.usdtNetwork],
        ].map(([name,label,value]) => <label key={String(name)} className={labelClass}>{label}<input name={String(name)} defaultValue={String(value ?? "")} required={name === "email"} className={inputClass}/></label>)}</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className={labelClass}>KYC status<select name="kycStatus" defaultValue={investor.kycStatus} className={inputClass}><option value="NOT_SUBMITTED">Not submitted</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select></label><label className={labelClass}>KYC note<input name="kycNote" defaultValue={investor.kycNote ?? ""} className={inputClass}/></label></div>
        <div className="mt-3 flex flex-wrap gap-5 text-sm text-ink-dim"><label><input type="checkbox" name="bankTransferEnabled" defaultChecked={investor.bankTransferEnabled} className="mr-2"/>Bank deposits and withdrawals enabled</label><label><input type="checkbox" name="cashEnabled" defaultChecked={investor.cashEnabled} className="mr-2"/>Cash deposits and withdrawals enabled</label></div>
      </AdminActionForm>
      <div className="grid gap-5 lg:grid-cols-2">
        <AdminActionForm action={adminSetInvestorBalances} submitLabel="Apply balance correction" pendingLabel="Applying…" variant="gold" confirmMessage="Apply these balances and create permanent audit entries?" className="rounded-xl border border-gold-600/15 bg-slate-50 p-4"><input type="hidden" name="userId" value={investor.id}/><h3 className="text-sm font-medium text-ink">Set balances</h3><div className="mt-3 grid grid-cols-2 gap-3"><label className={labelClass}>Invested USD<input name="invested" type="number" min="0" step="0.01" defaultValue={invested} required className={inputClass}/></label><label className={labelClass}>Queued USD<input name="queued" type="number" min="0" step="0.01" defaultValue={queued} required className={inputClass}/></label></div><label className={`mt-3 block ${labelClass}`}>Audit note<input name="note" required maxLength={240} className={inputClass} placeholder="Reason for correction"/></label></AdminActionForm>
        <AdminActionForm action={adminResetInvestorPassword} submitLabel="Reset password" pendingLabel="Resetting…" confirmMessage="Reset this investor's password?" className="rounded-xl border border-gold-600/15 bg-slate-50 p-4"><input type="hidden" name="userId" value={investor.id}/><h3 className="text-sm font-medium text-ink">Password reset</h3><label className={`mt-3 block ${labelClass}`}>Temporary password<input name="password" type="password" minLength={8} required className={inputClass}/></label><p className="mt-2 text-xs text-ink-faint">Send it privately by WhatsApp or SMS and ask the investor to change it.</p></AdminActionForm>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-xl border border-gold-600/15 bg-slate-50 p-4"><h3 className="text-sm font-medium text-ink">Deposit records</h3><div className="mt-3 space-y-2">{deposits.map((deposit) => <details key={deposit.id} className="rounded-lg border border-gold-600/10 p-3"><summary className="cursor-pointer text-xs text-ink">{deposit.method} · {formatUsd(deposit.amount)} USD · {deposit.status}</summary><AdminActionForm action={adminEditDepositRecord} submitLabel="Save deposit" pendingLabel="Saving…" className="mt-3"><input type="hidden" name="id" value={deposit.id}/><input type="hidden" name="userId" value={investor.id}/><div className="grid grid-cols-2 gap-2"><label className={labelClass}>Amount<input name="amount" type="number" min="0" step="0.01" defaultValue={deposit.amount} className={inputClass}/></label><label className={labelClass}>Status<select name="status" defaultValue={deposit.status} className={inputClass}>{["PENDING","NEEDS_CORRECTION","RECEIVED","QUEUED","CONFIRMED","REJECTED","CANCELLED"].map((value) => <option key={value}>{value}</option>)}</select></label></div><label className={`mt-2 block ${labelClass}`}>Reference / UTR<input name="reference" defaultValue={deposit.reference ?? ""} className={inputClass}/></label><label className={`mt-2 block ${labelClass}`}>Crypto hash<input name="txHash" defaultValue={deposit.txHash ?? ""} className={inputClass}/></label><label className={`mt-2 block ${labelClass}`}>Admin note<input name="adminNote" defaultValue={deposit.adminNote ?? ""} className={inputClass}/></label></AdminActionForm></details>)}{deposits.length === 0 && <p className="text-xs text-ink-faint">No deposits.</p>}</div></section>
        <section className="rounded-xl border border-gold-600/15 bg-slate-50 p-4"><h3 className="text-sm font-medium text-ink">Withdrawal records</h3><div className="mt-3 space-y-2">{withdrawals.map((withdrawal) => <details key={withdrawal.id} className="rounded-lg border border-gold-600/10 p-3"><summary className="cursor-pointer text-xs text-ink">{withdrawal.method} · {formatUsd(withdrawal.amount)} USD · {withdrawal.status}</summary><AdminActionForm action={adminEditWithdrawalRecord} submitLabel="Save withdrawal" pendingLabel="Saving…" className="mt-3"><input type="hidden" name="id" value={withdrawal.id}/><input type="hidden" name="userId" value={investor.id}/><div className="grid grid-cols-2 gap-2"><label className={labelClass}>Amount<input name="amount" type="number" min="0" step="0.01" defaultValue={withdrawal.amount} className={inputClass}/></label><label className={labelClass}>Status<select name="status" defaultValue={withdrawal.status} className={inputClass}>{["REQUESTED","APPROVED","BROKER_RECEIVED","INR_READY","PAYOUT_DETAILS_REQUIRED","PAYOUT_DETAILS_REVIEW","PROCESSED","REJECTED","CANCELLED"].map((value) => <option key={value}>{value}</option>)}</select></label></div><label className={`mt-2 block ${labelClass}`}>Payout reference<input name="reference" defaultValue={withdrawal.reference ?? ""} className={inputClass}/></label><label className={`mt-2 block ${labelClass}`}>Admin note<input name="adminNote" defaultValue={withdrawal.adminNote ?? ""} className={inputClass}/></label></AdminActionForm></details>)}{withdrawals.length === 0 && <p className="text-xs text-ink-faint">No withdrawals.</p>}</div></section>
      </div>      <AdminActionForm action={adminDeleteInvestor} submitLabel="Permanently delete investor" pendingLabel="Deleting…" variant="danger" confirmMessage={`Permanently delete ${investor.fullName ?? investor.email} and ALL linked deposits, withdrawals, ledger and support data? This cannot be undone.`} className="rounded-xl border border-negative/25 bg-negative/5 p-4"><input type="hidden" name="userId" value={investor.id}/><p className="text-sm text-negative">Danger zone</p><p className="mt-1 text-xs text-ink-faint">This removes the investor and all linked account history permanently.</p></AdminActionForm>
    </div>}
  </section>;
}