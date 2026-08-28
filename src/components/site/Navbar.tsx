"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { cn } from "@/lib/cn";

const links = [
  { href: "/#backtesting", label: "Live history" },
  { href: "/#strategy", label: "Our approach" },
  { href: "/#getting-started", label: "Five steps" },
  { href: "/#things-that-matter", label: "What matters" },
  { href: "/#faq", label: "FAQ" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5">
      <nav
        className={cn(
          "mx-auto flex h-16 max-w-7xl items-center justify-between rounded-2xl border px-3 transition-all duration-300 sm:px-4",
          scrolled || open
            ? "border-stone-200 bg-vault-950/88 shadow-2xl shadow-black/25 backdrop-blur-xl"
            : "border-stone-200/80 bg-vault-950/55 backdrop-blur-md",
        )}
        aria-label="Main"
      >
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-xl px-1"
          onClick={() => setOpen(false)}
        >
          <BrandMark priority />
          <span className="font-serif text-lg tracking-tight text-ink">
            Chopra <span className="italic text-gold-400">Capital</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 rounded-xl border border-stone-200/80 bg-white/80 p-1 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-xs text-ink-dim transition-colors hover:bg-stone-100 hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/signin"
            className="rounded-xl px-4 py-2 text-sm text-ink-dim transition hover:bg-stone-100 hover:text-ink"
          >
            Sign in
          </Link>
          <Link href="/signup" className="btn-gold px-5 py-2.5 text-sm">
            Open account
          </Link>
        </div>

        <button
          type="button"
          className="rounded-xl p-2.5 text-ink-dim transition hover:bg-stone-100 hover:text-ink md:hidden"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        </button>
      </nav>

      {open && (
        <div className="mx-auto mt-2 max-w-7xl overflow-hidden rounded-2xl border border-stone-200 bg-vault-950/95 p-3 shadow-2xl backdrop-blur-xl md:hidden">
          <div className="grid gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl px-3 py-3 text-sm text-ink-dim transition hover:bg-stone-100 hover:text-ink"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-stone-200/80 pt-3">
            <Link
              href="/signin"
              className="btn-ghost px-4 py-2.5 text-sm"
              onClick={() => setOpen(false)}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="btn-gold px-4 py-2.5 text-sm"
              onClick={() => setOpen(false)}
            >
              Open account
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
