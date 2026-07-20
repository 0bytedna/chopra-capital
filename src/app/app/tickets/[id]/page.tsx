import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReplyForm } from "../TicketForms";
import { cn } from "@/lib/cn";
import { TicketAttachments } from "@/components/tickets/TicketAttachments";

export const metadata: Metadata = { title: "Ticket" };

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: { attachments: { orderBy: { createdAt: "asc" } } },
      },
    },
  });
  if (!ticket || ticket.userId !== user.id) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <Link href="/app/tickets" className="inline-flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink">
          <ArrowLeft className="size-3.5" aria-hidden />
          All tickets
        </Link>
        <h1 className="mt-3 font-serif text-2xl text-ink">{ticket.subject}</h1>
        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-ink-faint">
          Status: {ticket.status.toLowerCase()}
        </p>
      </header>

      <section className="space-y-4" aria-label="Conversation">
        {ticket.messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "max-w-[88%] rounded-2xl px-4 py-3.5 sm:max-w-[75%]",
              m.isStaff
                ? "border border-gold-500/25 bg-gold-600/8"
                : "glass-card ml-auto",
            )}
          >
            <p className="text-[10px] uppercase tracking-[0.16em] text-ink-faint">
              {m.isStaff ? "Chopra Capital" : "You"} ·{" "}
              {m.createdAt.toLocaleString("en-US", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink">{m.body}</p>
            <TicketAttachments attachments={m.attachments} />
          </div>
        ))}
      </section>

      <section className="glass-card rounded-2xl p-5 sm:p-6">
        {ticket.status === "CLOSED" ? (
          <p className="text-sm text-ink-faint">
            This ticket is closed. If you still need help,{" "}
            <Link href="/app/tickets" className="text-gold-400 hover:text-gold-300">
              open a new ticket
            </Link>
            .
          </p>
        ) : (
          <ReplyForm ticketId={ticket.id} />
        )}
      </section>
    </div>
  );
}
