import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = { title: "Open an account" };

export default function SignupPage() {
  return (
    <div>
      <p className="eyebrow">Open an account</p>
      <h1 className="mt-2 font-serif text-2xl text-ink">
        Begin with <em className="gold-text italic">clarity</em>
      </h1>
      <p className="mt-2 text-sm text-ink-dim">
        Create your investor account. Verification (KYC) follows before your first allocation.
      </p>
      <SignupForm />
      <p className="mt-5 text-center text-sm text-ink-faint">
        Already have an account?{" "}
        <Link href="/signin" className="text-gold-400 hover:text-gold-300">
          Sign in
        </Link>
      </p>
    </div>
  );
}
