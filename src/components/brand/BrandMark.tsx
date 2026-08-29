import { cn } from "@/lib/cn";

export function BrandMark({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn("relative inline-flex size-9 shrink-0", className)}
    >
      <svg
        viewBox="0 0 512 512"
        role="presentation"
        className="size-full"
        data-priority={priority || undefined}
      >
        <g fill="#d4af37">
          <path d="M 184 300 L 239 274 L 239 390 L 184 390 Z" />
          <path d="M 252 251 L 307 225 L 307 390 L 252 390 Z" />
          <path d="M 320 207 L 375 181 L 375 390 L 320 390 Z" />
        </g>
        <path
          d="M 377 145 A 153 181 0 1 0 373 372"
          fill="none"
          stroke="#0f192d"
          strokeWidth="66"
          strokeLinecap="butt"
        />
      </svg>
    </span>
  );
}
