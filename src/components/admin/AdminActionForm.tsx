"use client";

// Generic inline admin form: binds a server action, shows its error/success
// state, and renders whatever fields are passed as children.

import { useActionState } from "react";
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
  className?: string;
  children?: ReactNode;
};

export function AdminActionForm({
  action,
  submitLabel,
  pendingLabel = "Working…",
  variant = "gold",
  confirmMessage,
  className,
  children,
}: Props) {
  const [state, formAction] = useActionState<AdminFormState, FormData>(action, {});

  return (
    <form
      action={formAction}
      className={cn("space-y-3", className)}
      onSubmit={(e) => {
        if (confirmMessage && !window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      {children}
      <SubmitButton size="sm" variant={variant} pendingLabel={pendingLabel}>
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
