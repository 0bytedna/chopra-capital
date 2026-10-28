"use client";

function openDatePicker(input: HTMLInputElement): void {
  try {
    input.showPicker();
  } catch {
    // Browsers without a programmatic picker retain native input behavior.
  }
}

export function CommissionPeriodFilter({
  from,
  to,
}: {
  from: string;
  to: string;
}) {
  return (
    <form
      action="/admin/commissions"
      method="get"
      className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
    >
      <label className="space-y-1.5 text-xs text-ink-faint">
        Period start
        <input
          type="date"
          name="from"
          defaultValue={from}
          max={to}
          onClick={(event) => openDatePicker(event.currentTarget)}
          className="h-10 w-full cursor-pointer rounded-lg border border-gold-600/20 bg-white px-3 font-mono text-sm text-ink outline-none focus:border-gold-400"
        />
      </label>
      <label className="space-y-1.5 text-xs text-ink-faint">
        Period end
        <input
          type="date"
          name="to"
          defaultValue={to}
          min={from}
          onClick={(event) => openDatePicker(event.currentTarget)}
          className="h-10 w-full cursor-pointer rounded-lg border border-gold-600/20 bg-white px-3 font-mono text-sm text-ink outline-none focus:border-gold-400"
        />
      </label>
      <button
        type="submit"
        className="h-10 self-end rounded-lg bg-gold-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-gold-700"
      >
        Calculate
      </button>
    </form>
  );
}
