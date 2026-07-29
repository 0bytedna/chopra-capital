import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "gold" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const sizeClasses: Record<Size, string> = {
  sm: "px-4 py-1.5 text-sm",
  md: "px-6 py-2.5 text-sm",
  lg: "px-8 py-3 text-base",
};

function variantClass(variant: Variant): string {
  if (variant === "gold") return "btn-gold";
  if (variant === "danger")
    return "inline-flex items-center justify-center gap-2 rounded-full border border-negative/40 text-negative hover:bg-negative/10 transition-colors font-medium";
  return "btn-ghost";
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({ variant = "gold", size = "md", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(variantClass(variant), sizeClasses[size], "min-w-0 max-w-full whitespace-normal text-center disabled:opacity-50 disabled:pointer-events-none", className)}
      {...props}
    />
  );
}

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
};

export function ButtonLink({ href, children, variant = "gold", size = "md", className }: ButtonLinkProps) {
  return (
    <Link href={href} className={cn(variantClass(variant), sizeClasses[size], "min-w-0 max-w-full whitespace-normal text-center", className)}>
      {children}
    </Link>
  );
}
