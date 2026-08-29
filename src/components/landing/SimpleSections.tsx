"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  Clock3,
  LineChart,
  LockKeyhole,
  UserCheck,
  WalletCards,
  Zap,
} from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { Mt5AccountDetails, type Mt5Detail } from "@/components/mt5/Mt5AccountDetails";
import { cn } from "@/lib/cn";

function SectionHeading({
  eyebrow,
  title,
  accent,
  copy,
  centered = true,
}: {
  eyebrow: string;
  title: string;
  accent: string;
  copy?: string;
  centered?: boolean;
}) {
  const [before, after] = title.split(accent);

  return (
    <Reveal>
      <div className={cn("max-w-3xl", centered && "mx-auto text-center")}>
        <div className={cn("section-chip", centered && "mx-auto")}>
          <span className="size-1.5 rounded-full bg-gold-400" />
          {eyebrow}
        </div>
        <h2 className="mt-5 text-balance text-3xl font-extrabold leading-tight tracking-[-0.04em] text-ink sm:text-5xl">
          {before}
          <em className="gold-text not-italic">{accent}</em>
          {after}
        </h2>
        {copy && (
          <p
            className={cn(
              "mt-5 max-w-2xl text-pretty text-base leading-7 text-ink-dim",
              centered && "mx-auto",
            )}
          >
            {copy}
          </p>
        )}
      </div>
    </Reveal>
  );
}

type LandingMt5Details = {
  brokerName: string;
  server: string;
  accountId: string;
};

