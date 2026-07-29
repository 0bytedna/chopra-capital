import { CopyButton } from "@/components/ui/CopyButton";
import { cn } from "@/lib/cn";

export type Mt5Detail = readonly [label: string, value: string];

export function Mt5AccountDetails({ details }: { details: readonly Mt5Detail[] }) {
  return (
    <dl className="grid sm:grid-cols-2">
      {details.map(([label, value], index) => (
        <div
          key={label}
          className={cn(
            "grid min-w-0 grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-3 px-5 py-3.5",
            index !== details.length - 1 && "border-b border-slate-200",
            index >= 2 && "sm:border-b-0",
            index % 2 === 0 && "sm:border-r sm:border-slate-200",
          )}
        >
          <dt className="text-xs font-medium uppercase leading-4 tracking-[.11em] text-ink-dim">
            {label}
          </dt>
          <dd className="grid min-w-0 grid-cols-[minmax(0,1fr)_1.75rem] items-center gap-2.5">
            <span className="min-w-0 break-words font-mono text-sm leading-5 text-ink">
              {value}
            </span>
            <CopyButton value={value} label={`Copy ${label}`} compact />
          </dd>
        </div>
      ))}
    </dl>
  );
}
