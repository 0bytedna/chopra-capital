import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { adminReplyTicket, adminCloseTicket } from "../../actions";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Admin · Ticket" };

export default async function AdminTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, fullName: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!ticket) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <Link href="/admin/tickets" className="inline-flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink">
          <ArrowLeft className="size-3.5" aria-hidden />
          All tickets
        </Link>
        <h1 className="mt-3 font-serif text-2xl text-ink">{ticket.subject}</h1>
        <p className="mt-1 text-xs text-ink-faint">
          {ticket.user.fullName ?? "—"} · {ticket.user.email} · status {ticket.status.toLowerCase()}
        </p>
      </header>

      <section className="space-y-4" aria-label="Conversation">
        {ticket.messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "max-w-[88%] rounded-2xl px-4 py-3.5 sm:max-w-[75%]",
              m.isStaff ? "ml-auto border border-gold-500/25 bg-gold-600/8" : "glass-card",
            )}
          >
            <p className="text-[10px] uppercase tracking-[0.16em] text-ink-faint">
              {m.isStaff ? "Staff" : "Investor"} ·{" "}
              {m.createdAt.toLocaleString("en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink">{m.body}</p>
          </div>
        ))}
      </section>

      {ticket.status !== "CLOSED" && (
        <section className="glass-card space-y-6 rounded-2xl p-5 sm:p-6">
          <AdminActionForm action={adminReplyTicket} submitLabel="Send reply" pendingLabel="Sending…">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <label className="block text-xs uppercase tracking-[0.14em] text-ink-dim" htmlFor="reply">
              Reply as staff
            </label>
            <textarea
              id="reply"
              name="body"
              rows={4}
              required
              className="w-full rounded-lg border border-gold-600/20 bg-vault-900/80 px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-gold-500/50 focus:outline-none"
              placeholder="Write a reply…"
            />
          </AdminActionForm>
          <hr className="hairline" />
          <AdminActionForm
            action={adminCloseTicket}
            submitLabel="Close ticket"
            variant="danger"
            pendingLabel="Closing…"
            confirmMessage="Close this ticket? The investor will need to open a new one to continue."
          >
            <input type="hidden" name="ticketId" value={ticket.id} />
          </AdminActionForm>
        </section>
      )}
    </div>
  );
}
