"use client";

import { useActionState, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Pencil, Trash2, X } from "lucide-react";
import {
  adminDeleteTradingAdjustment,
  adminEditTradingAdjustment,
  type AdminFormState,
} from "@/app/admin/actions";
import { Alert } from "@/components/ui/Alert";

type EditableType =
  | "TRADING_PROFIT"
  | "TRADING_LOSS"
  | "SERVER_FEE"
  | "ADMIN_SHARE"
  | "OTHER_INCREASE"
  | "OTHER_DECREASE";

const typeOptions: Array<{ value: EditableType; label: string }> = [
  { value: "TRADING_PROFIT", label: "Trading profit" },
  { value: "TRADING_LOSS", label: "Trading loss" },
  { value: "SERVER_FEE", label: "Server or operating fee" },
  { value: "ADMIN_SHARE", label: "Company's profit share" },
  { value: "OTHER_INCREASE", label: "Other increase" },
  { value: "OTHER_DECREASE", label: "Other decrease" },
];

type Props = {
  id: string;
  type: EditableType;
  amount: string;
  note: string;
};

function EditTradingEntryDialog({
  entry,
  onClose,
}: {
  entry: Props;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState<AdminFormState, FormData>(
    adminEditTradingAdjustment,
    {},
  );

  useEffect(() => {
    if (state.success) onClose();
  }, [onClose, state.success]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-trading-entry-heading"
        className="glass-card max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl p-5 shadow-2xl sm:p-6"
      >
        <div className="flex items-center justify-between gap-4">
          <h2
            id="edit-trading-entry-heading"
            className="font-serif text-2xl text-ink"
          >
            Edit account change
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-300 text-ink-dim transition-colors hover:bg-slate-100 disabled:opacity-50"
            aria-label="Close edit dialog"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <form action={action} className="mt-5 space-y-4">
          <input type="hidden" name="id" value={entry.id} />
          {state.error && <Alert tone="error">{state.error}</Alert>}

          <label className="block space-y-1.5 text-xs text-ink-faint">
            Reason
            <select
              name="type"
              defaultValue={entry.type}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-ink"
            >
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5 text-xs text-ink-faint">
            Amount (USD)
            <input
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              defaultValue={entry.amount}
              required
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-ink"
            />
          </label>

          <label className="block space-y-1.5 text-xs text-ink-faint">
            Audit note
            <input
              name="note"
              maxLength={240}
              defaultValue={entry.note}
              required
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-ink"
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

export function TradingEntryActions(props: Props) {
  const [editing, setEditing] = useState(false);
  const [deleteState, deleteAction, deleting] = useActionState<
    AdminFormState,
    FormData
  >(adminDeleteTradingAdjustment, {});

  return (
    <div className="min-w-24">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex size-9 items-center justify-center rounded-full border border-blue-300 text-blue-700 transition-colors hover:bg-blue-50"
          aria-label="Edit audit entry"
          title="Edit"
        >
          <Pencil className="size-4" aria-hidden />
        </button>
        <form
          action={deleteAction}
          onSubmit={(event) => {
            if (
              !window.confirm(
                "Delete this manual adjustment? All later balances and chart values will be recalculated.",
              )
            ) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={props.id} />
          <button
            type="submit"
            disabled={deleting}
            className="flex size-9 items-center justify-center rounded-full border border-red-300 text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
            aria-label="Delete audit entry"
            title="Delete"
          >
            {deleting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="size-4" aria-hidden />
            )}
          </button>
        </form>
      </div>
      {deleteState.error && (
        <p className="mt-2 max-w-48 text-[11px] leading-snug text-negative">
          {deleteState.error}
        </p>
      )}
      {editing && (
        <EditTradingEntryDialog entry={props} onClose={() => setEditing(false)} />
      )}
    </div>
  );
}
