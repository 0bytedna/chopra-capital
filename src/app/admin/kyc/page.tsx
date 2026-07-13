import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { AdminActionForm } from "@/components/admin/AdminActionForm";
import { adminKycDecision } from "../actions";

export const metadata: Metadata = { title: "Admin · KYC review" };

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
        <p className="mt-2 text-sm text-ink-dim">
          Verify each identity before approving — investors cannot deposit until KYC is approved.
        </p>
      </header>

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
                  {doc.docType.replace("_", " ").toLowerCase()} ·{" "}
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
