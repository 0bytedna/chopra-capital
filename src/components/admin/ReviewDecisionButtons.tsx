"use client";

import { startTransition, useActionState, useState } from "react";
import { AlertTriangle, Check, Loader2, ShieldCheck, X } from "lucide-react";
import type { AdminFormState } from "@/app/admin/actions";

type Action = (
  previousState: AdminFormState,
  formData: FormData,
) => Promise<AdminFormState>;

function IconButton({
  label,
  tone,
  pending,
  children,
  type = "submit",
  onClick,
}: {
  label: string;
  tone: "approve" | "reject" | "correct";
  pending: boolean;
  children: React.ReactNode;
  type?: "submit" | "button";
  onClick?: () => void;
}) {
  const toneClass =
    tone === "approve"
      ? "border-positive/35 bg-positive/8 text-positive hover:bg-positive/15"
      : tone === "reject"
        ? "border-negative/35 bg-negative/8 text-negative hover:bg-negative/15"
        : "border-amber-500/35 bg-amber-500/8 text-amber-700 hover:bg-amber-500/15";

  return (
    <button
      type={type}
      onClick={onClick}
      title={label}
      aria-label={label}
      disabled={pending}
      className={`inline-flex size-9 items-center justify-center rounded-full border transition-colors disabled:cursor-wait disabled:opacity-50 ${toneClass}`}
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : children}
    </button>
  );
}

