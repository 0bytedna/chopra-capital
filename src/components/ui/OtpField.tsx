"use client";

import { useRef, type InputHTMLAttributes } from "react";
import { ClipboardPaste } from "lucide-react";
import { cn } from "@/lib/cn";

const standardInputClass =
  "min-w-0 w-full rounded-lg border border-gold-600/20 bg-vault-900/80 py-2.5 pl-3.5 pr-12 text-sm text-ink placeholder:text-ink-faint transition-colors focus:border-gold-500/50 focus:outline-none focus:ring-2 focus:ring-gold-500/25";
const lightInputClass =
  "min-w-0 h-11 w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-3 pr-12 text-sm text-ink outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

type OtpFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  name: string;
  hint?: string;
  error?: string;
  tone?: "standard" | "light";
  inputClassName?: string;
  onPasteValue?: (code: string) => void;
};

export function OtpField({
  label,
  name,
  id = name,
  hint,
  error,
  className,
  inputClassName,
  tone = "standard",
  onPasteValue,
  ...props
}: OtpFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function pasteCode() {
    try {
      const clipboardText = await navigator.clipboard.readText();
      const code = clipboardText.replace(/\D/g, "").slice(0, 6);
      if (!code || !inputRef.current) return;

      inputRef.current.value = code;
      onPasteValue?.(code);
      inputRef.current.dispatchEvent(new Event("input", { bubbles: true }));
      inputRef.current.focus();
    } catch {
      inputRef.current?.focus();
    }
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-xs font-medium uppercase tracking-[0.14em] text-ink-dim">
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          className={cn(tone === "light" ? lightInputClass : standardInputClass, inputClassName)}
          {...props}
        />
        <button
          type="button"
          onClick={pasteCode}
          className="absolute right-1.5 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-ink-dim transition-colors hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Paste authentication code"
          title="Paste code"
        >
          <ClipboardPaste className="size-4" aria-hidden />
        </button>
      </div>
      {hint && !error && <p className="text-xs text-ink-faint">{hint}</p>}
      {error && <p className="text-xs text-negative">{error}</p>}
    </div>
  );
}
