"use client";

import { useActionState, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Pencil, X } from "lucide-react";
import {
  adminEditBrokerTransferBatch,
  adminEditDepositAllocationBatch,
  type AdminFormState,
} from "@/app/admin/actions";
import { Alert } from "@/components/ui/Alert";

type Props = {
  kind: "CONVERSION" | "BROKER";
  id: string;
  currentTotal: string;
  maximumTotal?: string;
};

function BatchEditDialog({ batch, onClose }: { batch: Props; onClose: () => void }) {
  const action = batch.kind === "CONVERSION"
    ? adminEditDepositAllocationBatch
    : adminEditBrokerTransferBatch;
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(action, {});

  useEffect(() => {
    if (state.success) onClose();
  }, [onClose, state.success]);

  const title = batch.kind === "CONVERSION"
    ? "Edit conversion batch"
    : "Edit broker transfer";
  const fieldName = batch.kind === "CONVERSION" ? "totalUsdt" : "totalReceivedUsdt";
  const fieldLabel = batch.kind === "CONVERSION"
    ? "Total USDT after conversion"
    : "Total USDT received by broker";

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/45 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-edit-heading"
        className="glass-card w-full max-w-md rounded-2xl p-5 shadow-2xl sm:p-6"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id="batch-edit-heading" className="font-serif text-2xl text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-stone-300 text-ink-dim hover:bg-stone-100 disabled:opacity-50"
            aria-label="Close edit dialog"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <form action={formAction} className="mt-5 space-y-4">
          <input type="hidden" name="id" value={batch.id} />
          {state.error && <Alert tone="error">{state.error}</Alert>}

          <label className="block space-y-1.5 text-xs text-ink-faint">
            {fieldLabel}
            <input
              name={fieldName}
              type="number"
              min="0.00000001"
              max={batch.maximumTotal}
              step="0.00000001"
              inputMode="decimal"
              defaultValue={batch.currentTotal}
              required
              className="h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-ink"
            />
          </label>

          <label className="block space-y-1.5 text-xs text-ink-faint">
            Audit reason
            <textarea
              name="reason"
              maxLength={500}
              rows={3}
              required
              placeholder="Why is this value being corrected?"
              className="w-full resize-none rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-ink"
            />
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="btn-ghost px-4 py-2 text-sm disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="btn-gold inline-flex min-w-28 items-center justify-center gap-2 px-4 py-2 text-sm disabled:opacity-50"
            >
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {pending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

export function TransactionBatchEditAction(props: Props) {
  const [editing, setEditing] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-gold-300 text-gold-700 transition-colors hover:bg-gold-50"
        aria-label={props.kind === "CONVERSION" ? "Edit conversion batch" : "Edit broker transfer"}
        title="Edit"
      >
        <Pencil className="size-4" aria-hidden />
      </button>
      {editing && <BatchEditDialog batch={props} onClose={() => setEditing(false)} />}
    </>
  );
}
