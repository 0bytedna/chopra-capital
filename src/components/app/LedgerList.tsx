import { ArrowDownToLine, ArrowUpFromLine, Layers, Percent, Wrench } from "lucide-react";
import type { LedgerEntry } from "@/generated/prisma";
import { formatSignedUsdt, toNumber } from "@/lib/money";
import { cn } from "@/lib/cn";

const typeMeta = {
  DEPOSIT: { label: "Deposit confirmed", Icon: ArrowDownToLine },
  INVEST: { label: "Allocated to pool", Icon: Layers },
  WITHDRAWAL: { label: "Withdrawal paid", Icon: ArrowUpFromLine },
  FEE: { label: "Fee", Icon: Percent },
  ADJUSTMENT: { label: "Adjustment", Icon: Wrench },
} as const;

export function LedgerList({ entries }: { entries: LedgerEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gold-600/20 px-4 py-8 text-center text-sm text-ink-faint">
        No activity yet — your confirmed deposits, allocations and withdrawals will appear here.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-gold-600/8">
      {entries.map((e) => {
        const meta = typeMeta[e.type];
        const amount = toNumber(e.amount);
        // INVEST moves money queued→pool; net worth is unchanged, so show it neutral.
        const neutral = e.type === "INVEST" || e.type === "ADJUSTMENT";
        return (
          <li key={e.id} className="flex items-center gap-3.5 py-3.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-gold-600/20 bg-gold-600/8">
              <meta.Icon className="size-4 text-gold-500" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-ink">{meta.label}</p>
              <p className="truncate text-xs text-ink-faint">
                {e.note ?? "—"} ·{" "}
                {e.createdAt.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
            <p
              className={cn(
                "shrink-0 font-mono text-sm",
                neutral ? "text-ink-dim" : amount >= 0 ? "text-positive" : "text-negative",
              )}
            >
              {neutral ? formatSignedUsdt(Math.abs(amount)) : formatSignedUsdt(amount)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
