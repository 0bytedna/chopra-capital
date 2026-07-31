"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gauge,
  ArrowDownToLine,
  ArrowUpFromLine,
  BadgeCheck,
  LifeBuoy,
  Users,
  LogOut,
  Menu,
  X,
  ArrowLeftRight,
  ShieldCheck,
  Activity,
} from "lucide-react";
import { signout } from "@/app/(auth)/actions";
import { BrandMark } from "@/components/brand/BrandMark";
import { cn } from "@/lib/cn";

const items = [
  { href: "/admin", label: "Overview", Icon: Gauge },
  { href: "/admin/trading", label: "Trading", Icon: Activity },
  { href: "/admin/deposits", label: "Deposits", Icon: ArrowDownToLine },
  { href: "/admin/withdrawals", label: "Withdrawals", Icon: ArrowUpFromLine },
  { href: "/admin/kyc", label: "KYC review", Icon: BadgeCheck },
  { href: "/admin/tickets", label: "Tickets", Icon: LifeBuoy },
  { href: "/admin/investors", label: "Investors", Icon: Users },
  { href: "/admin/internal-transfers", label: "Internal transfers", Icon: ArrowLeftRight },
  { href: "/admin/security", label: "Security", Icon: ShieldCheck },
];

function Nav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-5" aria-label="Admin">
      <p className="eyebrow px-3 pb-2">Console</p>
      {items.map(({ href, label, Icon }) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
              active ? "bg-gold-600/12 text-gold-300" : "text-ink-dim hover:bg-ink/5 hover:text-ink",
            )}
          >
            {active && (
              <span aria-hidden className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-gold-500" />
            )}
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({ email, children }: { email: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const brand = (
    <Link href="/admin" className="flex items-center gap-2.5 px-5 py-5">
      <BrandMark className="size-8" />
      <span className="font-serif text-base tracking-tight text-ink">
        Admin <span className="italic text-gold-400">console</span>
      </span>
    </Link>
  );

  const footer = (
    <div className="border-t border-gold-600/10 p-4">
      <p className="truncate text-xs text-ink-faint">{email}</p>
      <form action={signout} className="mt-3">
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-gold-600/20 px-3 py-2 text-xs font-medium text-ink-dim transition-colors hover:border-gold-500/40 hover:text-ink"
        >
          <LogOut className="size-3.5" aria-hidden />
          Sign out
        </button>
      </form>
    </div>
  );

  return (
    <div className="flex min-h-svh gap-3 bg-transparent lg:p-3">
      <aside className="product-window sticky top-3 hidden h-[calc(100svh-1.5rem)] w-64 shrink-0 flex-col overflow-hidden rounded-2xl lg:flex">
        {brand}
        <hr className="hairline" />
        <Nav pathname={pathname} />
        {footer}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="product-window absolute inset-y-2 left-2 flex w-72 max-w-[85vw] flex-col overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between pr-3">
              {brand}
              <button type="button" aria-label="Close menu" className="rounded-md p-2 text-ink-dim hover:text-ink" onClick={() => setOpen(false)}>
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <hr className="hairline" />
            <Nav pathname={pathname} onNavigate={() => setOpen(false)} />
            {footer}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:gap-3">
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-vault-950/88 backdrop-blur-xl lg:top-3 lg:rounded-2xl lg:border lg:border-slate-200/80 lg:shadow-lg lg:shadow-black/20">
          <div className="flex h-16 min-w-0 items-center gap-2 px-3 sm:gap-3 sm:px-6">
            <button
              type="button"
              className="-ml-1 rounded-md p-2 text-ink-dim hover:text-ink lg:hidden"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
            >
              <Menu className="size-5" aria-hidden />
            </button>
            <div className="flex items-center gap-2">
              <BrandMark className="size-7" />
              <p className="eyebrow">Chopra Capital · Staff</p>
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:rounded-2xl lg:border lg:border-slate-200/80 lg:bg-vault-900/20">{children}</main>
      </div>
    </div>
  );
}
