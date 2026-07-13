import type { Metadata } from "next";
import { TwoFactorForm } from "./TwoFactorForm";

export const metadata: Metadata = { title: "Two-factor verification" };

export default function TwoFactorPage() {
  return (
    <div>
      <p className="eyebrow">Two-factor verification</p>
      <h1 className="mt-2 font-serif text-2xl text-ink">
        One more <em className="gold-text italic">step</em>
      </h1>
      <p className="mt-2 text-sm text-ink-dim">
        Enter the 6-digit code from your authenticator app to finish signing in.
      </p>
      <TwoFactorForm />
    </div>
  );
}
