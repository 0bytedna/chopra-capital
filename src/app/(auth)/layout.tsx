import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div className="absolute inset-0 -z-10 gold-aura" aria-hidden />
      <div className="absolute inset-0 -z-10 grid-overlay" aria-hidden />
      <div className="absolute inset-0 -z-10 grain" aria-hidden />

      <Link href="/" className="mb-8 flex items-center gap-2.5">
        <span
          aria-hidden
          className="flex size-9 items-center justify-center rounded-full border border-gold-500/40 bg-gold-600/10 font-serif text-sm font-semibold text-gold-400"
        >
          CC
        </span>
        <span className="font-serif text-xl tracking-tight text-ink">
          Chopra <span className="italic text-gold-400">Capital</span>
        </span>
      </Link>

      <div className="glass-card w-full max-w-md rounded-2xl p-6 sm:p-8">{children}</div>

      <p className="mt-6 max-w-md text-center text-[11px] leading-relaxed text-ink-faint">
        Investing involves risk. The value of your investment can fall as well as rise and
        returns are not guaranteed. Capital at risk —{" "}
        <Link href="/legal/risk" className="underline decoration-gold-600/40 underline-offset-2 hover:text-ink-dim">
          read the risk disclosure
        </Link>
        .
      </p>
    </div>
  );
}
