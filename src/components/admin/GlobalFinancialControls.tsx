import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { adminUpdateGlobalFinancialControls } from "@/app/admin/actions";
import type { FinancialControls } from "@/lib/financialControls";

export function GlobalFinancialControls({ controls }: { controls: FinancialControls }) {
  return (
    <AdminActionForm
      action={adminUpdateGlobalFinancialControls}
      submitLabel="Save global controls"
      pendingLabel="Saving…"
      variant="gold"
      confirmMessage="Update deposit and withdrawal availability for every investor?"
      className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <div>
        <p className="eyebrow">Universal controls</p>
        <h2 className="mt-1.5 text-lg font-semibold text-ink">Pause new investor requests</h2>
        <p className="mt-1 text-xs text-ink-faint">Existing requests remain available for processing.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm text-ink">
          <input type="checkbox" name="depositsPaused" defaultChecked={controls.depositsPaused} />
          <span><strong className="block">Pause deposits</strong><span className="text-xs text-ink-faint">Block all new deposit requests</span></span>
        </label>
        <label className="flex items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm text-ink">
          <input type="checkbox" name="withdrawalsPaused" defaultChecked={controls.withdrawalsPaused} />
          <span><strong className="block">Pause withdrawals</strong><span className="text-xs text-ink-faint">Block all new withdrawal requests</span></span>
        </label>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Deposit methods</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <label className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm text-ink"><input type="checkbox" name="depositBankPaused" defaultChecked={controls.depositBankPaused} />Pause bank</label>
            <label className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm text-ink"><input type="checkbox" name="depositCryptoPaused" defaultChecked={controls.depositCryptoPaused} />Pause crypto</label>
            <label className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm text-ink"><input type="checkbox" name="depositCashPaused" defaultChecked={controls.depositCashPaused} />Pause cash</label>
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Withdrawal methods</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <label className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm text-ink"><input type="checkbox" name="withdrawalBankPaused" defaultChecked={controls.withdrawalBankPaused} />Pause bank</label>
            <label className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm text-ink"><input type="checkbox" name="withdrawalCryptoPaused" defaultChecked={controls.withdrawalCryptoPaused} />Pause crypto</label>
            <label className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm text-ink"><input type="checkbox" name="withdrawalCashPaused" defaultChecked={controls.withdrawalCashPaused} />Pause cash</label>
          </div>
        </fieldset>
      </div>
    </AdminActionForm>
  );
}
