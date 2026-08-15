"use client";

import { motion, useReducedMotion } from "framer-motion";

const highlights = [
  { value: "1–3%", label: "Monthly Profit*" },
  { value: "No lock-in", label: "Period" },
  { value: "Weekly", label: "Withdrawals" },
];

export function Hero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative isolate overflow-hidden pb-10 pt-28 sm:pb-14 sm:pt-36">
      <div className="absolute inset-0 -z-20 landing-mesh" aria-hidden />
      <div className="absolute inset-0 -z-10 landing-grid" aria-hidden />
      <div className="absolute inset-0 -z-10 grain" aria-hidden />

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="mx-auto max-w-5xl text-center"
        >
          <h1 className="text-balance text-[3.2rem] font-extrabold leading-[0.98] tracking-[-0.055em] text-ink sm:text-7xl lg:text-[6rem]">
            We don’t predict gold
            <span className="gold-text block">We arbitrage it</span>
          </h1>

          <div className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-3 sm:gap-4">
            {highlights.map((highlight) => (
              <article
                key={highlight.label}
                className="rounded-2xl border border-blue-200 bg-white/90 px-5 py-5 shadow-sm backdrop-blur sm:py-6"
              >
                <p className="text-3xl font-extrabold tracking-[-0.035em] text-blue-700 sm:text-4xl">
                  {highlight.value}
                </p>
                <p className="mt-1 text-sm font-semibold uppercase tracking-[0.13em] text-ink-dim">
                  {highlight.label}
                </p>
              </article>
            ))}
          </div>

          <p className="mt-4 text-xs leading-5 text-ink-faint sm:text-sm">
            *Performance objective, not a guarantee. Capital is at risk.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
