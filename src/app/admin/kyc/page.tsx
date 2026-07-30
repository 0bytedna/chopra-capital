import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/cn";
import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { adminKycDecision } from "../actions";

export const metadata: Metadata = { title: "Admin · KYC review" };

const kycDocLabel: Record<string, string> = {
  AADHAAR: "Aadhaar card",
  PAN: "PAN card",
};

const inputCls =
  "w-full rounded-lg border border-gold-600/20 bg-vault-900/80 px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-gold-500/50 focus:outline-none";

export default async function AdminKycPage() {
  const pending = await prisma.user.findMany({
    where: { kycStatus: "PENDING" },
    orderBy: { updatedAt: "asc" },
    include: { kycDocuments: { orderBy: { createdAt: "desc" } } },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <p className="eyebrow">Compliance</p>
        <h1 className="mt-2 font-serif text-3xl text-ink">
          KYC <em className="gold-text italic">review</em>
        </h1>

      </header>

      <section
        className="glass-card flex min-h-44 max-w-xl items-center justify-between gap-5 rounded-2xl p-5 sm:p-6"
        aria-label="KYC work queue"
      >
        <div className="min-w-0">
          <p className="font-serif text-xl text-ink">Pending identity reviews</p>
          <p className="mt-2 text-sm font-medium text-ink-dim">
            {pending.length > 0 ? "Requires attention" : "Nothing pending"}
          </p>
        </div>
        <span
          className={cn(
            "flex size-20 shrink-0 items-center justify-center rounded-full border font-mono text-3xl font-semibold shadow-lg sm:size-24 sm:text-4xl",
            pending.length > 0
              ? "border-gold-600 bg-gold-600 text-white shadow-gold-600/20"
              : "border-slate-200 bg-slate-100 text-ink-faint shadow-slate-200/40",
          )}
          aria-label={`${pending.length} pending KYC reviews`}
        >
          {pending.length}
        </span>
      </section>

      {pending.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gold-600/20 px-4 py-10 text-center text-sm text-ink-faint">
          No submissions waiting for review.
        </p>
      ) : (
        pending.map((u) => (
          <div key={u.id} className="glass-card rounded-2xl p-5 sm:p-6">
            <p className="font-serif text-lg text-ink">{u.fullName ?? "—"}</p>
            <p className="text-xs text-ink-faint">
              {u.email}
              {u.mobile ? ` · ${u.mobile}` : ""}
              {u.country ? ` · ${u.country}` : ""}
            </p>

            <div className="mt-4 flex flex-wrap gap-2.5">
              {u.kycDocuments.map((doc) => (
                <a
                  key={doc.id}
                  href={`/api/admin/kyc-file?id=${doc.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-gold-600/25 px-3 py-2 text-xs text-ink-dim transition-colors hover:border-gold-500/50 hover:text-ink"
                >
                  <FileText className="size-3.5 text-gold-500" aria-hidden />
                  {kycDocLabel[doc.docType] ?? doc.docType.replace("_", " ").toLowerCase()} ·{" "}
                  {doc.createdAt.toLocaleDateString("en-US", { day: "numeric", month: "short" })}
                </a>
              ))}
              {u.kycDocuments.length === 0 && (
                <p className="text-xs text-ink-faint">No documents on file (legacy submission).</p>
              )}
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <AdminActionForm action={adminKycDecision} submitLabel="Approve identity" pendingLabel="Approving…">
                <input type="hidden" name="userId" value={u.id} />
                <input type="hidden" name="decision" value="APPROVED" />
                <fieldset className="space-y-2 rounded-xl border border-gold-600/15 bg-vault-950/40 p-3">
                  <legend className="px-1 text-xs uppercase tracking-[0.14em] text-ink-dim">Enable account methods</legend>
                  <label className="flex items-center gap-2 text-sm text-ink-dim">
                    <input type="checkbox" name="bankTransferEnabled" defaultChecked={u.bankTransferEnabled} />
                    Bank transfer / UPI (deposits and withdrawals)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-ink-dim">
                    <input type="checkbox" name="cashEnabled" defaultChecked={u.cashEnabled} />
                    Cash (deposits and withdrawals)
                  </label>
                </fieldset>
              </AdminActionForm>
              <AdminActionForm action={adminKycDecision} submitLabel="Reject" variant="danger" pendingLabel="Rejecting…">
                <input type="hidden" name="userId" value={u.id} />
                <input type="hidden" name="decision" value="REJECTED" />
                <label className="block text-xs uppercase tracking-[0.14em] text-ink-dim" htmlFor={`note-${u.id}`}>
                  Reason (shown to investor)
                </label>
                <input id={`note-${u.id}`} name="note" placeholder="e.g. ID photo unreadable" className={inputCls} />
              </AdminActionForm>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
