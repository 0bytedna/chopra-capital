import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatUsdt } from "@/lib/money";
import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { adminApproveWithdrawal, adminProcessWithdrawal, adminRejectWithdrawal } from "../actions";

export const metadata: Metadata = { title: "Admin · Withdrawals" };

const inputCls =
  "w-full rounded-lg border border-gold-600/20 bg-vault-900/80 px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-gold-500/50 focus:outline-none";

export default async function AdminWithdrawalsPage() {
  const [requested, approved, recent] = await Promise.all([
    prisma.withdrawal.findMany({
      where: { status: "REQUESTED" },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { email: true, fullName: true } } },
    }),
    prisma.withdrawal.findMany({
      where: { status: "APPROVED" },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { email: true, fullName: true } } },
    }),
    prisma.withdrawal.findMany({
      where: { status: { in: ["PROCESSED", "REJECTED"] } },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { user: { select: { email: true } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <header>
        <p className="eyebrow">Money out</p>
        <h1 className="mt-2 font-serif text-3xl text-ink">
          Withdrawal <em className="gold-text italic">settlement</em>
        </h1>
        <p className="mt-2 text-sm text-ink-dim">
          Approve with a fee on Saturday review, process on Sunday — queued cash is drawn first,
          then units are redeemed at the live NAV.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="font-serif text-xl text-ink">Awaiting approval ({requested.length})</h2>
        {requested.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gold-600/20 px-4 py-8 text-center text-sm text-ink-faint">
            No new requests.
          </p>
        ) : (
          requested.map((w) => (
            <div key={w.id} className="glass-card rounded-2xl p-5 sm:p-6">
              <p className="font-mono text-lg text-ink">{formatUsdt(w.amount)} USDT · {w.network}</p>
              <p className="mt-1 truncate text-xs text-ink-faint">
                {w.user.fullName ?? "—"} · {w.user.email} · week {w.weekKey}
              </p>
              <p className="mt-1.5 break-all font-mono text-xs text-ink-dim">to: {w.address}</p>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <AdminActionForm action={adminApproveWithdrawal} submitLabel="Approve" pendingLabel="Approving…">
                  <input type="hidden" name="id" value={w.id} />
                  <label className="block text-xs uppercase tracking-[0.14em] text-ink-dim" htmlFor={`fee-${w.id}`}>
                    Fee (USDT, deducted from payout)
                  </label>
                  <input id={`fee-${w.id}`} name="fee" type="number" step="0.01" min="0" defaultValue="0" required className={inputCls} />
                </AdminActionForm>
                <AdminActionForm action={adminRejectWithdrawal} submitLabel="Reject" variant="danger" pendingLabel="Rejecting…">
                  <input type="hidden" name="id" value={w.id} />
                  <label className="block text-xs uppercase tracking-[0.14em] text-ink-dim" htmlFor={`rejw-${w.id}`}>
                    Reason (shown to investor)
                  </label>
                  <input id={`rejw-${w.id}`} name="note" placeholder="optional" className={inputCls} />
                </AdminActionForm>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-xl text-ink">Approved — ready to process ({approved.length})</h2>
        {approved.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gold-600/20 px-4 py-8 text-center text-sm text-ink-faint">
            Nothing waiting for Sunday processing.
          </p>
        ) : (
          approved.map((w) => (
            <div key={w.id} className="glass-card rounded-2xl p-5 sm:p-6">
              <p className="font-mono text-lg text-ink">
                {formatUsdt(w.amount)} USDT · fee {formatUsdt(w.fee ?? 0)} · pays {formatUsdt(Number(w.amount) - Number(w.fee ?? 0))}
              </p>
              <p className="mt-1 truncate text-xs text-ink-faint">
                {w.user.fullName ?? "—"} · {w.user.email} · {w.network} · week {w.weekKey}
              </p>
              <p className="mt-1.5 break-all font-mono text-xs text-ink-dim">to: {w.address}</p>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <AdminActionForm
                  action={adminProcessWithdrawal}
                  submitLabel="Mark processed"
                  pendingLabel="Settling…"
                  confirmMessage="Settle this withdrawal now? Queued cash is drawn first, then units are redeemed at the current NAV. This writes to the ledger and cannot be undone."
                >
                  <input type="hidden" name="id" value={w.id} />
                  <label className="block text-xs uppercase tracking-[0.14em] text-ink-dim" htmlFor={`tx-${w.id}`}>
                    Payout tx hash (optional)
                  </label>
                  <input id={`tx-${w.id}`} name="txHash" placeholder="0x… / TX…" className={inputCls} />
                </AdminActionForm>
                <AdminActionForm action={adminRejectWithdrawal} submitLabel="Reject" variant="danger" pendingLabel="Rejecting…">
                  <input type="hidden" name="id" value={w.id} />
                  <label className="block text-xs uppercase tracking-[0.14em] text-ink-dim" htmlFor={`rejw2-${w.id}`}>
                    Reason
                  </label>
                  <input id={`rejw2-${w.id}`} name="note" placeholder="optional" className={inputCls} />
                </AdminActionForm>
              </div>
            </div>
          ))
        )}
      </section>

      <section>
        <p className="eyebrow">History</p>
        <h2 className="mt-2 font-serif text-xl text-ink">Recently settled</h2>
        <ul className="mt-4 space-y-2">
          {recent.map((w) => (
            <li key={w.id} className="flex items-center justify-between gap-3 rounded-xl border border-gold-600/10 px-4 py-3 text-sm">
              <span className="min-w-0 truncate text-ink-dim">
                {formatUsdt(w.amount)} USDT · {w.user.email} · week {w.weekKey}
              </span>
              <span className={w.status === "PROCESSED" ? "text-positive" : "text-negative"}>
                {w.status.toLowerCase()}
              </span>
            </li>
          ))}
          {recent.length === 0 && <li className="text-sm text-ink-faint">No history yet.</li>}
        </ul>
      </section>
    </div>
  );
}
