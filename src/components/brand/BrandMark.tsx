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
        <defs>
          <filter
            id="brand-bars-dark-gold"
            colorInterpolationFilters="sRGB"
          >
            <feColorMatrix
              type="matrix"
              values="
                -0.3230  0.6615  0.6615  0 -0.1038
                 0.2708  0.8646 -0.1354  0  0.0212
                 1.3020 -0.6510  0.3490  0  0.1021
                 0       0       0       1  0
              "
            />
          </filter>
        </defs>
        <image
          href="/brand/chopra-capital-mark-c2-green.png"
          width="512"
          height="512"
          filter="url(#brand-bars-dark-gold)"
        />
      </svg>
    </span>
  );
}
