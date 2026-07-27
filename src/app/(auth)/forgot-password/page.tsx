import type { Metadata } from "next";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return <div>
    <p className="eyebrow">Account recovery</p>
    <h1 className="mt-2 font-serif text-2xl text-ink">Reset your <em className="gold-text italic">password</em></h1>
    <p className="mt-2 text-sm leading-6 text-ink-dim">Use your authenticator if two-factor security is enabled on your account.</p>
    <ForgotPasswordForm />
  </div>;
}