import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const inputClass =
  "min-w-0 w-full rounded-lg border border-gold-600/20 bg-vault-900/80 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-gold-500/50 focus:outline-none focus:ring-2 focus:ring-gold-500/25 transition-colors";

type FieldProps = {
  label: string;
  name: string;
  hint?: string;
  error?: string;
} & InputHTMLAttributes<HTMLInputElement>;

export function Field({ label, name, id = name, hint, error, className, ...props }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-xs font-medium uppercase tracking-[0.14em] text-ink-dim">
        {label}
      </label>
      <input id={id} name={name} className={inputClass} {...props} />
      {hint && !error && <p className="text-xs text-ink-faint">{hint}</p>}
      {error && <p className="text-xs text-negative">{error}</p>}
    </div>
  );
}

type SelectFieldProps = {
  label: string;
  name: string;
  hint?: string;
  error?: string;
} & SelectHTMLAttributes<HTMLSelectElement>;

export function SelectField({ label, name, id = name, hint, error, className, children, ...props }: SelectFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-xs font-medium uppercase tracking-[0.14em] text-ink-dim">
        {label}
      </label>
      <select id={id} name={name} className={inputClass} {...props}>
        {children}
      </select>
      {hint && !error && <p className="text-xs text-ink-faint">{hint}</p>}
      {error && <p className="text-xs text-negative">{error}</p>}
    </div>
  );
}

type TextareaFieldProps = {
  label: string;
  name: string;
  hint?: string;
  error?: string;
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextareaField({ label, name, id = name, hint, error, className, ...props }: TextareaFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-xs font-medium uppercase tracking-[0.14em] text-ink-dim">
        {label}
      </label>
      <textarea id={id} name={name} rows={4} className={inputClass} {...props} />
      {hint && !error && <p className="text-xs text-ink-faint">{hint}</p>}
      {error && <p className="text-xs text-negative">{error}</p>}
    </div>
  );
}
