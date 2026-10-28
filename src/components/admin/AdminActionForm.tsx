"use client";

// Generic inline admin form: binds a server action, shows its error/success
// state, and renders whatever fields are passed as children.

import { useActionState, useEffect, useRef, useState } from "react";
import { ShieldCheck, X } from "lucide-react";
import type { ReactNode } from "react";
import type { AdminFormState } from "@/app/admin/actions";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { cn } from "@/lib/cn";

type Props = {
  action: (prev: AdminFormState, formData: FormData) => Promise<AdminFormState>;
  submitLabel: string;
  pendingLabel?: string;
  variant?: "gold" | "ghost" | "danger";
  confirmMessage?: string;
  resetOnSuccess?: boolean;
  showSuccess?: boolean;
  className?: string;
  submitClassName?: string;
  children?: ReactNode;
};

export function AdminActionForm({
  action,
  submitLabel,
  pendingLabel = "Working…",
  variant = "gold",
  confirmMessage,
  resetOnSuccess = false,
  showSuccess = true,
  className,
  submitClassName,
  children,
}: Props) {
  const [state, formAction] = useActionState<AdminFormState, FormData>(action, {});
  const formRef = useRef<HTMLFormElement>(null);
  const bypassConfirmation = useRef(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (resetOnSuccess && state.success) formRef.current?.reset();
  }, [resetOnSuccess, state.success]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className={cn("space-y-3", className)}
      onSubmit={(e) => {
        if (confirmMessage && !bypassConfirmation.current) {
          e.preventDefault();
          setConfirming(true);
          return;
        }
        bypassConfirmation.current = false;
      }}
    >
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {showSuccess && state.success && (
        <Alert tone="success">{state.success}</Alert>
      )}
      {children}
      <SubmitButton size="sm" variant={variant} pendingLabel={pendingLabel} className={submitClassName}>
        {submitLabel}
      </SubmitButton>
      {confirming && confirmMessage && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <button type="button" aria-label="Cancel confirmation" onClick={() => setConfirming(false)} className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
          <section role="dialog" aria-modal="true" aria-labelledby="admin-confirm-title" className="product-window relative z-10 w-full max-w-md rounded-2xl p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-100 text-gold-700"><ShieldCheck className="size-5" /></span>
              <button type="button" onClick={() => setConfirming(false)} aria-label="Close" className="rounded-full border border-stone-200 p-2 text-ink-dim"><X className="size-4" /></button>
            </div>
            <h2 id="admin-confirm-title" className="mt-4 font-serif text-xl text-ink">Confirm financial action</h2>
            <p className="mt-2 text-sm leading-6 text-ink-dim">{confirmMessage}</p>
            <div className="mt-4 rounded-lg border border-gold-600/15 bg-gold-50 px-3 py-2 text-xs text-gold-800">This action is attributed to the signed-in administrator and recorded in the audit trail.</div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setConfirming(false)} className="h-11 rounded-lg border border-stone-300 bg-white text-sm font-semibold text-ink">Cancel</button>
              <button type="button" onClick={() => { setConfirming(false); bypassConfirmation.current = true; formRef.current?.requestSubmit(); }} className={cn("h-11 rounded-lg text-sm font-semibold text-white", variant === "danger" ? "bg-rose-600 hover:bg-rose-700" : "bg-gold-600 hover:bg-gold-700")}>Confirm action</button>
            </div>
          </section>
        </div>
      )}
    </form>
  );
}
