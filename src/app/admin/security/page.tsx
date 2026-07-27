import type { Metadata } from "next";
import { KeyRound, ShieldCheck } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { TotpSection } from "@/app/app/profile/ProfileForms";

export const metadata: Metadata = { title: "Admin security" };

export default async function AdminSecurityPage() {
  const admin = await requireAdmin();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <p className="eyebrow">Administrator protection</p>
        <h1 className="mt-2 font-serif text-3xl text-ink">
          Admin <em className="gold-text italic">security</em>
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-dim">
          Protect the administration console with a time-based code from your authenticator app.
          When enabled, the code is mandatory after every successful administrator password login.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2" aria-label="Security status">
        <article className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-ink-faint">Authenticator 2FA</p>
              <p className="mt-2 text-lg font-medium text-ink">{admin.twoFactorEnabled ? "Enabled" : "Not enabled"}</p>
            </div>
            <span className="flex size-11 items-center justify-center rounded-xl border border-gold-500/20 bg-gold-500/8">
              <ShieldCheck className="size-5 text-gold-500" aria-hidden />
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink-dim">
            {admin.twoFactorEnabled
              ? "A current authenticator code is required to complete administrator sign-in."
              : "Administrator sign-in currently relies on the password only."}
          </p>
        </article>
        <article className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-ink-faint">Login enforcement</p>
              <p className="mt-2 text-lg font-medium text-ink">Automatic</p>
            </div>
            <span className="flex size-11 items-center justify-center rounded-xl border border-gold-500/20 bg-gold-500/8">
              <KeyRound className="size-5 text-gold-500" aria-hidden />
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink-dim">
            Enabled 2FA cannot be skipped: the admin console is unavailable until the current code is verified.
          </p>
        </article>
      </section>

      <section className="glass-card rounded-2xl p-5 sm:p-7">
        <div className="mb-5 border-b border-gold-600/15 pb-5">
          <p className="eyebrow">Authenticator settings</p>
          <h2 className="mt-2 font-serif text-2xl text-ink">Set up or manage 2FA</h2>
        </div>
        <TotpSection enabled={admin.twoFactorEnabled} />
      </section>
    </div>
  );
}