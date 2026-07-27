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
      label: "Open tickets",
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

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Ticket queue overview">
        {ticketCounts.map((item) => {
          const needsAttention = item.status === "OPEN" && item.count > 0;

          return (
            <div
              key={item.status}
              className="glass-card flex min-h-40 items-center justify-between gap-4 rounded-2xl p-5"
            >
              <div className="min-w-0">
                <p className="font-serif text-lg text-ink">{item.label}</p>
                <p className="mt-2 text-xs font-medium text-ink-dim">
                  {needsAttention ? "Requires attention" : item.count > 0 ? "No action required" : "None"}
                </p>
              </div>
              <span
                className={cn(
                  "flex size-20 shrink-0 items-center justify-center rounded-full border font-mono text-3xl font-semibold shadow-lg",
                  needsAttention
                    ? "border-gold-600 bg-gold-600 text-white shadow-gold-600/20"
                    : "border-slate-200 bg-slate-100 text-ink-faint shadow-slate-200/40",
                )}
                aria-label={`${item.count} ${item.label.toLowerCase()}`}
              >
                {item.count}
              </span>
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
          {tickets.map((t) => (
            <li key={t.id}>
              <Link
                href={`/admin/tickets/${t.id}`}
                className="glass-card glass-card-hover flex items-center gap-4 rounded-xl px-4 py-3.5"
              >
                <MessageSquare className="size-4 shrink-0 text-gold-500" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink">{t.subject}</span>
                  <span className="block truncate text-xs text-ink-faint">
                    {t.user.fullName ?? t.user.email} · {t._count.messages} message
                    {t._count.messages === 1 ? "" : "s"} · updated{" "}
                    {t.updatedAt.toLocaleDateString("en-US", { day: "numeric", month: "short" })}
                  </span>
                </span>
                <span className={cn("shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium", statusCls[t.status])}>
                  {t.status.toLowerCase()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
