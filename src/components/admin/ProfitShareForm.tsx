"use client";

import { useActionState, useState } from "react";
import { Eye, LockKeyhole, Percent, ShieldCheck } from "lucide-react";
import {
  adminConfirmProfitShare,
  adminPreviewProfitShare,
  type ProfitShareActionState,
} from "@/app/admin/profit-share/actions";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { cn } from "@/lib/cn";

type Frequency = "WEEKLY" | "MONTHLY";
type Mode = "PERCENTAGE" | "FIXED_TOTAL";

const inputClass =
  "h-11 w-full rounded-lg border border-gold-600/20 bg-vault-950/65 px-3 text-sm text-ink focus:border-gold-500/50 focus:outline-none focus:ring-2 focus:ring-gold-500/20";

function formatUsd(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function signedUsd(value: number) {
  return `${value > 0 ? "+" : ""}${formatUsd(value)}`;
}

export function ProfitShareForm() {
  const [frequency, setFrequency] = useState<Frequency>("WEEKLY");
  const [mode, setMode] = useState<Mode>("PERCENTAGE");
  const [value, setValue] = useState("20");
  const [previewState, previewAction] = useActionState<
    ProfitShareActionState,
    FormData
  >(adminPreviewProfitShare, {});
  const [confirmState, confirmAction] = useActionState<
    ProfitShareActionState,
    FormData
  >(adminConfirmProfitShare, {});

  const preview = previewState.preview;
  const previewMatches =
    preview &&
    preview.frequency === frequency &&
    preview.mode === mode &&
    Number(preview.value) === Number(value);
  const chargeableCount =
    preview?.allocations.filter((allocation) => allocation.companyShare > 0)
      .length ?? 0;

  return (
    <div className="space-y-5">
      <form action={previewAction} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2">
            <span className="block text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              Settlement period
            </span>
            <select
              name="frequency"
              value={frequency}
              onChange={(event) => setFrequency(event.target.value as Frequency)}
              className={inputClass}
            >
              <option value="WEEKLY">Current trading week</option>
              <option value="MONTHLY">Current month</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="block text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              Company share method
            </span>
            <select
              name="mode"
              value={mode}
              onChange={(event) => {
                const nextMode = event.target.value as Mode;
                setMode(nextMode);
                setValue(nextMode === "PERCENTAGE" ? "20" : "");
              }}
              className={inputClass}
            >
              <option value="PERCENTAGE">Percentage of each profit</option>
              <option value="FIXED_TOTAL">Fixed total, proportionally split</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="block text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              {mode === "PERCENTAGE" ? "Percentage" : "Fixed company share (USD)"}
            </span>
            <span className="relative block">
              {mode === "PERCENTAGE" && (
                <Percent
                  className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
                  aria-hidden
                />
              )}
              <input
                name="value"
                type="number"
                inputMode="decimal"
                min="0.0001"
                max={mode === "PERCENTAGE" ? "100" : undefined}
                step={mode === "PERCENTAGE" ? "0.0001" : "0.01"}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder={mode === "PERCENTAGE" ? "20" : "0.00"}
                required
                className={cn(inputClass, mode === "PERCENTAGE" && "pr-10")}
              />
            </span>
          </label>
        </div>

        {previewState.error && <Alert tone="error">{previewState.error}</Alert>}
        {preview && !previewMatches && (
          <Alert tone="warning">
            The settings changed after this preview. Generate a new preview before
            confirming.
          </Alert>
        )}

        <div className="flex flex-col gap-3 border-t border-gold-600/15 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex max-w-2xl items-start gap-2 text-xs leading-5 text-ink-faint">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-gold-400" aria-hidden />
            Previewing never changes balances. Confirmation is manual and the
            selected week or month is permanently locked after settlement.
          </p>
          <SubmitButton variant="ghost" pendingLabel="Calculating…">
            <Eye className="size-4" aria-hidden />
            Preview allocations
          </SubmitButton>
        </div>
      </form>

      {confirmState.error && <Alert tone="error">{confirmState.error}</Alert>}
      {confirmState.success && <Alert tone="success">{confirmState.success}</Alert>}

      {preview && previewMatches && !confirmState.success && (
        <section className="overflow-hidden rounded-xl border border-gold-600/20 bg-black/10">
          <div className="grid gap-4 border-b border-gold-600/15 p-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">Period</p>
              <p className="mt-1 text-sm text-ink">{preview.periodLabel}</p>
              <p className="mt-1 font-mono text-[10px] text-ink-faint">{preview.periodKey}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">Locked NAV</p>
              <p className="mt-1 font-mono text-sm text-ink">{preview.navPrice.toFixed(6)} USD</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">Eligible profit</p>
              <p className="mt-1 font-mono text-sm text-ink">{formatUsd(preview.totalEligibleProfit)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">Company receives</p>
              <p className="mt-1 font-mono text-sm text-positive">{formatUsd(preview.totalCompanyShare)}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[60rem] table-fixed text-left">
              <thead className="border-b border-gold-600/15 bg-vault-950/40">
                <tr className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                  <th className="w-[24%] px-4 py-3 font-medium">Investor</th>
                  <th className="w-[14%] px-4 py-3 font-medium">Profit</th>
                  <th className="w-[14%] px-4 py-3 font-medium">High-water mark</th>
                  <th className="w-[14%] px-4 py-3 font-medium">Eligible</th>
                  <th className="w-[14%] px-4 py-3 font-medium">Company share</th>
                  <th className="w-[16%] px-4 py-3 font-medium">Balance after</th>
                  <th className="w-[4%] px-2 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-600/10">
                {preview.allocations.map((allocation) => (
                  <tr key={allocation.userId}>
                    <td className="px-4 py-3">
                      <p className="truncate text-sm text-ink">{allocation.name}</p>
                      <p className="mt-1 truncate text-[10px] text-ink-faint">{allocation.email}</p>
                    </td>
                    <td className={cn("px-4 py-3 font-mono text-xs", allocation.profitBeforeShare > 0 ? "text-positive" : allocation.profitBeforeShare < 0 ? "text-negative" : "text-ink-dim")}>
                      {signedUsd(allocation.profitBeforeShare)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-dim">
                      {formatUsd(allocation.highWaterBefore)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink">
                      {formatUsd(allocation.eligibleProfit)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gold-300">
                      {formatUsd(allocation.companyShare)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink">
                      {formatUsd(allocation.balanceAfter)}
                    </td>
                    <td className="px-2 py-3">
                      {allocation.companyShare > 0 ? (
                        <span className="block size-2 rounded-full bg-positive" title="Included" />
                      ) : (
                        <span className="block size-2 rounded-full bg-ink-faint/35" title="No eligible share" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form
            action={confirmAction}
            className="flex flex-col gap-3 border-t border-gold-600/15 p-4 sm:flex-row sm:items-center sm:justify-between"
            onSubmit={(event) => {
              const confirmed = window.confirm(
                `Confirm ${formatUsd(preview.totalCompanyShare)} as the company share for ${preview.periodLabel}? This permanently locks the period.`,
              );
              if (!confirmed) event.preventDefault();
            }}
          >
            <input type="hidden" name="frequency" value={preview.frequency} />
            <input type="hidden" name="mode" value={preview.mode} />
            <input type="hidden" name="value" value={preview.value} />
            <p className="flex max-w-2xl items-start gap-2 text-xs leading-5 text-ink-faint">
              <LockKeyhole className="mt-0.5 size-3.5 shrink-0 text-gold-400" aria-hidden />
              {chargeableCount} account{chargeableCount === 1 ? "" : "s"} will transfer
              pool units as the company share. Total pool units stay unchanged.
            </p>
            <SubmitButton
              disabled={preview.totalCompanyShare <= 0}
              pendingLabel="Settling profit share…"
            >
              Confirm and lock period
            </SubmitButton>
          </form>
        </section>
      )}
    </div>
  );
}