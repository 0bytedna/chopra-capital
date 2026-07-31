import type { Metadata } from "next";
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

      </header>

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