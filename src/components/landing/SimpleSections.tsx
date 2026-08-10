"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bot,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Landmark,
  LineChart,
  LockKeyhole,
  ScanLine,
  ShieldAlert,
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
        <h2 className="mt-5 text-balance font-serif text-3xl leading-tight tracking-[-0.03em] text-ink sm:text-5xl">
          {before}
          <em className="gold-text italic">{accent}</em>
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

function StrategyOverview() {
  return (
    <section id="strategy" className="scroll-mt-24 px-4 py-8 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Our trading approach"
          title="Zero-Loss Algorithmic Trading, Finally a Reality"
          accent="Zero-Loss"
          copy="Arbitrage is the holy grail of trading — risk-free profit from market inefficiencies. Chopra Capital is built to detect and exploit gold price discrepancies between the Spot and Futures markets in real time. It does this 24/7, with no fatigue, no emotions, and no room for human error. Backed by advanced algorithms and overseen by trading professionals, Chopra Capital guarantees every trade is a winning trade."
        />

      </div>
    </section>
  );
}

const tradingSteps = [
  {
    title: "Price Gap Detection",
    copy: "Chopra Capital scans the Spot and Future markets for profitable price discrepancies.",
    image: "/landing/price-gap-detection-full.png",
    imageAlt: "Gold price chart showing a detected price gap",
  },
  {
    title: "Trade Execution",
    copy: "It buys low in the Spot market and sells high in the Future market, securing risk-free profits.",
    image: "/landing/trade-execution-full.png",
    imageAlt: "Spot and futures trade execution report",
  },
  {
    title: "Profit Logging",
    copy: "With nanosecond execution, Chopra Capital ensures seamless trades and consistent profits.",
    image: "/landing/profit-logging-full.png",
    imageAlt: "Transaction history and account summary reports",
  },
];

