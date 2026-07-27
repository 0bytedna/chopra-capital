"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Bot, Eye, Scale, ShieldCheck } from "lucide-react";

const principles = [
  { Icon: Scale, label: "Hedged gold exposure" },
  { Icon: Bot, label: "Rules-based execution" },
  { Icon: Eye, label: "Human supervision" },
];

export function Hero() {
  const reduceMotion = useReducedMotion();
  return (
    <section className="relative isolate min-h-svh overflow-hidden pt-16">
      <div className="absolute inset-0 -z-10 gold-aura" aria-hidden />
      <div className="absolute inset-0 -z-10 grid-overlay" aria-hidden />
      <div className="absolute inset-0 -z-10 grain" aria-hidden />
      <div className="absolute right-[-8rem] top-24 -z-10 size-[30rem] rounded-full bg-gold-600/10 blur-3xl" aria-hidden />

      <div className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-6xl items-center gap-14 px-4 py-20 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:py-24">
        <motion.div initial={reduceMotion ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .8 }}>
          <div className="inline-flex items-center gap-2 rounded-full border border-gold-600/20 bg-gold-600/7 px-3 py-1.5 text-xs text-gold-300">
            <ShieldCheck className="size-3.5" aria-hidden />
            Dubai-based managed gold strategy
          </div>
          <h1 className="mt-6 font-serif text-[2.75rem] leading-[1.02] tracking-tight text-ink sm:text-6xl lg:text-[4.4rem]">
            Intelligent execution.
            <br />
            <em className="gold-text italic">Human accountability.</em>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-ink-dim sm:text-lg">
            Chopra Capital manages pooled investor capital through a focused gold trading operation. Automation handles speed, consistency and monitoring; experienced people remain responsible for risk, capital movement and every investor account.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className="btn-gold px-7 py-3 text-base">Open an account<ArrowRight className="size-4" aria-hidden /></Link>
            <Link href="/#how-it-works" className="btn-ghost px-7 py-3 text-base">Understand the process</Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
            {principles.map(({ Icon, label }) => <span key={label} className="inline-flex items-center gap-2 text-sm text-ink-faint"><Icon className="size-4 text-gold-500" aria-hidden />{label}</span>)}
          </div>
        </motion.div>

        <motion.div initial={reduceMotion ? false : { opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .9, delay: .15 }} className="relative mx-auto w-full max-w-lg">
          <div className="absolute -inset-8 -z-10 rounded-full bg-gold-500/7 blur-3xl" aria-hidden />
          <div className="glass-card overflow-hidden rounded-3xl">
            <div className="flex items-center justify-between border-b border-gold-600/15 px-5 py-4">
              <div><p className="eyebrow">Operating model</p><p className="mt-1 text-sm text-ink">Technology beneath a managed fund</p></div>
              <span className="inline-flex items-center gap-2 rounded-full border border-positive/20 bg-positive/8 px-2.5 py-1 text-[11px] text-positive"><span className="size-1.5 rounded-full bg-positive" />Monitored</span>
            </div>
            <div className="space-y-3 p-5 sm:p-6">
              {[
                { n: "01", title: "Market monitoring", body: "Systems watch gold markets continuously during trading hours.", Icon: Eye },
                { n: "02", title: "Automated execution", body: "Rules place and manage hedged positions without emotion or delay.", Icon: Bot },
                { n: "03", title: "Human control", body: "Operators supervise risk, exceptions, deposits and withdrawals.", Icon: ShieldCheck },
              ].map((item) => <div key={item.n} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-2xl border border-gold-600/12 bg-black/15 p-4"><span className="font-mono text-[10px] text-gold-600">{item.n}</span><div><p className="text-sm font-medium text-ink">{item.title}</p><p className="mt-1 text-xs leading-5 text-ink-faint">{item.body}</p></div><item.Icon className="size-5 text-gold-500" aria-hidden /></div>)}
            </div>
            <div className="grid grid-cols-3 border-t border-gold-600/15 bg-black/15 text-center">
              {[['Gold','Single focus'],['1:1','Hedge discipline'],['Weekly','Liquidity cycle']].map(([value,label]) => <div key={label} className="border-r border-gold-600/10 px-2 py-4 last:border-0"><p className="font-serif text-xl text-gold-400">{value}</p><p className="mt-1 text-[9px] uppercase tracking-[.13em] text-ink-faint">{label}</p></div>)}
            </div>
          </div>
        </motion.div>
      </div>

      <div className="border-y border-gold-600/12 bg-vault-900/55 py-3">
        <div className="animate-marquee flex w-max gap-10 whitespace-nowrap" aria-hidden>
          {[...Array(2)].flatMap(() => ["Gold-focused operation", "Automated execution", "Human oversight", "Verified capital movements", "Investor-level accounting", "No lock-in period"]).map((item,index) => <span key={`${item}-${index}`} className="inline-flex items-center gap-10 text-[10px] uppercase tracking-[.2em] text-ink-faint">{item}<span className="text-gold-600">◆</span></span>)}
        </div>
      </div>
    </section>
  );
}