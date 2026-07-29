"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Sparkles,
} from "lucide-react";

const trustPoints = ["Automated gold trading", "Human oversight", "Clear account reporting"];

export function Hero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative isolate overflow-hidden pb-12 pt-28 sm:pb-16 sm:pt-36">
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
            Automated gold trading with human oversight
          </div>
          <h1 className="mt-7 text-balance font-serif text-[3.15rem] leading-[0.98] tracking-[-0.045em] text-ink sm:text-6xl lg:text-[5.25rem]">
            Intelligent execution.
            <span className="gold-text block italic">Human accountability.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-7 text-ink-dim sm:text-lg">
            Chopra Capital gives investors a simple way to participate in automated gold trading. Open an account, add funds, follow performance, and request withdrawals from one clear dashboard.
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

      </div>
    </section>
  );
}