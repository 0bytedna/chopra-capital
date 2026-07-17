"use client";

// Per-investor toggle for which deposit methods an admin has enabled. Bank and
// cash deposits are only offered to investors whose flag is on.

import { useActionState } from "react";
import { adminSetDepositMethods, type AdminFormState } from "@/app/admin/actions";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";

type Props = {
  userId: string;
  bankEnabled: boolean;
  cashEnabled: boolean;
};

export function DepositMethodsToggle({ userId, bankEnabled, cashEnabled }: Props) {
  const [state, action] = useActionState<AdminFormState, FormData>(adminSetDepositMethods, {});

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="userId" value={userId} />
      <label className="flex items-center gap-2 text-xs text-ink-dim">
        <input
          type="checkbox"
          name="bankTransferEnabled"
          defaultChecked={bankEnabled}
          className="size-3.5 accent-gold-500"
        />
        Bank
      </label>
      <label className="flex items-center gap-2 text-xs text-ink-dim">
        <input
          type="checkbox"
          name="cashEnabled"
          defaultChecked={cashEnabled}
          className="size-3.5 accent-gold-500"
        />
        Cash
      </label>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      <SubmitButton size="sm" variant="ghost" pendingLabel="Saving…">
        Save
      </SubmitButton>
    </form>
  );
}
