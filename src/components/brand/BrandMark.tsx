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
          <linearGradient
            id="brand-bars-metallic-gold"
            x1="175"
            y1="420"
            x2="408"
            y2="175"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#8f5d07" />
            <stop offset="20%" stopColor="#d2a128" />
            <stop offset="38%" stopColor="#f8dd8a" />
            <stop offset="50%" stopColor="#fff3bb" />
            <stop offset="65%" stopColor="#e5b73f" />
            <stop offset="82%" stopColor="#b87907" />
            <stop offset="100%" stopColor="#efd079" />
          </linearGradient>

          <filter id="brand-bars-mask-filter" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="
                 0        0        0        0  1
                 0        0        0        0  1
                 0        0        0        0  1
                -2.65625  1.328125  1.328125  0 -0.208333
              "
              result="bar-class"
            />
            <feComposite in="bar-class" in2="SourceAlpha" operator="in" />
          </filter>

          <filter id="brand-c-only-filter" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="
                 0        0        0        0  1
                 0        0        0        0  1
                 0        0        0        0  1
                -2.65625  1.328125  1.328125  0 -0.208333
              "
              result="bar-class"
            />
            <feComposite
              in="bar-class"
              in2="SourceAlpha"
              operator="in"
              result="bar-mask"
            />
            <feComposite in="SourceGraphic" in2="bar-mask" operator="out" />
          </filter>

          <mask id="brand-bars-mask">
            <image
              href="/brand/chopra-capital-mark-c2-green.png"
              width="512"
              height="512"
              filter="url(#brand-bars-mask-filter)"
            />
          </mask>
        </defs>

        <rect
          width="512"
          height="512"
          fill="url(#brand-bars-metallic-gold)"
          mask="url(#brand-bars-mask)"
        />
        <image
          href="/brand/chopra-capital-mark-c2-green.png"
          width="512"
          height="512"
          filter="url(#brand-c-only-filter)"
        />
        <path
          d="M 394 349 L 443 391 L 410 424 L 361 381 Z"
          fill="#0f192d"
        />
      </svg>
    </span>
  );
}