function FinancialDecisionDialog({
  title,
  message,
  tone,
  noteLabel,
  note,
  onNoteChange,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  tone: "approve" | "reject" | "correct";
  noteLabel?: string;
  note: string;
  onNoteChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button type="button" aria-label="Cancel action" onClick={onCancel} className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
      <section role="dialog" aria-modal="true" className="product-window relative z-10 w-full max-w-md rounded-2xl p-5 shadow-2xl">
        <div className="flex items-center justify-between gap-3"><span className="flex size-10 items-center justify-center rounded-full bg-gold-100 text-gold-700"><ShieldCheck className="size-5" /></span><button type="button" onClick={onCancel} aria-label="Close" className="rounded-full border border-stone-200 p-2"><X className="size-4" /></button></div>
        <h2 className="mt-4 font-serif text-xl text-ink">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-ink-dim">{message}</p>
        {noteLabel && <label className="mt-4 block text-xs font-medium uppercase tracking-[0.12em] text-ink-faint">{noteLabel}<textarea value={note} onChange={(event) => onNoteChange(event.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-stone-300 bg-white p-3 text-sm normal-case tracking-normal text-ink" /></label>}
        <p className="mt-3 rounded-lg border border-gold-600/15 bg-gold-50 px-3 py-2 text-xs text-gold-800">This action is recorded against the signed-in administrator.</p>
        <div className="mt-5 grid grid-cols-2 gap-3"><button type="button" onClick={onCancel} className="h-11 rounded-lg border border-stone-300 bg-white text-sm font-semibold text-ink">Cancel</button><button type="button" onClick={onConfirm} className={`h-11 rounded-lg text-sm font-semibold text-white ${tone === "reject" ? "bg-rose-600" : tone === "correct" ? "bg-amber-600" : "bg-emerald-600"}`}>Confirm</button></div>
      </section>
    </div>
  );
}

function InlineError({ children }: { children?: string }) {
  return children ? (
    <p className="mt-1 max-w-52 text-right text-xs text-negative" role="alert">
      {children}
    </p>
  ) : null;
}

export function WithdrawalReviewActions({
  id,
  grossUsd,
  approveAction,
  rejectAction,
}: {
  id: string;
  grossUsd: string;
  approveAction: Action;
  rejectAction: Action;
}) {
  const [approveState, approveFormAction, approving] = useActionState<
    AdminFormState,
    FormData
  >(approveAction, {});
  const [rejectState, rejectFormAction, rejecting] = useActionState<
    AdminFormState,
    FormData
  >(rejectAction, {});
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  const [note, setNote] = useState("");

  return (
    <div>
      <div className="flex justify-end gap-2">
          <IconButton type="button" onClick={() => setDecision("approve")} label="Approve withdrawal" tone="approve" pending={approving}>
            <Check className="size-5" aria-hidden />
          </IconButton>
          <IconButton type="button" onClick={() => setDecision("reject")} label="Reject withdrawal" tone="reject" pending={rejecting}>
            <X className="size-5" aria-hidden />
          </IconButton>
      </div>
      <InlineError>{approveState.error ?? rejectState.error}</InlineError>
      {decision && <FinancialDecisionDialog title={decision === "approve" ? "Approve withdrawal" : "Reject withdrawal"} message={decision === "approve" ? `Approve ${grossUsd} USD and reserve it for the broker batch?` : "Reject this withdrawal request? The investor will see the reason entered below."} tone={decision} noteLabel={decision === "reject" ? "Reason (optional)" : undefined} note={note} onNoteChange={setNote} onCancel={() => { setDecision(null); setNote(""); }} onConfirm={() => { const data = new FormData(); data.set("id", id); if (decision === "approve") { data.set("grossUsd", grossUsd); startTransition(() => approveFormAction(data)); } else { data.set("note", note.trim()); startTransition(() => rejectFormAction(data)); } setDecision(null); setNote(""); }} />}
    </div>
  );
}

export function DepositReviewActions({
  id,
  method,
  approveAction,
  correctionAction,
  rejectAction,
  allowCorrection = true,
}: {
  id: string;
  method: "CRYPTO" | "BANK" | "CASH";
  approveAction: Action;
  correctionAction: Action;
  rejectAction: Action;
  allowCorrection?: boolean;
}) {
  const [approveState, approveFormAction, approving] = useActionState<
    AdminFormState,
    FormData
  >(approveAction, {});
  const [correctionState, correctionFormAction, correcting] = useActionState<
    AdminFormState,
    FormData
  >(correctionAction, {});
  const [rejectState, rejectFormAction, rejecting] = useActionState<
    AdminFormState,
    FormData
  >(rejectAction, {});
  const [decision, setDecision] = useState<"approve" | "correct" | "reject" | null>(null);
  const [note, setNote] = useState("");

  return (
    <div>
      <div className="flex justify-end gap-2">
          <IconButton type="button" onClick={() => setDecision("approve")} label="Confirm funds received" tone="approve" pending={approving}>
            <Check className="size-5" aria-hidden />
          </IconButton>

        {method !== "CASH" && allowCorrection && (
            <IconButton
              type="button"
              onClick={() => setDecision("correct")}
              label="Request corrected payment details"
              tone="correct"
              pending={correcting}
            >
              <AlertTriangle className="size-4" aria-hidden />
            </IconButton>
        )}

          <IconButton type="button" onClick={() => setDecision("reject")} label="Reject deposit" tone="reject" pending={rejecting}>
            <X className="size-5" aria-hidden />
          </IconButton>
      </div>
      <InlineError>
        {approveState.error ?? correctionState.error ?? rejectState.error}
      </InlineError>
      {decision && <FinancialDecisionDialog title={decision === "approve" ? "Confirm deposit" : decision === "correct" ? "Request correction" : "Reject deposit"} message={decision === "approve" ? `Confirm receipt and move this deposit to ${method === "CRYPTO" ? "the company-wallet queue" : "INR conversion"}?` : decision === "correct" ? "Explain what payment detail the investor must correct." : "Reject this deposit request? The investor will see the reason entered below."} tone={decision} noteLabel={decision === "approve" ? undefined : decision === "correct" ? "Correction required" : "Reason (optional)"} note={note} onNoteChange={setNote} onCancel={() => { setDecision(null); setNote(""); }} onConfirm={() => { if (decision === "correct" && !note.trim()) return; const data = new FormData(); data.set("id", id); if (decision !== "approve") data.set("note", note.trim()); startTransition(() => decision === "approve" ? approveFormAction(data) : decision === "correct" ? correctionFormAction(data) : rejectFormAction(data)); setDecision(null); setNote(""); }} />}
    </div>
  );
}
