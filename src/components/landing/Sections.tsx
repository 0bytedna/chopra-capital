"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Banknote, Bot, ChevronDown, CircleDollarSign, Clock3, Eye, FileCheck2, Landmark, Layers3, LineChart, LockKeyhole, Scale, ShieldAlert, ShieldCheck, UserCheck, WalletCards } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";

function Heading({ eyebrow, title, accent, copy }: { eyebrow: string; title: string; accent: string; copy?: string }) {
  const [before, after] = title.split(accent);
  return <Reveal><div className="max-w-3xl"><p className="eyebrow">{eyebrow}</p><h2 className="mt-3 font-serif text-3xl leading-tight tracking-tight text-ink sm:text-5xl">{before}<em className="gold-text italic">{accent}</em>{after}</h2>{copy && <p className="mt-5 max-w-2xl text-sm leading-7 text-ink-dim sm:text-base">{copy}</p>}</div></Reveal>;
}

function About() {
  return <section id="about" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28">
    <div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-start">
      <Heading eyebrow="What Chopra Capital is" title="A trading operation, not a bot store." accent="not a bot store" />
      <Reveal delay={.1}><div className="space-y-5 text-sm leading-7 text-ink-dim sm:text-base"><p>Investors do not buy software, configure a strategy or connect their own broker. They open an account with Chopra Capital, complete KYC and allocate capital to a professionally managed pool.</p><p>Our automation is internal infrastructure. It helps the trading desk monitor markets and execute predefined rules consistently. The company remains responsible for oversight, accounting, investor servicing and operational decisions.</p><div className="grid gap-3 pt-2 sm:grid-cols-2">{[[UserCheck,"Managed for investors"],[Bot,"Automation works internally"],[Scale,"Gold-focused hedging"],[FileCheck2,"Account-level records"]].map(([Icon,label]) => { const ItemIcon = Icon as typeof UserCheck; return <div key={String(label)} className="flex items-center gap-3 rounded-xl border border-gold-600/12 bg-gold-600/5 p-3.5"><ItemIcon className="size-4 text-gold-500" aria-hidden /><span className="text-sm text-ink">{String(label)}</span></div>; })}</div></div></Reveal>
    </div>
  </section>;
}

const steps = [
  { Icon: UserCheck, title: "Create and verify", body: "Open your account, complete your profile and submit KYC. Deposits become available after verification." },
  { Icon: WalletCards, title: "Deposit funds", body: "Choose crypto, bank transfer or cash where enabled. Every payment is manually checked before it moves forward." },
  { Icon: Layers3, title: "Enter the pool", body: "Verified funds wait in queue, then receive pool units at the applicable NAV when they are moved into investment." },
  { Icon: LineChart, title: "Track your account", body: "See your balance, queued funds and performance history from your private investor dashboard." },
  { Icon: Banknote, title: "Withdraw weekly", body: "Submit on Sunday from 12:00 AM to 12:00 PM IST. Approved requests are processed on Monday." },
];
function Process() {
  return <section id="how-it-works" className="scroll-mt-24 border-y border-gold-600/10 bg-vault-900/40"><div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28"><Heading eyebrow="How it works" title="From verification to withdrawal, every step is controlled." accent="every step is controlled" copy="Capital never jumps directly into the trading pool. Identity, payments, conversion and broker movements pass through separate operational checks."/><div className="mt-12 grid gap-4 md:grid-cols-5">{steps.map((step,index) => <Reveal key={step.title} delay={index*.06}><article className="glass-card h-full p-5"><div className="flex items-center justify-between"><step.Icon className="size-5 text-gold-500" aria-hidden/><span className="font-mono text-[10px] text-gold-600">0{index+1}</span></div><h3 className="mt-5 font-serif text-lg text-ink">{step.title}</h3><p className="mt-2 text-xs leading-6 text-ink-dim">{step.body}</p></article></Reveal>)}</div></div></section>;
}

const capabilities = [
  { Icon: Bot, title: "Automated execution", body: "Rules-based systems respond faster and more consistently than manual order entry." },
  { Icon: Eye, title: "Human supervision", body: "The trading desk monitors execution, market conditions and exceptions throughout trading hours." },
  { Icon: Scale, title: "Hedge discipline", body: "The operation is built around hedged gold exposure rather than unsupported directional bets." },
  { Icon: LockKeyhole, title: "Protected accounts", body: "Password security, optional authenticator 2FA, KYC controls and role-based administration." },
  { Icon: BadgeCheck, title: "Verified movements", body: "Deposits and withdrawals have dedicated approval, correction and settlement workflows." },
  { Icon: FileCheck2, title: "Auditable accounting", body: "Balance changes, fees, profit/loss entries and administrative corrections are recorded." },
];
function OperatingSystem() {
  return <section id="operations" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28"><Heading eyebrow="Built for disciplined operations" title="Technology handles repetition. People handle responsibility." accent="People handle responsibility" copy="Automation improves execution; it does not replace governance. Investor money, risk decisions and account records remain under administrative control."/><div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{capabilities.map((item,index) => <Reveal key={item.title} delay={index*.05}><article className="glass-card glass-card-hover h-full p-6"><span className="flex size-10 items-center justify-center rounded-xl border border-gold-600/20 bg-gold-600/8"><item.Icon className="size-5 text-gold-400" aria-hidden /></span><h3 className="mt-5 font-serif text-xl text-ink">{item.title}</h3><p className="mt-2 text-sm leading-6 text-ink-dim">{item.body}</p></article></Reveal>)}</div></section>;
}

