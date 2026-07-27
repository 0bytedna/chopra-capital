"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Bot,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Eye,
  FileCheck2,
  Landmark,
  Layers3,
  LineChart,
  LockKeyhole,
  Scale,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  WalletCards,
} from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";

function SectionHeading({ eyebrow, title, accent, copy, centered = true }: { eyebrow: string; title: string; accent: string; copy?: string; centered?: boolean }) {
  const [before, after] = title.split(accent);
  return (
    <Reveal>
      <div className={cn("max-w-3xl", centered && "mx-auto text-center")}>
        <div className={cn("section-chip", centered && "mx-auto")}><span className="size-1.5 rounded-full bg-gold-400" />{eyebrow}</div>
        <h2 className="mt-5 text-balance font-serif text-3xl leading-tight tracking-[-0.03em] text-ink sm:text-5xl">
          {before}<em className="gold-text italic">{accent}</em>{after}
        </h2>
        {copy && <p className={cn("mt-5 max-w-2xl text-pretty text-sm leading-7 text-ink-dim sm:text-base", centered && "mx-auto")}>{copy}</p>}
      </div>
    </Reveal>
  );
}

const aboutCards = [
  { Icon: UserCheck, title: "Managed for investors", copy: "Investors participate in a managed gold trading operation without buying or configuring software." },
  { Icon: Bot, title: "Automation works internally", copy: "Automation supports market monitoring and predefined execution rules inside the operation." },
  { Icon: ShieldCheck, title: "Accountable by design", copy: "Chopra Capital remains responsible for oversight, accounting, investor servicing and operational decisions." },
];

