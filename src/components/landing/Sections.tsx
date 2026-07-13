"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Wallet,
  Layers,
  LineChart,
  Banknote,
  Scale,
  Bot,
  Eye,
  Landmark,
  ChevronDown,
  MonitorCheck,
  ShieldAlert,
} from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";

function SectionHeading({
  number,
  eyebrow,
  title,
  italicWord,
}: {
  number: string;
  eyebrow: string;
  title: string;
  italicWord: string;
}) {
  const parts = title.split(italicWord);
  return (
    <Reveal>
      <div className="flex items-baseline gap-4">
        <span className="font-serif text-sm text-gold-600/70">{number}</span>
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="mt-3 font-serif text-3xl tracking-tight text-ink sm:text-4xl md:text-[2.75rem] md:leading-[1.1]">
            {parts[0]}
            <em className="gold-text italic">{italicWord}</em>
            {parts[1] ?? ""}
          </h2>
        </div>
      </div>
    </Reveal>
  );
}

/* --- 01 · How it works --------------------------------------------------- */

const steps = [
  {
    Icon: Wallet,
    title: "Fund your wallet",
    body: "Deposit USDT to the company address on TRC20, ERC20 or BEP20. Our team confirms it on-chain and credits your account balance.",
  },
  {
    Icon: Layers,
    title: "Allocate to the pool",
    body: "On the weekly invest run your balance converts into pool units at the current NAV — the same fair price for every investor, new or old.",
  },
  {
    Icon: LineChart,
    title: "Watch it live",
    body: "Your dashboard tracks your value in real time, and read-only MT5 access lets you watch the actual trading account — every position, every trade.",
  },
  {
    Icon: Banknote,
    title: "Withdraw weekly",
    body: "Request a withdrawal any Saturday. It is processed on Sunday at the current NAV and paid to your USDT address. No lock-in, ever.",
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28">
      <SectionHeading number="01" eyebrow="The process" title="Four steps, no ceremony." italicWord="ceremony" />
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <Reveal key={s.title} delay={i * 0.08}>
            <div className="glass-card glass-card-hover h-full p-6">
              <div className="flex items-center justify-between">
                <s.Icon className="size-5 text-gold-500" aria-hidden />
                <span className="font-serif text-sm text-gold-600/60">0{i + 1}</span>
              </div>
              <h3 className="mt-5 font-serif text-xl text-ink">{s.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-ink-dim">{s.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* --- 02 · The strategy ---------------------------------------------------- */

const strategyCards = [
  {
    Icon: Landmark,
    title: "One market: gold",
    body: "No baskets, no rotation, no distraction. The desk trades XAU exclusively — a market it knows deeply and watches every hour it is open.",
  },
  {
    Icon: Scale,
    title: "Hedged 1:1",
    body: "Every spot gold position is offset one-for-one with gold futures. The book targets market-neutrality, aiming to earn from structure and spread rather than direction.",
  },
  {
    Icon: Bot,
    title: "AI-powered execution",
    body: "Proprietary bots place and manage orders with machine precision — sizing, timing and hedge maintenance run on rules, not emotion.",
  },
  {
    Icon: Eye,
    title: "Humans on watch 24/7",
    body: "Specialists supervise the bots around the clock. Anything anomalous — spreads, liquidity, news shocks — and a human steps in immediately.",
  },
];

function Strategy() {
  return (
    <section id="strategy" className="relative scroll-mt-24 border-y border-gold-600/10 bg-vault-900/40">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <SectionHeading number="02" eyebrow="The strategy" title="Neutral by design." italicWord="design" />
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {strategyCards.map((c, i) => (
            <Reveal key={c.title} delay={i * 0.07}>
              <div className="glass-card glass-card-hover h-full p-7">
                <c.Icon className="size-5 text-gold-500" aria-hidden />
                <h3 className="mt-4 font-serif text-xl text-ink">{c.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-ink-dim">{c.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.15}>
          <div className="mt-10 rounded-2xl border border-gold-500/25 bg-gold-600/6 p-6 sm:p-8">
            <div className="flex items-start gap-3.5">
              <ShieldAlert className="mt-0.5 size-5 shrink-0 text-gold-400" aria-hidden />
              <div>
                <h3 className="font-serif text-lg text-gold-300">An honest note on risk</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-dim">
                  Hedging narrows risk — it does not remove it. Execution slippage, futures basis,
                  liquidity gaps and counterparty events can all produce losses, including in
                  hedged books. Our 1–4% monthly figure is an <strong className="text-ink">objective</strong> the
                  strategy is built to pursue, not a promise it will always meet. Some weeks will
                  be flat. Some may be negative. Anyone who tells you otherwise is selling
                  something. Your capital is at risk — invest only what you can afford to lose.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* --- 03 · Transparency ----------------------------------------------------- */

function Transparency() {
  return (
    <section id="transparency" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28">
      <SectionHeading number="03" eyebrow="Transparency" title="Watch the account itself." italicWord="itself" />
      <div className="mt-12 grid items-center gap-8 lg:grid-cols-2">
        <Reveal>
          <div className="space-y-5 text-sm leading-relaxed text-ink-dim sm:text-base">
            <p>
              Most funds send you a PDF once a quarter. We hand you the keys to the window:
              read-only investor access to the live MT5 trading account, so you can see every
              position, every hedge and the account equity move in real time.
            </p>
            <p>
              The same feed powers your dashboard. Your balance is your units multiplied by the
              live NAV — derived from broker equity, not from a number we type in.
            </p>
            <ul className="space-y-2.5 pt-1">
              {[
                "Read-only MT5 investor login, shown inside your account",
                "Web terminal access from any browser — nothing to install",
                "Daily NAV history recorded from the live feed, never back-filled",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <MonitorCheck className="mt-0.5 size-4 shrink-0 text-gold-500" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal delay={0.12}>
          {/* Stylized MT5 panel mock — illustrative UI, not market data */}
          <div className="glass-card overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between border-b border-gold-600/12 px-5 py-3.5">
              <span className="font-mono text-xs text-ink-faint">MT5 · Investor (read-only)</span>
              <span className="inline-flex items-center gap-1.5 text-xs text-positive">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-positive" />
                </span>
                Live
              </span>
            </div>
            <div className="space-y-0 px-5 py-4 font-mono text-xs">
              {[
                { l: "XAUUSD · spot", r: "BUY", tone: "text-positive" },
                { l: "GC · futures hedge", r: "SELL", tone: "text-negative" },
                { l: "Net exposure", r: "≈ 0.0", tone: "text-gold-400" },
              ].map((row) => (
                <div key={row.l} className="flex items-center justify-between border-b border-ink/5 py-3 last:border-0">
                  <span className="text-ink-dim">{row.l}</span>
                  <span className={row.tone}>{row.r}</span>
                </div>
              ))}
              <div className="mt-4 rounded-lg bg-vault-950/70 p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-ink-faint">Account equity</p>
                <p className="mt-1 font-serif text-2xl tracking-tight text-ink">
                  Visible to you, <em className="gold-text italic">live</em>
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* --- 04 · Terms & schedule -------------------------------------------------- */

const ledgerRows = [
  { term: "Trading window", value: "Monday – Friday", note: "Gold market hours, bot-executed, human-supervised" },
  { term: "Withdrawal requests", value: "Saturday", note: "Submit from your dashboard once the book is flat" },
  { term: "Withdrawals processed", value: "Sunday", note: "Settled at current NAV, paid in USDT" },
  { term: "Lock-in", value: "None", note: "Your money is never trapped — withdraw any week" },
  { term: "Minimum allocation", value: "$2,000 USDT", note: "One tier — every investor gets the same terms" },
  { term: "Performance objective", value: "1–4% / month", note: "A target, not a promise. Capital at risk" },
];

function TermsLedger() {
  return (
    <section id="terms" className="relative scroll-mt-24 border-y border-gold-600/10 bg-vault-900/40">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <SectionHeading number="04" eyebrow="Terms & schedule" title="The weekly rhythm." italicWord="rhythm" />
        <Reveal delay={0.1}>
          <div className="glass-card mt-12 overflow-hidden rounded-2xl">
            {ledgerRows.map((row, i) => (
              <div
                key={row.term}
                className={cn(
                  "grid gap-1 px-5 py-5 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6 sm:px-8",
                  i !== ledgerRows.length - 1 && "border-b border-gold-600/10",
                )}
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-ink-faint">{row.term}</p>
                  <p className="mt-1 text-sm text-ink-dim">{row.note}</p>
                </div>
                <p className="font-serif text-xl text-gold-400 sm:text-right sm:text-2xl">{row.value}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* --- 05 · FAQ ---------------------------------------------------------------- */

const faqs = [
  {
    q: "Is this really risk-free?",
    a: "No — and you should walk away from anyone who says yes. Hedging sharply reduces directional exposure, but execution slippage, futures basis moves, liquidity gaps and counterparty events can still cause losses. The 1–4% monthly figure is an objective we manage toward, not a guarantee. Your capital is at risk, and you should only invest money you can afford to lose.",
  },
  {
    q: "What exactly do you trade?",
    a: "Gold, and only gold. The strategy holds spot XAU positions hedged one-for-one with gold futures, keeping the book close to market-neutral. We do not trade other metals, FX pairs, indices or crypto with pooled funds.",
  },
  {
    q: "How do deposits and withdrawals work?",
    a: "You deposit USDT (TRC20, ERC20 or BEP20) to the company address shown in your account. Once confirmed, it joins the pool on the weekly invest run. Withdrawals are requested on Saturdays and processed on Sundays at the current NAV — there is no lock-in period.",
  },
  {
    q: "How can I verify the trading is real?",
    a: "Your account area shows read-only MT5 investor credentials for the pooled trading account. Log into the MT5 web terminal at any time and watch positions, hedges and equity live. Your dashboard NAV is computed from that same broker equity.",
  },
  {
    q: "Who can invest, and what is the minimum?",
    a: "The minimum allocation is $2,000 USDT and every investor is on the same single tier — same NAV, same terms. Identity verification (KYC) is required before your funds can be allocated to the pool.",
  },
  {
    q: "What fees do you charge?",
    a: "Fee terms are shown transparently inside the platform before you commit, and every fee applied to your account appears as its own line in your ledger. There are no hidden spreads added to your NAV.",
  },
];

function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28">
      <SectionHeading number="05" eyebrow="Questions" title="Asked, answered honestly." italicWord="honestly" />
      <div className="mt-10 space-y-3">
        {faqs.map((f, i) => {
          const open = openIndex === i;
          return (
            <Reveal key={f.q} delay={i * 0.04}>
              <div className="glass-card overflow-hidden rounded-xl">
                <button
                  type="button"
                  onClick={() => setOpenIndex(open ? null : i)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6"
                >
                  <span className="font-serif text-base text-ink sm:text-lg">{f.q}</span>
                  <ChevronDown
                    className={cn("size-4 shrink-0 text-gold-500 transition-transform duration-300", open && "rotate-180")}
                    aria-hidden
                  />
                </button>
                <div
                  className={cn(
                    "grid transition-all duration-300 ease-out",
                    open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-sm leading-relaxed text-ink-dim sm:px-6">{f.a}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

/* --- Final CTA band ------------------------------------------------------------ */

function CtaBand() {
  return (
    <section className="relative overflow-hidden border-t border-gold-600/10">
      <div className="absolute inset-0 -z-10 gold-aura" aria-hidden />
      <div className="absolute inset-0 -z-10 grain" aria-hidden />
      <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28">
        <Reveal>
          <p className="eyebrow">Open your account</p>
          <h2 className="mt-4 font-serif text-3xl tracking-tight text-ink sm:text-5xl">
            Gold in your corner, <em className="gold-text italic">watched</em> all night.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-ink-dim sm:text-base">
            Open an account in minutes, complete verification, and allocate from $2,000 USDT.
            Withdraw any week. Watch every trade live. Capital at risk.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="btn-gold px-8 py-3 text-base">
              Open an account
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link href="/legal/risk" className="btn-ghost px-8 py-3 text-base">
              Read the risk disclosure
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function LandingSections() {
  return (
    <>
      <HowItWorks />
      <Strategy />
      <Transparency />
      <TermsLedger />
      <Faq />
      <CtaBand />
    </>
  );
}
