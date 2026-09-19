import type { Metadata } from "next";
import Link from "next/link";
import { SigninForm } from "./SigninForm";
import { Alert } from "@/components/ui/Alert";

export const metadata: Metadata = { title: "Sign in" };

export default async function SigninPage({ searchParams }: { searchParams: Promise<{ registered?: string }> }) {
  const query = await searchParams;
  return (
    <div>
      <p className="eyebrow">Welcome back</p>
      <h1 className="mt-2 font-serif text-2xl text-ink">
        Sign in to your <em className="gold-text italic">vault</em>
      </h1>
      {query.registered === "1" && (
        <div className="mt-5">
          <Alert tone="success">If the email can be registered, the account is ready. You can now sign in.</Alert>
        </div>
      )}
      <SigninForm />
      <p className="mt-3 text-center text-xs text-ink-faint">
        <Link href="/forgot-password" className="text-gold-400 transition-colors hover:text-gold-300">Forgot password?</Link>
      </p>
      <p className="mt-5 text-center text-sm text-ink-faint">
        New to Chopra Capital?{" "}
        <Link href="/signup" className="text-gold-400 hover:text-gold-300">
          Open an account
        </Link>
      </p>
    </div>
  );
}
