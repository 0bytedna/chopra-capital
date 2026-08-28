"use client";

import { useActionState, useRef, useEffect } from "react";
import { Plus, X } from "lucide-react";
import {
  createTicket,
  reopenTicket,
  replyToTicket,
  type TicketFormState,
} from "./actions";
import { Field, TextareaField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { AttachmentInput } from "@/components/tickets/AttachmentInput";

export function NewTicketForm() {
  const [state, action] = useActionState<TicketFormState, FormData>(
    createTicket,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Field
        label="Subject"
        name="subject"
        required
        placeholder="What can we help with?"
      />
      <TextareaField
        label="Message"
        name="body"
        required
        placeholder="Describe the issue or question…"
      />
      <AttachmentInput />
      <SubmitButton pendingLabel="Opening ticket…">Open ticket</SubmitButton>
    </form>
  );
}

export function NewTicketDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        className="btn-gold min-h-10 shrink-0 px-4 text-sm"
        onClick={() => dialogRef.current?.showModal()}
      >
        <Plus className="size-4" aria-hidden />
        Open new ticket
      </button>
      <dialog
        ref={dialogRef}
        className="fixed inset-0 m-auto max-h-[90svh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-stone-200 bg-white p-0 text-ink shadow-2xl backdrop:bg-stone-950/55 backdrop:backdrop-blur-sm"
      >
        <div className="p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="font-serif text-xl text-ink">Open new ticket</h2>
            <button
              type="button"
              aria-label="Close new ticket form"
              onClick={() => dialogRef.current?.close()}
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-stone-200 text-ink-dim transition-colors hover:bg-stone-50 hover:text-ink"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <NewTicketForm />
        </div>
      </dialog>
    </>
  );
}

export function ReplyForm({ ticketId }: { ticketId: string }) {
  const [state, action] = useActionState<TicketFormState, FormData>(
    replyToTicket,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.error) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-3">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="ticketId" value={ticketId} />
      <TextareaField
        label="Reply"
        name="body"
        required
        placeholder="Write your reply…"
      />
      <AttachmentInput />
      <SubmitButton size="sm" pendingLabel="Sending…">
        Send reply
      </SubmitButton>
    </form>
  );
}

export function ReopenTicketForm({ ticketId }: { ticketId: string }) {
  const [state, action] = useActionState<TicketFormState, FormData>(
    reopenTicket,
    {},
  );

  return (
    <form action={action} className="space-y-3">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="ticketId" value={ticketId} />
      <SubmitButton size="sm" pendingLabel="Reopening...">
        Reopen ticket
      </SubmitButton>
    </form>
  );
}