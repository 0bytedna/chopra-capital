import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatUsdt } from "@/lib/money";
import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { adminConfirmDeposit, adminRejectDeposit } from "../actions";

export const metadata: Metadata = { title: "Admin · Deposits" };

const inputCls =
  "w-full rounded-lg border border-gold-600/20 bg-vault-900/80 px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-gold-500/50 focus:outline-none";

export default async function AdminDepositsPage() {
  const [pending, recent] = await Promise.all([
    prisma.deposit.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { email: true, fullName: true, kycStatus: true } } },
    }),
    prisma.deposit.findMany({
      where: { status: { not: "PENDING" } },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { user: { select: { email: true } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <header>
        <p className="eyebrow">Money in</p>
        <h1 className="mt-2 font-serif text-3xl text-ink">
          Deposit <em className="gold-text italic">confirmations</em>
        </h1>
      </header>

      <section className="space-y-4">
        {pending.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gold-600/20 px-4 py-10 text-center text-sm text-ink-faint">
            Nothing pending — all caught up.
          </p>
        ) : (
          pending.map((d) => (
            <div key={d.id} className="glass-card rounded-2xl p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-lg text-ink">{formatUsdt(d.amount)} USDT · {d.network}</p>
                  <p className="mt-1 truncate text-xs text-ink-faint">
                    {d.user.fullName ?? "—"} · {d.user.email} · KYC {d.user.kycStatus.toLowerCase()} ·{" "}
                    {d.createdAt.toLocaleString("en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {d.txHash && (
                    <p className="mt-1.5 break-all font-mono text-xs text-ink-dim">tx: {d.txHash}</p>
                  )}
                </div>
              </div>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <AdminActionForm action={adminConfirmDeposit} submitLabel="Confirm & credit" pendingLabel="Confirming…">
                  <input type="hidden" name="id" value={d.id} />
                  <label className="block text-xs uppercase tracking-[0.14em] text-ink-dim" htmlFor={`landed-${d.id}`}>
                    Landed amount (USDT)
                  </label>
                  <input
                    id={`landed-${d.id}`}
                    name="landedAmount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    defaultValue={formatUsdt(d.amount).replaceAll(",", "")}
                    required
                    className={inputCls}
                  />
                </AdminActionForm>
                <AdminActionForm action={adminRejectDeposit} submitLabel="Reject" variant="danger" pendingLabel="Rejecting…">
                  <input type="hidden" name="id" value={d.id} />
                  <label className="block text-xs uppercase tracking-[0.14em] text-ink-dim" htmlFor={`rej-${d.id}`}>
                    Reason (shown to investor)
                  </label>
                  <input id={`rej-${d.id}`} name="note" placeholder="e.g. no matching transfer found" className={inputCls} />
                </AdminActionForm>
              </div>
            </div>
          ))
        )}
      </section>

      <section>
        <p className="eyebrow">History</p>
        <h2 className="mt-2 font-serif text-xl text-ink">Recently decided</h2>
        <ul className="mt-4 space-y-2">
          {recent.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 rounded-xl border border-gold-600/10 px-4 py-3 text-sm">
              <span className="min-w-0 truncate text-ink-dim">
                {formatUsdt(d.amount)} USDT · {d.network} · {d.user.email}
              </span>
              <span className={d.status === "CONFIRMED" ? "text-positive" : "text-negative"}>
                {d.status.toLowerCase()}
              </span>
            </li>
          ))}
          {recent.length === 0 && <li className="text-sm text-ink-faint">No history yet.</li>}
        </ul>
      </section>
    </div>
  );
}