function Visibility() {
  return <section id="visibility" className="scroll-mt-24 border-y border-gold-600/10 bg-vault-900/40"><div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1fr_1fr] lg:items-center"><div><Heading eyebrow="Investor visibility" title="Your share of the operation, clearly accounted for." accent="clearly accounted for" copy="Every investor has a different entry date and capital history. The platform uses pool units and NAV so deposits, withdrawals, profits and losses can be attributed consistently."/><Reveal delay={.1}><ul className="mt-7 space-y-3">{["Current balance and account performance", "Confirmed funds waiting in queue", "Profit-only and total-balance performance charts", "Deposit, withdrawal and ledger history", "Profile, bank, crypto and security controls"].map(item => <li key={item} className="flex items-start gap-3 text-sm text-ink-dim"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-gold-500" aria-hidden />{item}</li>)}</ul></Reveal></div><Reveal delay={.12}><div className="glass-card overflow-hidden rounded-3xl"><div className="flex items-center justify-between border-b border-gold-600/15 px-5 py-4"><div><p className="eyebrow">Investor dashboard</p><p className="mt-1 text-sm text-ink">A clear view of your account</p></div><span className="text-xs text-ink-faint">Illustrative</span></div><div className="grid grid-cols-2 gap-3 p-5">{[[CircleDollarSign,"Balance","Your invested value"],[Landmark,"History","Balance changes over time"],[Clock3,"In queue","Verified, awaiting investment"],[LineChart,"Performance","Filtered by your own timeline"]].map(([Icon,title,copy]) => {const ItemIcon=Icon as typeof CircleDollarSign; return <div key={String(title)} className="rounded-2xl border border-gold-600/12 bg-black/15 p-4"><ItemIcon className="size-4 text-gold-500" aria-hidden/><p className="mt-4 font-serif text-lg text-ink">{String(title)}</p><p className="mt-1 text-[11px] leading-5 text-ink-faint">{String(copy)}</p></div>})}</div><div className="border-t border-gold-600/15 px-5 py-5"><div className="flex h-24 items-end gap-2" aria-hidden>{[34,42,38,55,49,66,61,74,70,83,79,92].map((height,index)=><span key={index} className="flex-1 rounded-t-sm bg-gradient-to-t from-gold-700/25 to-gold-400/75" style={{height:`${height}%`}} />)}</div><div className="mt-3 flex justify-between text-[9px] uppercase tracking-[.15em] text-ink-faint"><span>Account opened</span><span>Today</span></div></div></div></Reveal></div></section>;
}

