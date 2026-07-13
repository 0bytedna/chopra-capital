"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

const tutorials = [
  {
    exchange: "Binance",
    steps: [
      "Create a Binance account and complete its identity verification.",
      "Buy USDT — easiest is “Buy Crypto” with a card, or deposit local currency and trade for USDT.",
      "Go to Wallet → Withdraw, choose USDT, and paste the Chopra Capital deposit address shown above.",
      "Pick the SAME network you selected here (TRC20 has the lowest fees on Binance).",
      "Confirm the withdrawal, then paste the transaction hash into the form below.",
    ],
  },
  {
    exchange: "Bybit",
    steps: [
      "Register on Bybit and pass identity verification.",
      "Buy USDT via “Buy Crypto” (card / P2P) or deposit and convert.",
      "Open Assets → Withdraw, select USDT, paste the deposit address from above.",
      "Choose the same network you picked here, double-check the first and last characters of the address.",
      "Submit, approve the confirmation email/2FA, and copy the transaction hash into the form.",
    ],
  },
  {
    exchange: "OKX",
    steps: [
      "Create an OKX account and verify your identity.",
      "Buy USDT with the “Buy Crypto” express option, or deposit funds and trade into USDT.",
      "Go to Assets → Withdrawal, choose USDT and “On-chain” withdrawal.",
      "Paste the deposit address and select the matching network (TRC20 / ERC20 / BEP20).",
      "Confirm, then paste the resulting transaction hash into the form below.",
    ],
  },
];

export function ExchangeTutorials() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="space-y-2.5">
      {tutorials.map((t, i) => {
        const isOpen = open === i;
        return (
          <div key={t.exchange} className="glass-card overflow-hidden rounded-xl">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left sm:px-5"
            >
              <span className="text-sm text-ink">
                How to buy USDT on <strong className="font-serif text-base">{t.exchange}</strong>
              </span>
              <ChevronDown
                className={cn("size-4 shrink-0 text-gold-500 transition-transform duration-300", isOpen && "rotate-180")}
                aria-hidden
              />
            </button>
            <div className={cn("grid transition-all duration-300", isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
              <div className="overflow-hidden">
                <ol className="space-y-2 px-4 pb-4 sm:px-5">
                  {t.steps.map((step, n) => (
                    <li key={n} className="flex gap-3 text-sm leading-relaxed text-ink-dim">
                      <span className="font-serif text-gold-500">{n + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
