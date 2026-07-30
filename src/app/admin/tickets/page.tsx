import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Admin · Tickets" };

const statusCls: Record<string, string> = {
  OPEN: "border-gold-500/40 bg-gold-600/10 text-gold-300",
  ANSWERED: "border-positive/40 bg-positive/10 text-positive",
  CLOSED: "border-ink/15 bg-ink/5 text-ink-faint",
};

export default async function AdminTicketsPage() {
  const tickets = await prisma.ticket.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: {
      user: { select: { email: true, fullName: true } },
      _count: { select: { messages: true } },
    },
  });

  const ticketCounts = [
    {
      label: "Open",
      status: "OPEN",
      count: tickets.filter((ticket) => ticket.status === "OPEN").length,
    },
    {
      label: "Answered",
      status: "ANSWERED",
      count: tickets.filter((ticket) => ticket.status === "ANSWERED").length,
    },
    {
      label: "Closed",
      status: "CLOSED",
      count: tickets.filter((ticket) => ticket.status === "CLOSED").length,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <p className="eyebrow">Support</p>
        <h1 className="mt-2 font-serif text-3xl text-ink">
          Ticket <em className="gold-text italic">queue</em>
        </h1>
      </header>

      <section
        className="mx-auto grid w-full max-w-2xl grid-cols-3 gap-2 sm:gap-4"
        aria-label="Ticket queue overview"
      >
        {ticketCounts.map((item) => {
          const needsAttention = item.status === "OPEN" && item.count > 0;

          return (
            <div
              key={item.status}
              className="glass-card flex aspect-square flex-col items-center justify-center rounded-2xl p-2 text-center sm:p-5"
            >
              <span
                className={cn(
                  "flex size-12 shrink-0 items-center justify-center rounded-full border font-mono text-xl font-semibold shadow-lg sm:size-16 sm:text-2xl",
                  needsAttention
                    ? "border-gold-600 bg-gold-600 text-white shadow-gold-600/20"
                    : "border-slate-200 bg-slate-100 text-ink-faint shadow-slate-200/40",
                )}
                aria-label={`${item.count} ${item.label.toLowerCase()}`}
              >
                {item.count}
              </span>
              <p className="mt-3 text-sm font-semibold leading-tight text-ink sm:text-base">
                {item.label}
              </p>
            </div>
          );
        })}
      </section>

      {tickets.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gold-600/20 px-4 py-10 text-center text-sm text-ink-faint">
          No tickets.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <Link
                href={`/admin/tickets/${ticket.id}`}
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
                  <span className="block truncate text-xs text-ink-faint">
                    {ticket.user.fullName ?? ticket.user.email} ·{" "}
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
      )}
    </div>
  );
}