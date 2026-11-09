import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { adminUpdateGlobalFinancialControls } from "@/app/admin/actions";
import type { FinancialControls } from "@/lib/financialControls";

export function GlobalFinancialControls({ controls }: { controls: FinancialControls }) {
  return (
    <details className="group rounded-xl border border-stone-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
        <div>
        <p className="eyebrow">Universal controls</p>
          <h2 className="mt-1.5 text-lg font-semibold text-ink">Payment-method availability</h2>
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-lg text-ink transition-transform group-open:rotate-180" aria-hidden>⌄</span>
      </summary>
      <AdminActionForm
        action={adminUpdateGlobalFinancialControls}
        submitLabel="Save global controls"
        pendingLabel="Saving…"
        variant="gold"
        confirmMessage="Update payment-method availability for every investor?"
        className="space-y-4 border-t border-stone-200 p-4 sm:p-5"
      >
        <div className="grid gap-4 lg:grid-cols-2">
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Deposit methods</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <label className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm text-ink"><input type="checkbox" name="depositBankEnabled" defaultChecked={!controls.depositBankPaused} />Enable bank</label>
            <label className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm text-ink"><input type="checkbox" name="depositCryptoEnabled" defaultChecked={!controls.depositCryptoPaused} />Enable crypto</label>
            <label className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm text-ink"><input type="checkbox" name="depositCashEnabled" defaultChecked={!controls.depositCashPaused} />Enable cash</label>
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Withdrawal methods</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <label className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm text-ink"><input type="checkbox" name="withdrawalBankEnabled" defaultChecked={!controls.withdrawalBankPaused} />Enable bank</label>
            <label className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm text-ink"><input type="checkbox" name="withdrawalCryptoEnabled" defaultChecked={!controls.withdrawalCryptoPaused} />Enable crypto</label>
            <label className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm text-ink"><input type="checkbox" name="withdrawalCashEnabled" defaultChecked={!controls.withdrawalCashPaused} />Enable cash</label>
          </div>
        </fieldset>
        </div>
      </AdminActionForm>
    </details>
  );
}
