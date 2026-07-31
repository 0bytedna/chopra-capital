import Image from "next/image";
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
      <Image
        src="/brand/chopra-capital-mark-c2.png"
        alt=""
        fill
        sizes="48px"
        priority={priority}
        className="object-contain"
      />
    </span>
  );
}