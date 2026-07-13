import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Props = HTMLAttributes<HTMLDivElement> & { hover?: boolean };

export function Card({ className, hover = false, ...props }: Props) {
  return <div className={cn("glass-card", hover && "glass-card-hover", className)} {...props} />;
}

export function CardEyebrow({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("eyebrow", className)} {...props} />;
}

export function Hairline({ className }: { className?: string }) {
  return <hr className={cn("hairline", className)} />;
}
