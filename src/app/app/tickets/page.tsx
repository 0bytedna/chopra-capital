import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewTicketForm } from "./TicketForms";
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

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <header>
        <p className="eyebrow">Support</p>
        <h1 className="mt-2 font-serif text-2xl text-ink sm:text-3xl">
          We&apos;re <em className="gold-text italic">here</em>
        </h1>
        <p className="mt-2 text-sm text-ink-dim">
          Questions about deposits, withdrawals or your account — open a ticket and the team will
          reply here.
        </p>
      </header>

      <section className="glass-card rounded-2xl p-4 sm:p-7">
        <h2 className="font-serif text-xl text-ink">New ticket</h2>
        <div className="mt-4">
          <NewTicketForm />
        </div>
      </section>

      <section>
        <p className="eyebrow">History</p>
        <h2 className="mt-2 font-serif text-xl text-ink">Your tickets</h2>
        {tickets.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-gold-600/20 px-4 py-8 text-center text-sm text-ink-faint">
            No tickets yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {tickets.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/app/tickets/${t.id}`}
                  className="glass-card glass-card-hover flex items-center gap-4 rounded-xl px-4 py-3.5"
                >
                  <MessageSquare className="size-4 shrink-0 text-gold-500" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">{t.subject}</span>
                    <span className="block text-xs text-ink-faint">
                      {t._count.messages} message{t._count.messages === 1 ? "" : "s"} · updated{" "}
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
      </section>
    </div>
  );
}