function TradingProcess() {
  return (
    <section id="how-it-works" className="scroll-mt-24 px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-7xl py-8 sm:py-12">
        <SectionHeading
          eyebrow="How it works"
          title="How It Works?"
          accent="Works?"
          copy="Chopra Capital detects price inefficiencies and executes trades instantly, with zero risk."
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {tradingSteps.map((step, index) => (
            <Reveal key={step.title} delay={index * 0.06}>
              <article className="flex h-full min-h-[430px] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-[#f6f6f5] px-6 pt-7 shadow-sm sm:px-8">
                <h3 className="text-xl font-semibold text-ink sm:text-2xl">{step.title}</h3>
                <p className="mt-3 text-base leading-7 text-ink-dim">{step.copy}</p>
                <div className="relative mt-auto h-64 w-full overflow-hidden">
                  <Image
                    src={step.image}
                    alt={step.imageAlt}
                    fill
                    sizes="(min-width: 1024px) 30vw, 90vw"
                    className="object-contain object-bottom"
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

const features = [
  {
    Icon: Activity,
    title: "24/5 Automated Trading",
    copy: "Chopra Capital continuously monitors markets and executes trades even while you sleep, ensuring you never miss a profitable opportunity.",
  },
  {
    Icon: UserCheck,
    title: "Expert Advise",
    copy: "Combining the accuracy of expert advisors with the insight of experienced traders, Chopra Capital delivers smarter, more reliable decisions",
  },
  {
    Icon: ScanLine,
    title: "Price Gap Arbitrage Engine",
    copy: "Chopra Capital constantly scans Spot and Futures markets for even the smallest price gaps. When an opportunity appears, it executes high-speed trades to lock in profits before the gap closes.",
  },
  {
    Icon: Zap,
    title: "Real-Time Execution",
    copy: "Trades are executed in milliseconds — far faster than any human reaction time. This lightning-fast execution ensures that price gaps are captured before they disappear, maximizing profitability.",
  },
  {
    Icon: Landmark,
    title: "Broker Agnostic",
    copy: "No need to change your broker. Chopra Capital is compatible with most MT4 and MT5 brokers, giving you the freedom to use your existing trading setup with zero limitations.",
  },
  {
    Icon: BarChart3,
    title: "Instant Trade Reports",
    copy: "Stay informed with real-time updates on every trade executed by the bot. Access detailed logs, performance metrics, and profit reports directly from your dashboard, anytime.",
  },
  {
    Icon: LockKeyhole,
    title: "Encrypted & Secure",
    copy: "Security is built into every layer of Chopra Capital. Your account data, MT5 credentials, and trading history are protected using enterprise-grade encryption and strict access controls.",
  },
  {
    Icon: Bot,
    title: "Emotionless Execution",
    copy: "Chopra Capital trades without fear, greed, or hesitation. Every decision is based purely on logic, market data, and strategy — resulting in consistently rational, risk-free execution.",
  },
];

function KeyFeatures() {
  return (
    <section id="features" className="scroll-mt-24 px-4 py-8 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
          <div className="lg:sticky lg:top-28 lg:h-fit">
            <SectionHeading
              centered={false}
              eyebrow="Key Features"
              title="Power-Packed Features, Built for Zero Losses"
              accent="Power-Packed"
              copy="Everything you need for safe, smart, and automated gold trading."
            />
            <Reveal delay={0.08}>
              <div className="mt-8 flex flex-wrap gap-2">
                {["Robust Security", "Fast", "Accurate", "Automated Efficiency", "Profitable"].map(
                  (item) => (
                    <span
                      key={item}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-ink-dim shadow-sm"
                    >
                      {item}
                    </span>
                  ),
                )}
              </div>
            </Reveal>
          </div>

          <div className="divide-y divide-slate-200 border-l-2 border-blue-500/30">
            {features.map((feature, index) => (
              <Reveal key={feature.title} delay={index * 0.035}>
                <article className="relative px-6 py-6 sm:px-8 sm:py-7">
                  <span className="absolute -left-[7px] top-9 size-3 rounded-full border-2 border-white bg-blue-600 shadow-sm" />
                  <div className="flex items-start gap-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                      <feature.Icon className="size-5" aria-hidden />
                    </span>
                    <div>
                      <h3 className="font-semibold text-ink">{feature.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-ink-dim">{feature.copy}</p>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal delay={0.08}>
          <aside className="mt-10 rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 sm:p-7" aria-label="Trading disclaimer">
            <div className="flex items-start gap-4">
              <ShieldAlert className="mt-0.5 size-6 shrink-0 text-amber-700" aria-hidden />
              <div>
                <h3 className="font-serif text-xl text-amber-950">Important disclaimer</h3>
                <p className="mt-2 text-sm leading-7 text-amber-900">
                  “Zero-loss,” “risk-free,” “guaranteed,” “profitable,” and similar statements describe the intended strategy design and are not guarantees of actual results. Trading involves risk, price gaps may disappear before execution, losses can occur, and invested capital is at risk. Past performance does not guarantee future results.
                </p>
              </div>
            </div>
          </aside>
        </Reveal>
      </div>
    </section>
  );
}
const investorSteps = [
  {
    Icon: UserCheck,
    title: "Open your account",
    copy: "Create your Chopra Capital account and enter your basic profile information.",
  },
  {
    Icon: LockKeyhole,
    title: "Complete KYC",
    copy: "Submit your identity documents. KYC approval is required before adding funds.",
  },
  {
    Icon: WalletCards,
    title: "Deposit funds",
    copy: "Choose crypto, bank transfer, or cash when the method is available on your account.",
  },
  {
    Icon: LineChart,
    title: "Follow performance",
    copy: "Use your dashboard to review your balance, profits, and account activity.",
  },
  {
    Icon: Clock3,
    title: "Request a withdrawal",
    copy: "Submit your request during the scheduled window shown in the investor portal for processing on Monday.",
  },
];

function InvestorJourney() {
  return (
    <section id="getting-started" className="scroll-mt-24 px-4 py-4 sm:px-6 sm:py-6">
      <div className="section-shell mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12 lg:px-12">
        <SectionHeading
          eyebrow="How it works"
          title="From account opening to withdrawal in five clear steps."
          accent="five clear steps"
          copy="Getting started is straightforward. Complete verification, add funds, follow your account, and request withdrawals from the same dashboard."
        />

        <div className="relative mt-10 grid gap-4 md:grid-cols-5">
          <div
            className="absolute left-[10%] right-[10%] top-7 hidden h-px bg-blue-200 md:block"
            aria-hidden
          />
          {investorSteps.map((step, index) => (
            <Reveal key={step.title} delay={index * 0.05}>
              <article className="relative h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <span className="relative z-10 flex size-14 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-blue-700">
                  <step.Icon className="size-5" aria-hidden />
                </span>
                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                  Step 0{index + 1}
                </p>
                <h3 className="mt-2 font-serif text-lg text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-dim">{step.copy}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
function InvestorExperience() {
  const items = [
    "See your current balance and performance",
    "Track deposits and withdrawal requests",
    "Review profit and balance charts",
    "Contact support and attach documents",
    "Manage bank, crypto, profile, and security details",
  ];

  return (
    <section id="visibility" className="scroll-mt-24 px-4 py-4 sm:px-6 sm:py-6">
      <div className="section-shell mx-auto grid max-w-7xl gap-10 px-5 py-10 sm:px-8 sm:py-12 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:px-12">
        <div>
          <SectionHeading
            centered={false}
            eyebrow="Your investor dashboard"
            title="Everything important, in one place."
            accent="one place"
            copy="Your account is designed to show the information that matters without filling the screen with trading or accounting jargon."
          />
          <Reveal delay={0.08}>
            <ul className="mt-8 space-y-3">
              {items.map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-ink-dim">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                    <Check className="size-4 text-emerald-700" aria-hidden />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <Reveal delay={0.12}>
          <div className="product-window overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="eyebrow">Investor dashboard</p>
                <p className="mt-1 text-sm text-ink">A clear account overview</p>
              </div>
              <span className="status-pill">
                <span className="status-dot" />
                Updated
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 p-5">
              {[
                [CircleDollarSign, "Balance", "Current account value"],
                [Clock3, "In queue", "Waiting to be invested"],
                [LineChart, "Performance", "Profit and balance charts"],
                [Landmark, "Transactions", "Deposits and withdrawals"],
              ].map(([Icon, title, copy]) => {
                const ItemIcon = Icon as typeof CircleDollarSign;
                return (
                  <div key={String(title)} className="metric-tile">
                    <ItemIcon className="size-5 text-blue-600" aria-hidden />
                    <p className="mt-5 font-serif text-lg text-ink">{String(title)}</p>
                    <p className="mt-1 text-xs leading-5 text-ink-dim">{String(copy)}</p>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-slate-200 p-5">
              <div className="flex h-28 items-end gap-2" aria-hidden>
                {[31, 39, 37, 50, 46, 59, 56, 71, 66, 78, 75, 90].map(
                  (height, index) => (
                    <span
                      key={index}
                      className="flex-1 rounded-t bg-gradient-to-t from-blue-200 to-cyan-400"
                      style={{ height: `${height}%` }}
                    />
                  ),
                )}
              </div>
              <div className="mt-3 flex justify-between text-xs font-medium text-ink-dim">
                <span>Account opened</span>
                <span>Today</span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
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
    ["Investor access", "ChopraCapital"],
  ];

  return (
    <section id="backtesting" className="scroll-mt-24 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Live account history"
          title="Review the trading account yourself."
          accent="yourself"
          copy="Use the read-only investor access below to inspect the account in MetaTrader 5. It allows viewing only and cannot place or change trades."
        />
        <Reveal delay={0.1}>
          <div className="product-window mx-auto mt-6 max-w-4xl overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <p className="eyebrow">MT5 read-only account</p>
                <p className="mt-1 text-sm text-ink-dim">Live account details</p>
              </div>
              <span className="status-pill w-fit">
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

const terms = [
  ["Trading focus", "Gold", "A focused trading approach"],
  ["Withdrawal request", "Scheduled window", "Shown in investor portal"],
  ["Processing day", "Monday", "After approval"],
  ["Lock-in period", "None", "The weekly request cycle applies"],
  ["Monthly objective", "1–3%", "An objective, never a guarantee"],
];

function Terms() {
  return (
    <section id="terms" className="scroll-mt-24 px-4 py-4 sm:px-6 sm:py-6">
      <div className="section-shell mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12 lg:px-12">
        <SectionHeading
          eyebrow="Terms and schedule"
          title="Simple terms and a clear weekly schedule."
          accent="clear weekly schedule"
        />
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {terms.map(([label, value, note], index) => (
            <Reveal key={label} delay={index * 0.04}>
              <article className="h-full rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-medium uppercase tracking-[.14em] text-ink-dim">
                  {label}
                </p>
                <p className="mt-4 font-serif text-2xl text-blue-700">{value}</p>
                <p className="mt-2 text-xs leading-5 text-ink-dim">{note}</p>
              </article>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.12}>
          <div className="mt-5 flex gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden />
            <div>
              <p className="font-serif text-lg text-amber-950">Risk is reduced, not erased.</p>
              <p className="mt-2 text-sm leading-6 text-amber-900">
                Automated trading and risk controls cannot guarantee a profit. Markets can move
                unexpectedly, technical problems can occur, and invested capital can be lost.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const faqs = [
  [
    "Do I need to install a trading bot?",
    "No. Chopra Capital manages the trading operation. Investors only need an account to fund, monitor, and manage their investment.",
  ],
  [
    "Is the return guaranteed?",
    "No. The 1–3% monthly figure is an objective, not a guarantee. Some periods may be flat or negative, and capital can be lost.",
  ],
  [
    "How do I follow my account?",
    "Your dashboard shows your balance, performance charts, queued funds, transaction history, support tickets, and security settings.",
  ],
  [
    "How are deposits and withdrawals protected?",
    "KYC is required, and payment requests pass through verification and approval before account balances or payouts are completed.",
  ],
  [
    "When can I withdraw?",
    "Requests are accepted during the scheduled window shown in the investor portal and processed on Mondays after approval. There is no long-term lock-in.",
  ],
];

function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-24 px-4 py-8 sm:px-6 sm:py-14">
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
                    <span className="font-serif text-base text-ink sm:text-lg">{question}</span>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white">
                      <ChevronDown
                        className={cn(
                          "size-4 text-blue-700 transition-transform",
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
    <section className="px-4 pb-10 sm:px-6 sm:pb-14">
      <Reveal>
        <div className="section-shell relative mx-auto max-w-7xl overflow-hidden px-5 py-12 text-center sm:px-8 sm:py-16">
          <div className="absolute inset-0 -z-10 gold-aura" aria-hidden />
          <div className="absolute inset-0 -z-10 landing-grid opacity-50" aria-hidden />
          <p className="eyebrow">Get started</p>
          <h2 className="mx-auto mt-5 max-w-4xl text-balance font-serif text-4xl leading-tight tracking-[-0.035em] text-ink sm:text-6xl">
            A simpler way to participate in{" "}
            <em className="gold-text italic">automated gold trading.</em>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-ink-dim">
            Open your account, complete verification, and review the process before adding
            funds. No trading software to install or configure. Capital remains at risk.
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
      <StrategyOverview />
      <TradingProcess />
      <KeyFeatures />
      <InvestorJourney />
      <InvestorExperience />
      <LiveHistory mt5={mt5} />
      <Terms />
      <Faq />
      <FinalCta />
    </>
  );
}
