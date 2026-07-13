"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ticketSchema, replySchema } from "@/lib/validation";

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

  const ticket = await prisma.ticket.create({
    data: {
      userId: user.id,
      subject: parsed.data.subject,
      messages: {
        create: { authorId: user.id, body: parsed.data.body, isStaff: false },
      },
    },
  });

  redirect(`/app/tickets/${ticket.id}`);
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

  await prisma.$transaction([
    prisma.ticketMessage.create({
      data: { ticketId, authorId: user.id, body: parsed.data.body, isStaff: false },
    }),
    prisma.ticket.update({ where: { id: ticketId }, data: { status: "OPEN" } }),
  ]);

  revalidatePath(`/app/tickets/${ticketId}`);
  return {};
}
