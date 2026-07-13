"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/cn";

const links = [
  { href: "/#strategy", label: "Strategy" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#terms", label: "Terms" },
  { href: "/#faq", label: "FAQ" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled || open
          ? "border-b border-gold-600/15 bg-vault-950/85 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6" aria-label="Main">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span
            aria-hidden
            className="flex size-8 items-center justify-center rounded-full border border-gold-500/40 bg-gold-600/10 font-serif text-[13px] font-semibold tracking-tight text-gold-400"
          >
            CC
          </span>
          <span className="font-serif text-lg tracking-tight text-ink">
            Chopra <span className="italic text-gold-400">Capital</span>
          </span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm text-ink-dim transition-colors hover:text-ink">
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/signin" className="text-sm text-ink-dim transition-colors hover:text-ink">
            Sign in
          </Link>
          <Link href="/signup" className="btn-gold px-5 py-2 text-sm">
            Open account
          </Link>
        </div>

        <button
          type="button"
          className="md:hidden -mr-1 rounded-md p-2 text-ink-dim hover:text-ink"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-gold-600/10 px-4 pb-5 pt-3 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-md px-2 py-2.5 text-sm text-ink-dim hover:bg-gold-600/8 hover:text-ink"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
          </div>
          <hr className="hairline my-3" />
          <div className="flex items-center gap-3">
            <Link href="/signin" className="btn-ghost flex-1 px-4 py-2.5 text-sm" onClick={() => setOpen(false)}>
              Sign in
            </Link>
            <Link href="/signup" className="btn-gold flex-1 px-4 py-2.5 text-sm" onClick={() => setOpen(false)}>
              Open account
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
