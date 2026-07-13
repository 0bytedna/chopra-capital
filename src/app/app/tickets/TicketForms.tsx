"use client";

import { useActionState, useRef, useEffect } from "react";
import { createTicket, replyToTicket, type TicketFormState } from "./actions";
import { Field, TextareaField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function NewTicketForm() {
  const [state, action] = useActionState<TicketFormState, FormData>(createTicket, {});

  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Field label="Subject" name="subject" required placeholder="What can we help with?" />
      <TextareaField label="Message" name="body" required placeholder="Describe the issue or question…" />
      <SubmitButton pendingLabel="Opening ticket…">Open ticket</SubmitButton>
    </form>
  );
}

export function ReplyForm({ ticketId }: { ticketId: string }) {
  const [state, action] = useActionState<TicketFormState, FormData>(replyToTicket, {});
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the textarea after a successful send.
  useEffect(() => {
    if (!state.error) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-3">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="ticketId" value={ticketId} />
      <TextareaField label="Reply" name="body" required placeholder="Write your reply…" />
      <SubmitButton size="sm" pendingLabel="Sending…">
        Send reply
      </SubmitButton>
    </form>
  );
}
