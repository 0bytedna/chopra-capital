import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { adminDeleteInvestor, adminResetInvestorPassword, adminResetInvestorTwoFactor, adminSetInvestorBalances, adminSetInvestorReferralAccess, adminUpdateInvestorProfile } from "@/app/admin/actions";

const inputClass = "h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-ink";
const labelClass = "space-y-1.5 text-xs font-medium text-ink-dim";

type Props = {
  investor: {
    id: string; fullName: string | null; email: string; mobile: string | null;
    kycStatus: string; kycNote: string | null; bankTransferEnabled: boolean; cashEnabled: boolean;
    twoFactorEnabled: boolean; referralEnabled: boolean;
    bankingDetail: { accountNumber: string | null; ifsc: string | null; upiId: string | null; accountType: string | null; usdtAddress: string | null; usdtNetwork: string | null } | null;
  };
  queued: string;
  invested: string;
};

export function InvestorAdminControls({ investor, queued, invested }: Props) {
  const fields = [
    ["fullName", "Full name", investor.fullName], ["email", "Email", investor.email], ["mobile", "Mobile", investor.mobile],
    ["accountNumber", "Bank account", investor.bankingDetail?.accountNumber], ["ifsc", "IFSC", investor.bankingDetail?.ifsc], ["upiId", "UPI ID", investor.bankingDetail?.upiId],
    ["accountType", "Account type", investor.bankingDetail?.accountType], ["usdtAddress", "USDT address", investor.bankingDetail?.usdtAddress], ["usdtNetwork", "USDT network", investor.bankingDetail?.usdtNetwork],
  ] as const;

  return <div className="space-y-5">
    <AdminActionForm action={adminUpdateInvestorProfile} submitLabel="Save account details" pendingLabel="Saving…" variant="gold" className="rounded-xl border border-stone-200 bg-stone-50 p-4">
      <input type="hidden" name="userId" value={investor.id} />
      <div className="grid gap-4 lg:grid-cols-3">
        {fields.map(([name, label, value]) => <label key={name} className={labelClass}>{label}<input name={name} defaultValue={value ?? ""} required={name === "email"} className={inputClass} /></label>)}
        <label className={labelClass}>KYC status<select name="kycStatus" defaultValue={investor.kycStatus} className={inputClass}><option value="NOT_SUBMITTED">Not submitted</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select></label>
        <label className="space-y-1.5 text-xs font-medium text-ink-dim lg:col-span-2">KYC note<input name="kycNote" defaultValue={investor.kycNote ?? ""} className={inputClass} /></label>
      </div>
      <div className="mt-4 flex flex-wrap gap-5 rounded-lg border border-stone-200 bg-white p-3 text-sm text-ink">
        <label><input type="checkbox" name="bankTransferEnabled" defaultChecked={investor.bankTransferEnabled} className="mr-2" />Bank deposits and withdrawals</label>
        <label><input type="checkbox" name="cashEnabled" defaultChecked={investor.cashEnabled} className="mr-2" />Cash deposits and withdrawals</label>
      </div>
    </AdminActionForm>

    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
      <AdminActionForm action={adminSetInvestorBalances} submitLabel="Apply balance correction" pendingLabel="Applying…" variant="gold" confirmMessage="Apply these balances and create permanent audit entries?" className="rounded-xl border border-stone-200 bg-white p-4"><input type="hidden" name="userId" value={investor.id} /><h3 className="text-sm font-semibold text-ink">Balance correction</h3><div className="mt-3 grid grid-cols-2 gap-3"><label className={labelClass}>Invested USD<input name="invested" type="number" min="0" step="0.01" defaultValue={invested} required className={inputClass} /></label><label className={labelClass}>Queued USD<input name="queued" type="number" min="0" step="0.01" defaultValue={queued} required className={inputClass} /></label></div><label className={`mt-3 block ${labelClass}`}>Audit note<input name="note" required maxLength={240} className={inputClass} placeholder="Reason for correction" /></label></AdminActionForm>
      <AdminActionForm action={adminResetInvestorPassword} submitLabel="Reset password" pendingLabel="Resetting…" confirmMessage="Reset this investor's password?" className="rounded-xl border border-stone-200 bg-white p-4"><input type="hidden" name="userId" value={investor.id} /><h3 className="text-sm font-semibold text-ink">Password</h3><label className={`mt-3 block ${labelClass}`}>Temporary password<input name="password" type="password" minLength={8} required className={inputClass} /></label></AdminActionForm>
      {investor.twoFactorEnabled ? <AdminActionForm action={adminResetInvestorTwoFactor} submitLabel="Reset two-factor authentication" pendingLabel="Resetting…" variant="danger" confirmMessage={`Reset two-factor authentication for ${investor.fullName ?? investor.email}?`} className="rounded-xl border border-negative/20 bg-white p-4"><input type="hidden" name="userId" value={investor.id} /><h3 className="text-sm font-semibold text-ink">Two-factor authentication</h3><p className="mt-2 text-xs text-ink-faint">Enabled. Resetting signs the investor out everywhere.</p></AdminActionForm> : <section className="rounded-xl border border-stone-200 bg-white p-4"><h3 className="text-sm font-semibold text-ink">Two-factor authentication</h3><p className="mt-2 text-xs text-ink-faint">Not enabled for this investor.</p></section>}
      <AdminActionForm action={adminSetInvestorReferralAccess} submitLabel={investor.referralEnabled ? "Disable referrals" : "Enable referrals"} pendingLabel="Updating…" variant={investor.referralEnabled ? "danger" : "gold"} confirmMessage={`${investor.referralEnabled ? "Disable" : "Enable"} referral access?`} className="rounded-xl border border-stone-200 bg-white p-4"><input type="hidden" name="userId" value={investor.id} /><input type="hidden" name="enabled" value={investor.referralEnabled ? "false" : "true"} /><h3 className="text-sm font-semibold text-ink">Referral access</h3><p className="mt-2 text-xs text-ink-faint">Currently {investor.referralEnabled ? "enabled" : "disabled"}.</p></AdminActionForm>
    </div>

    <AdminActionForm action={adminDeleteInvestor} submitLabel="Permanently delete investor" pendingLabel="Deleting…" variant="danger" confirmMessage={`Permanently delete ${investor.fullName ?? investor.email} and all linked data? This cannot be undone.`} className="rounded-xl border border-negative/25 bg-negative/5 p-4"><input type="hidden" name="userId" value={investor.id} /><p className="text-sm font-semibold text-negative">Danger zone</p><p className="mt-1 text-xs text-ink-faint">Deletes the investor and all linked account history.</p></AdminActionForm>
  </div>;
}
