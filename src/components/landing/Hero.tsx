"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ShieldCheck, Scale, Activity } from "lucide-react";
import Link from "next/link";
import { Counter } from "@/components/ui/Counter";

const trust = [
  { Icon: Scale, label: "Hedge ratio 1:1" },
  { Icon: ShieldCheck, label: "Market-neutral" },
  { Icon: Activity, label: "Audited performance" },
];

const stats = [
  { value: 1, suffix: "–4%", label: "Monthly objective*", decimals: 0 },
  { value: 2000, prefix: "$", label: "Minimum allocation", decimals: 0 },
  { value: 24, suffix: "/7", label: "Bot & human monitoring", decimals: 0 },
  { value: 0, suffix: " days", label: "Lock-in period", decimals: 0 },
];

const marquee = [
  "Spot XAU hedged 1:1 with gold futures",
  "AI-powered execution",
  "Human oversight 24/7",
  "Weekly withdrawals",
  "Audited account reporting",
  "Dubai based",
];

export function Hero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative isolate flex min-h-svh flex-col justify-end overflow-hidden pt-16">
      {/* Layered backdrop: aura, grid, grain, orbs */}
      <div className="absolute inset-0 -z-10 gold-aura" aria-hidden />
      <div className="absolute inset-0 -z-10 grid-overlay" aria-hidden />
      <div className="absolute inset-0 -z-10 grain" aria-hidden />
      <div
        aria-hidden
        className="animate-float-slow absolute -top-24 right-[8%] -z-10 size-72 rounded-full bg-gold-600/14 blur-3xl"
      />
      <div
        aria-hidden
        className="animate-float-slower absolute top-1/3 left-[-6%] -z-10 size-96 rounded-full bg-gold-500/8 blur-3xl"
      />
      <div
        aria-hidden
        className="animate-float-slow absolute bottom-24 right-[22%] -z-10 size-44 rounded-full bg-gold-300/7 blur-2xl"
      />

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.21, 0.65, 0.32, 0.97] }}
          className="max-w-3xl pt-20 sm:pt-28"
        >
          <p className="eyebrow">Dubai · Specialist Gold Strategy</p>
          <h1 className="mt-5 font-serif text-[2.6rem] leading-[1.05] tracking-tight text-ink sm:text-6xl md:text-7xl">
            Gold, traded with
            <br />
            <em className="gold-text italic">discipline</em> — not hope.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-dim sm:text-lg">
            We trade one market only: gold. Spot XAU positions hedged one-for-one with gold
            futures, executed by AI-powered bots and supervised by human specialists around the
            clock — with account performance reported through audited balance and equity updates.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/signup" className="btn-gold px-8 py-3 text-base">
              Open an account
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link href="/#how-it-works" className="btn-ghost px-8 py-3 text-base">
              See how it works
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2.5">
            {trust.map(({ Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-2 text-sm text-ink-faint">
                <Icon className="size-4 text-gold-500" aria-hidden />
                {label}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Stat strip */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.25, ease: [0.21, 0.65, 0.32, 0.97] }}
          className="glass-card mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-2xl md:grid-cols-4"
        >
          {stats.map((s) => (
            <div key={s.label} className="px-5 py-6 text-center sm:px-6 sm:py-7">
              <p className="font-serif text-3xl text-gold-400 sm:text-4xl">
                <Counter value={s.value} prefix={s.prefix} suffix={s.suffix} decimals={s.decimals} />
              </p>
              <p className="mt-1.5 text-xs uppercase tracking-[0.14em] text-ink-faint">{s.label}</p>
            </div>
          ))}
        </motion.div>
        <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
          *A performance objective, not a promise. Returns are not guaranteed and capital is at
          risk.
        </p>
      </div>

      {/* Marquee strip */}
      <div className="mt-12 overflow-hidden border-y border-gold-600/12 bg-vault-900/50 py-3" aria-hidden>
        <div className="animate-marquee flex w-max gap-10 whitespace-nowrap">
          {[...marquee, ...marquee].map((item, i) => (
            <span key={i} className="inline-flex items-center gap-10 text-xs uppercase tracking-[0.2em] text-ink-faint">
              {item}
              <span className="text-gold-600">◆</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