function Backtesting() {
  const details = [
    ["Broker Name", "NewEra Capital"],
    ["Server", "NeweraCapitalMarkets-Live"],
    ["MT5 ID", "250129"],
    ["Investor Password", "Available to verified investors"],
  ];
  return <section id="backtesting" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28"><div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center"><Heading eyebrow="Backtesting Data" title="Check our live account history." accent="live account history" copy="Use the read-only investor access to review the account directly in MetaTrader 5. Investor access allows account inspection without trading permissions."/><Reveal delay={.1}><div className="glass-card overflow-hidden rounded-3xl"><div className="border-b border-gold-600/15 px-6 py-5"><p className="eyebrow">MT5 read-only access</p><p className="mt-2 text-sm text-ink-dim">Live account details</p></div><dl className="divide-y divide-gold-600/10">{details.map(([label,value]) => <div key={label} className="grid gap-1 px-6 py-4 sm:grid-cols-[10rem_1fr] sm:items-center"><dt className="text-[10px] uppercase tracking-[.16em] text-ink-faint">{label}</dt><dd className="break-all font-mono text-sm text-ink">{value}</dd></div>)}</dl></div></Reveal></div></section>;
}
const terms = [
  ["Minimum deposit", "$2,000", "Single investor tier"],
  ["Trading focus", "Gold", "Specialist operation"],
  ["Withdrawal request", "Sunday", "12:00 AM–12:00 PM IST"],
  ["Processing day", "Monday", "After administrative approval"],
  ["Lock-in period", "None", "Weekly request cycle applies"],
  ["Monthly objective", "1–3%", "Objective only, never guaranteed"],
];
function Terms() { return <section id="terms" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28"><Heading eyebrow="Terms and schedule" title="Simple terms. A defined weekly rhythm." accent="defined weekly rhythm"/><Reveal delay={.1}><div className="glass-card mt-12 overflow-hidden rounded-2xl">{terms.map(([label,value,note],index)=><div key={label} className={cn("grid gap-2 px-5 py-5 sm:grid-cols-[1fr_auto] sm:items-center sm:px-8",index<terms.length-1&&"border-b border-gold-600/10")}><div><p className="text-[10px] uppercase tracking-[.17em] text-ink-faint">{label}</p><p className="mt-1 text-sm text-ink-dim">{note}</p></div><p className="font-serif text-xl text-gold-400 sm:text-2xl">{value}</p></div>)}</div></Reveal><Reveal delay={.15}><div className="mt-6 flex gap-3 rounded-2xl border border-gold-500/25 bg-gold-600/6 p-5 sm:p-6"><ShieldAlert className="mt-0.5 size-5 shrink-0 text-gold-400" aria-hidden/><div><p className="font-serif text-lg text-gold-300">Risk is reduced, not erased.</p><p className="mt-2 text-sm leading-6 text-ink-dim">Automation and hedging cannot guarantee profit. Slippage, liquidity, basis changes, counterparty issues, operational failures and market events can cause losses. Performance objectives are not promises. Capital is at risk.</p></div></div></Reveal></section>; }

const faqs=[
  ["Are you selling a trading bot?","No. Chopra Capital is a managed trading operation. Automation is used internally for monitoring and execution; investors do not buy, install or configure software."],
  ["Is the return guaranteed?","No. The 1–3% monthly figure is an objective, not a guarantee. Some periods may be flat or negative, and invested capital can be lost."],
  ["How are my profits calculated?","Your invested balance is represented by pool units. Their value changes with NAV, while deposits, withdrawals and other cash movements are recorded separately."],
  ["How do you protect deposits and withdrawals?","KYC is required. Payments pass through method-specific verification, correction and approval stages before balances change or payouts are completed."],
  ["When can I withdraw?","Withdrawal requests are accepted on Sundays from 12:00 AM to 12:00 PM IST and are processed on Mondays after approval. There is no long-term lock-in."],
  ["What can I see in my account?","Your dashboard includes balance, queued funds, performance charts, transaction history, support tickets and security settings."],
];
function Faq(){const[open,setOpen]=useState<number|null>(0);return <section id="faq" className="border-t border-gold-600/10 bg-vault-900/40"><div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 sm:py-28"><Heading eyebrow="Common questions" title="Clear answers before you allocate." accent="before you allocate"/><div className="mt-10 space-y-3">{faqs.map(([q,a],index)=>{const active=open===index;return <Reveal key={q} delay={index*.035}><article className="glass-card overflow-hidden rounded-xl"><button type="button" onClick={()=>setOpen(active?null:index)} aria-expanded={active} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6"><span className="font-serif text-base text-ink sm:text-lg">{q}</span><ChevronDown className={cn("size-4 shrink-0 text-gold-500 transition-transform",active&&"rotate-180")} aria-hidden/></button><div className={cn("grid transition-all duration-300",active?"grid-rows-[1fr] opacity-100":"grid-rows-[0fr] opacity-0")}><div className="overflow-hidden"><p className="px-5 pb-5 text-sm leading-7 text-ink-dim sm:px-6">{a}</p></div></div></article></Reveal>})}</div></div></section>}

function FinalCta(){return <section className="relative overflow-hidden border-t border-gold-600/10"><div className="absolute inset-0 -z-10 gold-aura"/><div className="absolute inset-0 -z-10 grain"/><div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28"><Reveal><p className="eyebrow">Begin with clarity</p><h2 className="mt-4 font-serif text-4xl text-ink sm:text-6xl">A disciplined way to participate in <em className="gold-text italic">gold trading.</em></h2><p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-ink-dim sm:text-base">Open your account, complete verification and review the process before allocating capital. No software to install. No strategy to configure. Capital at risk.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/signup" className="btn-gold px-8 py-3 text-base">Open an account<ArrowRight className="size-4" aria-hidden/></Link><Link href="/legal/risk" className="btn-ghost px-8 py-3 text-base">Read risk disclosure</Link></div></Reveal></div></section>}

export function LandingSections(){return <><About/><Process/><OperatingSystem/><Visibility/><Backtesting/><Terms/><Faq/><FinalCta/></>}