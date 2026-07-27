"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Check,
  CircleDollarSign,
  Clock3,
  Eye,
  LineChart,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const trustPoints = ["Hedged gold exposure", "Rules-based execution", "Human supervision"];

export function Hero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative isolate overflow-hidden pb-16 pt-28 sm:pb-24 sm:pt-36">
      <div className="absolute inset-0 -z-20 landing-mesh" aria-hidden />
      <div className="absolute inset-0 -z-10 landing-grid" aria-hidden />
      <div className="absolute inset-0 -z-10 grain" aria-hidden />
      <div className="absolute left-1/2 top-0 -z-10 h-[36rem] w-[72rem] -translate-x-1/2 rounded-full bg-gold-500/8 blur-[120px]" aria-hidden />

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="mx-auto max-w-4xl text-center"
        >
          <div className="section-chip mx-auto w-fit">
            <Sparkles className="size-3.5" aria-hidden />
            Dubai-based managed gold strategy
          </div>
          <h1 className="mt-7 text-balance font-serif text-[3.15rem] leading-[0.98] tracking-[-0.045em] text-ink sm:text-6xl lg:text-[5.25rem]">
            Intelligent execution.
            <span className="gold-text block italic">Human accountability.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-7 text-ink-dim sm:text-lg">
            Chopra Capital manages pooled investor capital through a focused gold trading operation. Automation handles speed, consistency and monitoring; experienced people remain responsible for risk, capital movement and every investor account.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="btn-gold min-h-12 px-7 text-base">
              Open an account <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link href="/#how-it-works" className="btn-ghost min-h-12 px-7 text-base">
              Understand the process
            </Link>
          </div>
          <div className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2">
            {trustPoints.map((point) => (
              <span key={point} className="inline-flex items-center gap-2 text-xs text-ink-faint sm:text-sm">
                <Check className="size-3.5 text-positive" aria-hidden />
                {point}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.85, delay: 0.15 }}
          className="relative mx-auto mt-14 max-w-6xl sm:mt-18"
        >
          <div className="absolute -inset-10 -z-10 rounded-[3rem] bg-gold-500/8 blur-3xl" aria-hidden />
          <div className="product-window overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3.5 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5" aria-hidden>
                  <span className="size-2 rounded-full bg-ink-faint/50" />
                  <span className="size-2 rounded-full bg-ink-faint/30" />
                  <span className="size-2 rounded-full bg-ink-faint/20" />
                </div>
                <span className="hidden text-xs text-ink-faint sm:inline">Chopra Capital · Operating overview</span>
              </div>
              <span className="status-pill"><span className="status-dot" /> Monitored</span>
            </div>

            <div className="grid lg:grid-cols-[1.1fr_.9fr]">
              <div className="border-b border-slate-200/80 p-5 sm:p-7 lg:border-b-0 lg:border-r">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="eyebrow">Operating model</p>
                    <h2 className="mt-2 font-serif text-2xl text-ink sm:text-3xl">Technology beneath a managed fund</h2>
                  </div>
                  <LineChart className="hidden size-6 text-gold-400 sm:block" aria-hidden />
                </div>
                <div className="mt-7 grid gap-3 sm:grid-cols-3">
                  {[
                    ["Gold", "Single focus", CircleDollarSign],
                    ["1:1", "Hedge discipline", ShieldCheck],
                    ["Weekly", "Liquidity cycle", Clock3],
                  ].map(([value, label, Icon]) => {
                    const ItemIcon = Icon as typeof CircleDollarSign;
                    return (
                      <div key={String(label)} className="metric-tile">
                        <ItemIcon className="size-4 text-gold-400" aria-hidden />
                        <p className="mt-5 font-serif text-2xl text-ink">{String(value)}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-ink-faint">{String(label)}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 sm:p-5">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-ink-faint">
                    <span>Managed gold operation</span>
                    <span>Operating view</span>
                  </div>
                  <div className="mt-5 flex h-24 items-end gap-1.5" aria-hidden>
                    {[30, 37, 34, 48, 45, 58, 54, 67, 63, 76, 72, 86, 82, 94].map((height, index) => (
                      <span key={index} className="flex-1 rounded-t bg-gradient-to-t from-gold-700/25 to-gold-300/85" style={{ height: `${height}%` }} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-7">
                <p className="eyebrow">Operating model</p>
                <div className="mt-5 space-y-3">
                  {[
                    [Eye, "Market monitoring", "Systems watch gold markets continuously during trading hours."],
                    [Bot, "Automated execution", "Rules place and manage hedged positions without emotion or delay."],
                    [ShieldCheck, "Human control", "Operators supervise risk, exceptions, deposits and withdrawals."],
                  ].map(([Icon, title, copy], index) => {
                    const ItemIcon = Icon as typeof Eye;
                    return (
                      <div key={String(title)} className="group flex gap-4 rounded-2xl border border-slate-200/80 bg-white/80 p-4 transition hover:border-gold-500/25 hover:bg-gold-500/[0.04]">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-gold-500/20 bg-gold-500/8">
                          <ItemIcon className="size-4 text-gold-400" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2"><span className="font-mono text-xs text-gold-600">0{index + 1}</span><p className="text-sm font-medium text-ink">{String(title)}</p></div>
                          <p className="mt-1 text-xs leading-5 text-ink-faint">{String(copy)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-5 text-xs leading-5 text-ink-faint">Performance objectives are not guarantees. Trading involves risk and capital can be lost.</p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="mx-auto mt-8 grid max-w-6xl grid-cols-2 divide-x divide-y divide-slate-200/80 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 sm:grid-cols-4 sm:divide-y-0">
          {[
            ["Gold", "Specialist focus"],
            ["1:1", "Hedge discipline"],
            ["No lock-in", "Flexible structure"],
            ["Monday", "Processing day"],
          ].map(([value, label]) => (
            <div key={label} className="px-4 py-5 text-center">
              <p className="font-serif text-xl text-gold-300">{value}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-faint">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}