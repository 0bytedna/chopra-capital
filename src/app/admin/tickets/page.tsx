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

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <p className="eyebrow">Support</p>
        <h1 className="mt-2 font-serif text-3xl text-ink">
          Ticket <em className="gold-text italic">queue</em>
        </h1>
      </header>

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
                <span className={cn("shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium", statusCls[t.status])}>
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
