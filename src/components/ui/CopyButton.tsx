"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/cn";

export function CopyButton({ value, label = "Copy", className }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard unavailable (permissions/insecure context) — leave state as-is.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied" : label}
      title={copied ? "Copied" : label}
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-gold-600/25 text-ink-dim transition-colors hover:border-gold-500/50 hover:text-ink",
        className,
      )}
    >
      {copied ? <Check className="size-4 text-positive" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      <span className="sr-only">{copied ? "Copied" : label}</span>
    </button>
  );
}
