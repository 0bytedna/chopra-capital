"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ticketSchema, replySchema } from "@/lib/validation";
import {
  removeStoredTicketAttachments,
  storeTicketAttachments,
  ticketFilesFrom,
} from "@/lib/ticketAttachments";

export type TicketFormState = { error?: string };

export async function createTicket(_prev: TicketFormState, formData: FormData): Promise<TicketFormState> {
  const user = await requireUser();

  const parsed = ticketSchema.safeParse({
    subject: formData.get("subject"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  }

  const ticketId = randomUUID();
  const messageId = randomUUID();
  let attachments;
  try {
    attachments = await storeTicketAttachments(ticketId, messageId, ticketFilesFrom(formData));
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not upload the attachments." };
  }

  try {
    await prisma.ticket.create({
      data: {
        id: ticketId,
        userId: user.id,
        subject: parsed.data.subject,
        messages: {
          create: {
            id: messageId,
            authorId: user.id,
            body: parsed.data.body,
            isStaff: false,
            attachments: { create: attachments },
          },
        },
      },
    });
  } catch {
    await removeStoredTicketAttachments(attachments);
    return { error: "Could not open the ticket. Please try again." };
  }

  revalidatePath("/admin/tickets");
  redirect(`/app/tickets/${ticketId}`);
}

export async function replyToTicket(_prev: TicketFormState, formData: FormData): Promise<TicketFormState> {
  const user = await requireUser();
  const ticketId = String(formData.get("ticketId") ?? "");

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket || ticket.userId !== user.id) return { error: "Ticket not found" };
  if (ticket.status === "CLOSED") return { error: "This ticket is closed — open a new one if you still need help." };

  const parsed = replySchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Message cannot be empty" };
  }

  const messageId = randomUUID();
  let attachments;
  try {
    attachments = await storeTicketAttachments(ticketId, messageId, ticketFilesFrom(formData));
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not upload the attachments." };
  }

  try {
    await prisma.$transaction([
      prisma.ticketMessage.create({
        data: {
          id: messageId,
          ticketId,
          authorId: user.id,
          body: parsed.data.body,
          isStaff: false,
          attachments: { create: attachments },
        },
      }),
      prisma.ticket.update({ where: { id: ticketId }, data: { status: "OPEN" } }),
    ]);
  } catch {
    await removeStoredTicketAttachments(attachments);
    return { error: "Could not send the reply. Please try again." };
  }

  revalidatePath(`/app/tickets/${ticketId}`);
  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
  return {};
}
