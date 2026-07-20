"use client";

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
    <form action={action} className="space-y-2.5">
      <input type="hidden" name="userId" value={userId} />
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-8 cursor-pointer items-center gap-2 rounded-full border border-gold-600/20 bg-vault-950/30 px-3 text-xs text-ink-dim transition-colors has-checked:border-gold-500/45 has-checked:bg-gold-600/10 has-checked:text-gold-300">
          <input
            type="checkbox"
            name="bankTransferEnabled"
            defaultChecked={bankEnabled}
            className="size-3.5 accent-gold-500"
          />
          Bank
        </label>
        <label className="flex h-8 cursor-pointer items-center gap-2 rounded-full border border-gold-600/20 bg-vault-950/30 px-3 text-xs text-ink-dim transition-colors has-checked:border-gold-500/45 has-checked:bg-gold-600/10 has-checked:text-gold-300">
          <input
            type="checkbox"
            name="cashEnabled"
            defaultChecked={cashEnabled}
            className="size-3.5 accent-gold-500"
          />
          Cash
        </label>
        <SubmitButton size="sm" variant="ghost" pendingLabel="Saving…">
          Update access
        </SubmitButton>
      </div>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
    </form>
  );
}
