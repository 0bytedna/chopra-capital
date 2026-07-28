import Link from "next/link";

const columns = [
  {
    title: "Platform",
    links: [
      { href: "/#how-it-works", label: "How it works" },
      { href: "/#strategy", label: "Trading approach" },
      { href: "/#visibility", label: "Investor dashboard" },
      { href: "/#backtesting", label: "Live account history" },
      { href: "/#terms", label: "Terms & schedule" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/signup", label: "Open account" },
      { href: "/signin", label: "Sign in" },
      { href: "/app", label: "Investor app" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/terms", label: "Terms of service" },
      { href: "/legal/privacy", label: "Privacy policy" },
      { href: "/legal/risk", label: "Risk disclosure" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-gold-600/12 bg-vault-900/60">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="flex size-8 items-center justify-center rounded-full border border-gold-500/40 bg-gold-600/10 font-serif text-[13px] font-semibold text-gold-400"
              >
                CC
              </span>
              <span className="font-serif text-lg text-ink">
                Chopra <span className="italic text-gold-400">Capital</span>
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-faint">
              Automated gold trading with human oversight, clear investor reporting, and simple
              account access from deposit through withdrawal.
            </p>
          </div>

          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="eyebrow">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-ink-dim transition-colors hover:text-ink">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <hr className="hairline my-10" />

        <div className="space-y-4 text-xs leading-relaxed text-ink-faint">
          <p>
            <strong className="text-ink-dim">Risk warning.</strong> Trading gold and gold
            derivatives involves significant risk. The value of your investment can go down as
            well as up, and you may get back less than you put in. The 1–3% monthly figure is a
            performance objective, not a promise — past performance does not guarantee future
            results, and no return is guaranteed. Hedging reduces directional exposure but does
            not eliminate risk, including execution, counterparty and liquidity risk. Only invest
            money you can afford to lose. Capital at risk. See the full{" "}
            <Link href="/legal/risk" className="underline decoration-gold-600/40 underline-offset-2 hover:text-ink">
              risk disclosure
            </Link>
            .
          </p>
          <p>
            Digital-asset transfers (USDT) are irreversible once broadcast. Always verify deposit
            addresses inside your account area before sending funds.
          </p>
          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Chopra Capital. All rights reserved.</p>
            <div className="flex gap-4">
              <Link href="/legal/terms" className="hover:text-ink">Terms</Link>
              <Link href="/legal/privacy" className="hover:text-ink">Privacy</Link>
              <Link href="/legal/risk" className="hover:text-ink">Risk</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