function About() {
  return (
    <section id="about" className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow="What Chopra Capital is" title="A trading operation, not a bot store." accent="not a bot store" copy="Investors do not buy software, configure a strategy or connect their own broker. They open an account with Chopra Capital, complete KYC and allocate capital to a professionally managed pool. Our automation is internal infrastructure. It helps the trading desk monitor markets and execute predefined rules consistently. The company remains responsible for oversight, accounting, investor servicing and operational decisions." />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {aboutCards.map((card, index) => (
            <Reveal key={card.title} delay={index * 0.06}>
              <article className="feature-surface group h-full p-6 transition duration-300 hover:-translate-y-1 hover:border-gold-500/25 sm:p-7">
                <div className="flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-2xl border border-gold-500/20 bg-gold-500/8"><card.Icon className="size-5 text-gold-400" aria-hidden /></span>
                  <span className="font-mono text-xs text-ink-faint">0{index + 1}</span>
                </div>
                <h3 className="mt-8 font-serif text-2xl text-ink">{card.title}</h3>
                <p className="mt-3 text-sm leading-7 text-ink-dim">{card.copy}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const steps = [
  { Icon: UserCheck, title: "Open your account", copy: "Create your account and complete your investor profile." },
  { Icon: BadgeCheck, title: "Complete KYC", copy: "Complete identity verification. KYC approval is required before depositing." },
  { Icon: WalletCards, title: "Deposit funds", copy: "Fund by USDT, bank transfer or cash through method-specific verification." },
  { Icon: Layers3, title: "Enter the pool", copy: "Confirmed funds are converted, queued and moved to the broker in controlled batches." },
  { Icon: Banknote, title: "Withdraw weekly", copy: "Submit on Sunday from 12:00 AM to 12:00 PM IST. Approved requests are processed on Monday." },
];

function Process() {
  return (
    <section id="how-it-works" className="scroll-mt-24 px-4 py-8 sm:px-6 sm:py-12">
      <div className="section-shell mx-auto max-w-7xl px-4 py-16 sm:px-8 sm:py-20 lg:px-12">
        <SectionHeading eyebrow="How it works" title="From verification to withdrawal in five clear steps." accent="five clear steps" copy="Capital does not jump directly into the trading pool. Identity, payments, conversion and broker movements pass through separate operational checks." />
        <div className="relative mt-12 grid gap-3 md:grid-cols-5">
          <div className="absolute left-[10%] right-[10%] top-7 hidden h-px bg-gradient-to-r from-transparent via-gold-500/30 to-transparent md:block" aria-hidden />
          {steps.map((step, index) => (
            <Reveal key={step.title} delay={index * 0.055}>
              <article className="relative h-full rounded-2xl border border-slate-200/80 bg-vault-950/45 p-5 transition hover:border-gold-500/25 hover:bg-gold-500/[0.035]">
                <span className="relative z-10 flex size-14 items-center justify-center rounded-2xl border border-gold-500/20 bg-vault-900 shadow-lg shadow-black/20"><step.Icon className="size-5 text-gold-400" aria-hidden /></span>
                <p className="mt-6 font-mono text-xs uppercase tracking-[0.18em] text-gold-600">Step 0{index + 1}</p>
                <h3 className="mt-2 font-serif text-lg text-ink">{step.title}</h3>
                <p className="mt-2 text-xs leading-6 text-ink-dim">{step.copy}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const capabilities = [
  { Icon: Bot, title: "Automated execution", copy: "Rules-based systems respond faster and more consistently than manual order entry.", className: "lg:col-span-2" },
  { Icon: Eye, title: "Human supervision", copy: "The trading desk monitors execution, market conditions and exceptions throughout trading hours." },
  { Icon: Scale, title: "Hedge discipline", copy: "The operation is built around hedged gold exposure rather than unsupported directional bets." },
  { Icon: LockKeyhole, title: "Protected accounts", copy: "Password security, optional authenticator 2FA, KYC controls and role-based administration." },
  { Icon: BadgeCheck, title: "Verified movements", copy: "Deposits and withdrawals have dedicated approval, correction and settlement workflows." },
  { Icon: FileCheck2, title: "Auditable accounting", copy: "Balance changes, fees, profit/loss entries and administrative corrections are recorded.", className: "lg:col-span-2" },
];

function Operations() {
  return (
    <section id="operations" className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow="Built for disciplined operations" title="Technology handles repetition. People handle responsibility." accent="People handle responsibility" copy="Automation improves execution; it does not replace governance. Investor money, risk decisions and account records remain under administrative control." />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {capabilities.map((item, index) => (
            <Reveal key={item.title} delay={index * 0.045} className={item.className}>
              <article className="feature-surface group h-full overflow-hidden p-6 transition duration-300 hover:border-gold-500/25 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <span className="flex size-11 items-center justify-center rounded-2xl border border-gold-500/20 bg-gold-500/8"><item.Icon className="size-5 text-gold-400" aria-hidden /></span>
                  <span className="font-mono text-xs text-ink-faint">0{index + 1}</span>
                </div>
                <h3 className="mt-8 font-serif text-xl text-ink sm:text-2xl">{item.title}</h3>
                <p className="mt-3 max-w-md text-sm leading-7 text-ink-dim">{item.copy}</p>
                <div className="mt-8 h-px w-full bg-gradient-to-r from-gold-500/30 to-transparent transition-all group-hover:from-gold-400/60" />
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Visibility() {
  const items = ["Current balance and account performance", "Confirmed funds waiting in queue", "Profit-only and total-balance performance charts", "Deposit, withdrawal and ledger history", "Profile, bank, crypto and security controls"];
  return (
    <section id="visibility" className="scroll-mt-24 px-4 py-8 sm:px-6 sm:py-12">
      <div className="section-shell mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[.85fr_1.15fr] lg:items-center lg:px-12">
        <div>
          <SectionHeading centered={false} eyebrow="Investor visibility" title="Your share of the operation, clearly accounted for." accent="clearly accounted for" copy="Every investor has a different entry date and capital history. The platform uses pool units and NAV so deposits, withdrawals, profits and losses can be attributed consistently." />
          <Reveal delay={0.08}>
            <ul className="mt-8 space-y-3">
              {items.map((item) => <li key={item} className="flex items-center gap-3 text-sm text-ink-dim"><span className="flex size-6 items-center justify-center rounded-full border border-positive/20 bg-positive/8"><Check className="size-3.5 text-positive" aria-hidden /></span>{item}</li>)}
            </ul>
          </Reveal>
        </div>
        <Reveal delay={0.12}>
          <div className="product-window overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-4"><div><p className="eyebrow">Investor dashboard</p><p className="mt-1 text-sm text-ink">A clear view of your account</p></div><span className="status-pill"><span className="status-dot" /> Updated</span></div>
            <div className="grid grid-cols-2 gap-3 p-5">
              {[[CircleDollarSign,"Balance","Your invested value"],[Clock3,"In queue","Verified, awaiting investment"],[LineChart,"Performance","Filtered by your own timeline"],[Landmark,"History","Balance changes over time"]].map(([Icon,title,copy]) => { const ItemIcon=Icon as typeof CircleDollarSign; return <div key={String(title)} className="metric-tile"><ItemIcon className="size-4 text-gold-400" aria-hidden/><p className="mt-5 font-serif text-lg text-ink">{String(title)}</p><p className="mt-1 text-xs leading-5 text-ink-faint">{String(copy)}</p></div>; })}
            </div>
            <div className="border-t border-slate-200/80 p-5"><div className="flex h-28 items-end gap-2" aria-hidden>{[31,39,37,50,46,59,56,71,66,78,75,90].map((height,index)=><span key={index} className="flex-1 rounded-t bg-gradient-to-t from-gold-700/20 to-gold-300/80" style={{height:`${height}%`}} />)}</div><div className="mt-3 flex justify-between text-xs uppercase tracking-[.15em] text-ink-faint"><span>Account opened</span><span>Today</span></div></div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Backtesting() {
  const details = [["Broker Name","NewEra Capital"],["Server","NeweraCapitalMarkets-Live"],["MT5 ID","250129"],["Investor access","Available to verified investors"]];
  return (
    <section id="backtesting" className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow="Backtesting Data" title="Check our live account history." accent="live account history" copy="Use the read-only investor credentials to review the account directly in MetaTrader 5. Investor access allows account inspection without trading permissions." />
        <Reveal delay={0.1}>
          <div className="product-window mx-auto mt-12 max-w-4xl overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-slate-200/80 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="eyebrow">MT5 read-only account</p><p className="mt-2 text-sm text-ink-dim">Live account details</p></div><span className="status-pill w-fit"><span className="status-dot" /> Live history</span></div>
            <dl className="grid sm:grid-cols-2">{details.map(([label,value], index)=><div key={label} className={cn("px-6 py-5", index < 2 && "border-b border-slate-200/80", index % 2 === 0 && "sm:border-r sm:border-slate-200/80")}><dt className="text-xs uppercase tracking-[.16em] text-ink-faint">{label}</dt><dd className="mt-2 break-all font-mono text-sm text-ink">{value}</dd></div>)}</dl>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const terms = [["Minimum deposit","$2,000","Single investor tier"],["Trading focus","Gold","Specialist operation"],["Withdrawal request","Sunday","12:00 AM–12:00 PM IST"],["Processing day","Monday","After administrative approval"],["Lock-in period","None","Weekly request cycle applies"],["Monthly objective","1–3%","Objective only, never guaranteed"]];

function Terms() {
  return (
    <section id="terms" className="scroll-mt-24 px-4 py-8 sm:px-6 sm:py-12">
      <div className="section-shell mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <SectionHeading eyebrow="Terms and schedule" title="Simple terms. A defined weekly rhythm." accent="defined weekly rhythm" />
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {terms.map(([label,value,note],index)=><Reveal key={label} delay={index*.04}><article className="h-full rounded-2xl border border-slate-200/80 bg-vault-950/40 p-5 transition hover:border-gold-500/25"><p className="text-xs uppercase tracking-[.17em] text-ink-faint">{label}</p><p className="mt-4 font-serif text-2xl text-gold-300">{value}</p><p className="mt-2 text-xs leading-5 text-ink-dim">{note}</p></article></Reveal>)}
        </div>
        <Reveal delay={0.12}><div className="mt-5 flex gap-4 rounded-2xl border border-gold-500/20 bg-gold-500/[0.04] p-5 sm:p-6"><ShieldAlert className="mt-0.5 size-5 shrink-0 text-gold-400" aria-hidden/><div><p className="font-serif text-lg text-gold-300">Risk is reduced, not erased.</p><p className="mt-2 text-sm leading-6 text-ink-dim">Automation and hedging cannot guarantee profit. Slippage, liquidity, counterparty issues, operational failures and market events can cause losses. Capital is at risk.</p></div></div></Reveal>
      </div>
    </section>
  );
}

const faqs = [
  ["Are you selling a trading bot?","No. Chopra Capital is a managed trading operation. Automation is used internally for monitoring and execution; investors do not buy, install or configure software."],
  ["Is the return guaranteed?","No. The 1–3% monthly figure is an objective, not a guarantee. Some periods may be flat or negative, and invested capital can be lost."],
  ["How are my profits calculated?","Your invested balance is represented by pool units. Their value changes with NAV, while deposits, withdrawals and other cash movements are recorded separately."],
  ["How do you protect deposits and withdrawals?","KYC is required. Payments pass through method-specific verification, correction and approval stages before balances change or payouts are completed."],
  ["When can I withdraw?","Requests are accepted on Sundays from 12:00 AM to 12:00 PM IST and processed on Mondays after approval. There is no long-term lock-in."],
  ["What can I see in my account?","Your dashboard includes balance, queued funds, performance charts, transaction history, support tickets and security settings."],
];

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-4xl">
        <SectionHeading eyebrow="Common questions" title="Clear answers before you allocate." accent="before you allocate" />
        <div className="mt-10 space-y-3">
          {faqs.map(([question,answer],index)=>{const active=open===index;return <Reveal key={question} delay={index*.03}><article className="feature-surface overflow-hidden"><button type="button" onClick={()=>setOpen(active?null:index)} aria-expanded={active} className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left sm:px-6"><span className="font-serif text-base text-ink sm:text-lg">{question}</span><span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white/80"><ChevronDown className={cn("size-4 text-gold-500 transition-transform",active&&"rotate-180")} aria-hidden/></span></button><div className={cn("grid transition-all duration-300",active?"grid-rows-[1fr] opacity-100":"grid-rows-[0fr] opacity-0")}><div className="overflow-hidden"><p className="px-5 pb-5 text-sm leading-7 text-ink-dim sm:px-6">{answer}</p></div></div></article></Reveal>})}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="px-4 pb-20 sm:px-6 sm:pb-28">
      <Reveal>
        <div className="section-shell relative mx-auto max-w-7xl overflow-hidden px-5 py-16 text-center sm:px-8 sm:py-24">
          <div className="absolute inset-0 -z-10 gold-aura" aria-hidden />
          <div className="absolute inset-0 -z-10 landing-grid opacity-50" aria-hidden />
          <p className="eyebrow">Begin with clarity</p>
          <h2 className="mx-auto mt-5 max-w-4xl text-balance font-serif text-4xl leading-tight tracking-[-0.035em] text-ink sm:text-6xl">A disciplined way to participate in <em className="gold-text italic">gold trading.</em></h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-ink-dim sm:text-base">Open your account, complete verification and review the process before allocating capital. No software to install. No strategy to configure. Capital at risk.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/signup" className="btn-gold min-h-12 px-8 text-base">Open an account <ArrowRight className="size-4" aria-hidden/></Link><Link href="/legal/risk" className="btn-ghost min-h-12 px-8 text-base">Read risk disclosure</Link></div>
        </div>
      </Reveal>
    </section>
  );
}

export function LandingSections() {
  return <><About/><Process/><Operations/><Visibility/><Backtesting/><Terms/><Faq/><FinalCta/></>;
}