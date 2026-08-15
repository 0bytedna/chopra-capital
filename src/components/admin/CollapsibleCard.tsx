import type { ReactNode } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export function CollapsibleCard({
  title,
  children,
  Icon,
  count,
  defaultOpen = false,
  className,
  contentClassName,
}: {
  title: string;
  children: ReactNode;
  Icon?: LucideIcon;
  count?: number | string;
  defaultOpen?: boolean;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <details
      open={defaultOpen}
      className={cn("group glass-card min-w-0 overflow-hidden rounded-2xl", className)}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 select-none [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2.5">
          {Icon && (
            <Icon className="size-4 shrink-0 text-gold-400" aria-hidden />
          )}
          <span className="truncate font-serif text-lg text-ink sm:text-xl">
            {title}
          </span>
          {count !== undefined && (
            <span className="rounded-full border border-gold-600/15 bg-gold-600/8 px-2 py-0.5 text-xs text-ink-faint">
              {count}
            </span>
          )}
        </span>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-gold-600/20 bg-white text-gold-400">
          <ChevronDown
            className="size-4 transition-transform duration-200 group-open:rotate-180"
            aria-hidden
          />
          <span className="sr-only">Expand or collapse {title}</span>
        </span>
      </summary>
      <div className={cn("border-t border-gold-600/10 p-4 sm:p-5", contentClassName)}>
        {children}
      </div>
    </details>
  );
}
