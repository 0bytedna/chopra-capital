"use client";

import { useActionState, useRef } from "react";
import { AlertTriangle, Check, Loader2, X } from "lucide-react";
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
}: {
  label: string;
  tone: "approve" | "reject" | "correct";
  pending: boolean;
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "approve"
      ? "border-positive/35 bg-positive/8 text-positive hover:bg-positive/15"
      : tone === "reject"
        ? "border-negative/35 bg-negative/8 text-negative hover:bg-negative/15"
        : "border-amber-500/35 bg-amber-500/8 text-amber-700 hover:bg-amber-500/15";

  return (
    <button
      type="submit"
      title={label}
      aria-label={label}
      disabled={pending}
      className={`inline-flex size-9 items-center justify-center rounded-full border transition-colors disabled:cursor-wait disabled:opacity-50 ${toneClass}`}
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : children}
    </button>
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
  const rejectNoteRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <div className="flex justify-end gap-2">
        <form
          action={approveFormAction}
          onSubmit={(event) => {
            if (
              !window.confirm(
                `Approve this ${grossUsd} USD withdrawal and reserve it for the broker batch?`,
              )
            ) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="grossUsd" value={grossUsd} />
          <IconButton label="Approve withdrawal" tone="approve" pending={approving}>
            <Check className="size-5" aria-hidden />
          </IconButton>
        </form>

        <form
          action={rejectFormAction}
          onSubmit={(event) => {
            const note = window.prompt(
              "Reason for rejection (optional). This will be shown to the investor:",
              "",
            );
            if (note === null) {
              event.preventDefault();
              return;
            }
            if (rejectNoteRef.current) rejectNoteRef.current.value = note.trim();
          }}
        >
          <input type="hidden" name="id" value={id} />
          <input ref={rejectNoteRef} type="hidden" name="note" />
          <IconButton label="Reject withdrawal" tone="reject" pending={rejecting}>
            <X className="size-5" aria-hidden />
          </IconButton>
        </form>
      </div>
      <InlineError>{approveState.error ?? rejectState.error}</InlineError>
    </div>
  );
}

export function DepositReviewActions({
  id,
  method,
  approveAction,
  correctionAction,
  rejectAction,
}: {
  id: string;
  method: "CRYPTO" | "BANK" | "CASH";
  approveAction: Action;
  correctionAction: Action;
  rejectAction: Action;
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
  const correctionNoteRef = useRef<HTMLInputElement>(null);
  const rejectNoteRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <div className="flex justify-end gap-2">
        <form
          action={approveFormAction}
          onSubmit={(event) => {
            const destination =
              method === "CRYPTO" ? "the company-wallet queue" : "INR conversion";
            if (
              !window.confirm(
                `Confirm that the funds were received and move this request to ${destination}?`,
              )
            ) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={id} />
          <IconButton label="Confirm funds received" tone="approve" pending={approving}>
            <Check className="size-5" aria-hidden />
          </IconButton>
        </form>

        {method !== "CASH" && (
          <form
            action={correctionFormAction}
            onSubmit={(event) => {
              const note = window.prompt(
                method === "BANK"
                  ? "What must the investor correct about the UTR?"
                  : "What must the investor correct about the transaction hash?",
                "",
              );
              if (!note?.trim()) {
                event.preventDefault();
                return;
              }
              if (correctionNoteRef.current) {
                correctionNoteRef.current.value = note.trim();
              }
            }}
          >
            <input type="hidden" name="id" value={id} />
            <input ref={correctionNoteRef} type="hidden" name="note" />
            <IconButton
              label="Request corrected payment details"
              tone="correct"
              pending={correcting}
            >
              <AlertTriangle className="size-4" aria-hidden />
            </IconButton>
          </form>
        )}

        <form
          action={rejectFormAction}
          onSubmit={(event) => {
            const note = window.prompt(
              "Reason for rejection (optional). This will be shown to the investor:",
              "",
            );
            if (note === null) {
              event.preventDefault();
              return;
            }
            if (rejectNoteRef.current) rejectNoteRef.current.value = note.trim();
          }}
        >
          <input type="hidden" name="id" value={id} />
          <input ref={rejectNoteRef} type="hidden" name="note" />
          <IconButton label="Reject deposit" tone="reject" pending={rejecting}>
            <X className="size-5" aria-hidden />
          </IconButton>
        </form>
      </div>
      <InlineError>
        {approveState.error ?? correctionState.error ?? rejectState.error}
      </InlineError>
    </div>
  );
}