function LiveHistory({ mt5 }: { mt5: LandingMt5Details }) {
  const details: Mt5Detail[] = [
    ["Broker Name", mt5.brokerName],
    ["Server", mt5.server],
    ["MT5 ID", mt5.accountId],
    ["Investor access", "ChopraCapital@1"],
  ];

  return (
    <section id="backtesting" className="scroll-mt-24 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Backtesting data"
          title="Check our live account history."
          accent="live account history"
        />
        <Reveal delay={0.08}>
          <div className="product-window mx-auto mt-7 max-w-4xl overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-5 py-4">
              <div>
                <p className="eyebrow text-sm">MT5 read-only account</p>
                <p className="mt-1 text-lg font-medium text-ink-dim">Live account details</p>
              </div>
              <span className="status-pill w-fit shrink-0 whitespace-nowrap text-xs sm:text-sm">
                <span className="status-dot" />
                Live history
              </span>
            </div>
            <Mt5AccountDetails details={details} />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const tradingSteps = [
  {
    title: "Price Gap Detection",
    image: "/landing/price-gap-detection-full.png",
    imageAlt: "Gold price chart showing a detected price gap",
  },
  {
    title: "Trade Execution",
    image: "/landing/trade-execution-full.png",
    imageAlt: "Spot and futures trade execution report",
  },
  {
    title: "Profit Logging",
    image: "/landing/profit-logging-full.png",
    imageAlt: "Transaction history and account summary reports",
  },
];

function StrategyOverview() {
  return (
    <section id="strategy" className="scroll-mt-24 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Our trading approach"
          title="Zero-Loss Algorithmic Trading, Finally a Reality"
          accent="Zero-Loss"
        />

        <Reveal delay={0.06}>
          <p className="mx-auto mt-7 max-w-4xl text-pretty text-base leading-8 text-ink-dim sm:text-lg">
            Arbitrage is the holy grail of trading — risk-free profit from market inefficiencies.
            Chopra Capital is built to detect and exploit gold price discrepancies between the Spot
            and Futures markets in real time. Gold trades in two places at once: the spot market and
            the futures market. Those two prices should be linked, but they drift apart for short
            windows. When they do, we buy the cheaper side and sell the higher side at the same time,
            then hold until the gap closes. It does this 24/7, with no fatigue, no emotions, and no
            room for human error. Backed by advanced algorithms and overseen by trading
            professionals.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:mt-14 lg:grid-cols-3">
          {tradingSteps.map((step, index) => (
            <Reveal key={step.title} delay={index * 0.05}>
              <article className="overflow-hidden rounded-[1.75rem] border border-stone-200 bg-[#f6f6f5] p-5 shadow-sm sm:p-6">
                <h3 className="text-center text-lg font-semibold text-ink sm:text-xl">{step.title}</h3>
                <div className="relative mt-4 h-56 w-full overflow-hidden sm:h-64">
                  <Image
                    src={step.image}
                    alt={step.imageAlt}
                    fill
                    sizes="(min-width: 1024px) 30vw, 90vw"
                    className="object-contain"
                  />
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const investorSteps = [
  {
    Icon: UserCheck,
    title: "Open your account",
    copy: "Create your Chopra Capital investor account.",
  },
  {
    Icon: LockKeyhole,
    title: "Complete KYC",
    copy: "Submit your identity documents for approval.",
  },
  {
    Icon: WalletCards,
    title: "Deposit funds",
    copy: "Choose an enabled deposit method and submit your request.",
  },
  {
    Icon: LineChart,
    title: "Follow performance",
    copy: "Track your balance, profits, and account activity.",
  },
  {
    Icon: Clock3,
    title: "Withdraw weekly",
    copy: "Request a withdrawal during the weekly window.",
  },
];

function InvestorJourney() {
  return (
    <section id="getting-started" className="scroll-mt-24 px-4 py-8 sm:px-6 sm:py-12">
      <div className="section-shell mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12 lg:px-12">
        <SectionHeading
          eyebrow="How it works"
          title="Five Steps, No Software"
          accent="No Software"
        />

        <div className="relative mt-9 grid gap-3 sm:grid-cols-2 md:grid-cols-5">
          <div
            className="absolute left-[10%] right-[10%] top-7 hidden h-px bg-gold-200 md:block"
            aria-hidden
          />
          {investorSteps.map((step, index) => (
            <Reveal key={step.title} delay={index * 0.04}>
              <article className="relative h-full rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <span className="relative z-10 flex size-12 items-center justify-center rounded-xl border border-gold-200 bg-gold-50 text-gold-700">
                  <step.Icon className="size-5" aria-hidden />
                </span>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-gold-700">
                  Step 0{index + 1}
                </p>
                <h3 className="mt-2 text-lg font-bold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-dim">{step.copy}</p>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.12}>
          <p className="mx-auto mt-7 max-w-3xl rounded-2xl border border-gold-200 bg-gold-50 px-5 py-4 text-center text-base font-semibold leading-7 text-gold-950">
            You never install anything. You never touch MT5 unless you want to inspect the account.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

const operationalPoints = [
  {
    Icon: Zap,
    title: "Executes in milliseconds.",
    copy: "Gaps close in fractions of a second. The system takes both legs faster than any human could click. If it can’t get both, it doesn’t take the trade.",
  },
  {
    Icon: UserCheck,
    title: "Runs 24/5, watched by people.",
    copy: "The system trades on its own through every session. A trader monitors it, kills it in abnormal conditions, and can flatten the book manually. Automation without a human on the switch is how accounts blow up.",
  },
];

function ThingsThatMatter() {
  return (
    <section id="things-that-matter" className="scroll-mt-24 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Execution and oversight"
          title="Things that matter"
          accent="matter"
        />

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {operationalPoints.map((point, index) => (
            <Reveal key={point.title} delay={index * 0.06}>
              <article className="h-full rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-7">
                <span className="flex size-11 items-center justify-center rounded-xl bg-gold-50 text-gold-700">
                  <point.Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-5 text-xl font-bold text-ink">{point.title}</h3>
                <p className="mt-3 text-base leading-7 text-ink-dim">{point.copy}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const faqs = [
  [
    "Do I need to install trading software?",
    "No. Chopra Capital manages the trading operation. You never install a bot or configure MT5. The read-only MT5 account is available only if you want to inspect the trading history.",
  ],
  [
    "Is the 1–4% monthly return guaranteed?",
    "No. It is a performance objective, not a guarantee. Some periods may be flat or negative, and capital can be lost.",
  ],
  [
    "What does no lock-in mean?",
    "There is no long-term lock-in period. Withdrawal requests follow the weekly window shown inside the investor portal.",
  ],
  [
    "How do I follow my account?",
    "Your dashboard shows your balance, profits, queued funds, transactions, support tickets, and account activity.",
  ],
  [
    "When can I withdraw?",
    "Withdrawal requests are accepted during the weekly schedule shown in the investor portal and are processed after approval.",
  ],
];

function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-24 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <SectionHeading
          eyebrow="Common questions"
          title="Straightforward answers before you invest."
          accent="before you invest"
        />
        <div className="mt-8 space-y-3">
          {faqs.map(([question, answer], index) => {
            const active = open === index;
            return (
              <Reveal key={question} delay={index * 0.03}>
                <article className="feature-surface overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpen(active ? null : index)}
                    aria-expanded={active}
                    className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left sm:px-6"
                  >
                    <span className="text-base font-bold text-ink sm:text-lg">{question}</span>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white">
                      <ChevronDown
                        className={cn(
                          "size-4 text-gold-700 transition-transform",
                          active && "rotate-180",
                        )}
                        aria-hidden
                      />
                    </span>
                  </button>
                  <div
                    className={cn(
                      "grid transition-all duration-300",
                      active ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 pb-5 text-sm leading-7 text-ink-dim sm:px-6">
                        {answer}
                      </p>
                    </div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="px-4 pb-10 pt-4 sm:px-6 sm:pb-14 sm:pt-6">
      <Reveal>
        <div className="section-shell relative mx-auto max-w-7xl overflow-hidden px-5 py-12 text-center sm:px-8 sm:py-16">
          <div className="absolute inset-0 -z-10 gold-aura" aria-hidden />
          <div className="absolute inset-0 -z-10 landing-grid opacity-50" aria-hidden />
          <p className="eyebrow">Get started</p>
          <h2 className="mx-auto mt-5 max-w-4xl text-balance text-4xl font-extrabold leading-tight tracking-[-0.045em] text-ink sm:text-6xl">
            A simpler way to participate in{" "}
            <em className="gold-text not-italic">automated gold trading.</em>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-ink-dim">
            Open your account, complete verification, and review the process before adding funds.
            No trading software to install or configure. Capital remains at risk.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="btn-gold min-h-12 px-8 text-base">
              Open an account
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <a
              href="https://wa.me/918123320128"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost min-h-12 px-8 text-base"
              aria-label="Contact Chopra Capital on WhatsApp at +91 81233 20128"
            >
              Contact us
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export function LandingSections({ mt5 }: { mt5: LandingMt5Details }) {
  return (
    <>
      <LiveHistory mt5={mt5} />
      <StrategyOverview />
      <InvestorJourney />
      <ThingsThatMatter />
      <Faq />
      <FinalCta />
    </>
  );
}
