import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewTicketDialog } from "./TicketForms";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Support tickets" };

const statusCls: Record<string, string> = {
  OPEN: "border-gold-500/40 bg-gold-600/10 text-gold-300",
  ANSWERED: "border-positive/40 bg-positive/10 text-positive",
  CLOSED: "border-ink/15 bg-ink/5 text-ink-faint",
};

export default async function TicketsPage() {
  const user = await requireUser();
  const tickets = await prisma.ticket.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { messages: true } } },
  });
  const openTickets = tickets.filter((ticket) => ticket.status !== "CLOSED");
  const closedTickets = tickets.filter((ticket) => ticket.status === "CLOSED");

  const ticketList = (items: typeof tickets) => (
    <ul className="mt-4 space-y-2.5">
      {items.map((ticket) => (
        <li key={ticket.id}>
          <Link
            href={`/app/tickets/${ticket.id}`}
            className="glass-card glass-card-hover flex items-center gap-4 rounded-xl px-4 py-3.5"
          >
            <MessageSquare
              className="size-4 shrink-0 text-gold-500"
              aria-hidden
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-ink">
                {ticket.subject}
              </span>
              <span className="block text-xs text-ink-faint">
                {ticket._count.messages} message
                {ticket._count.messages === 1 ? "" : "s"} · updated{" "}
                {ticket.updatedAt.toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </span>
            <span
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium",
                statusCls[ticket.status],
              )}
            >
              {ticket.status.toLowerCase()}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="eyebrow">Support</p>
        <h1 className="mt-2 font-serif text-2xl text-ink sm:text-3xl">
          We&apos;re <em className="gold-text italic">here</em>
        </h1>
        <p className="mt-2 text-sm text-ink-dim">
          Questions about deposits, withdrawals or your account — open a ticket
          and the team will reply here.
        </p>
      </header>

      <section>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Active support</p>
            <h2 className="mt-2 font-serif text-xl text-ink">Open tickets</h2>
          </div>
          <NewTicketDialog />
        </div>
        {openTickets.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-gold-600/20 px-4 py-8 text-center text-sm text-ink-faint">
            No open tickets.
          </p>
        ) : (
          ticketList(openTickets)
        )}
      </section>

      {closedTickets.length > 0 && (
        <section>
          <p className="eyebrow">History</p>
          <h2 className="mt-2 font-serif text-xl text-ink">Closed tickets</h2>
          {ticketList(closedTickets)}
        </section>
      )}
    </div>
  );
}