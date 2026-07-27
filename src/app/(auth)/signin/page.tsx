import type { Metadata } from "next";
import Link from "next/link";
import { SigninForm } from "./SigninForm";

export const metadata: Metadata = { title: "Sign in" };

export default function SigninPage() {
  return (
    <div>
      <p className="eyebrow">Welcome back</p>
      <h1 className="mt-2 font-serif text-2xl text-ink">
        Sign in to your <em className="gold-text italic">vault</em>
      </h1>
      <SigninForm />
      <p className="mt-3 text-center text-xs text-ink-faint">
        <a
          href="https://wa.me/918123320128?text=Hello%20Chopra%20Capital%2C%20I%20need%20help%20resetting%20my%20account%20password."
          target="_blank"
          rel="noreferrer"
          className="text-gold-400 transition-colors hover:text-gold-300"
        >
          Forgot password? Contact the administrator on WhatsApp
        </a>
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
