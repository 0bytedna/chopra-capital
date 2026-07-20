"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  LifeBuoy,
  UserCog,
  ShieldCheck,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { signout } from "@/app/(auth)/actions";
import { cn } from "@/lib/cn";

type KycStatus = "NOT_SUBMITTED" | "PENDING" | "APPROVED" | "REJECTED";

export type ShellProps = {
  name: string;
  email: string;
  isAdmin: boolean;
  kycStatus: KycStatus;
  investedDisplay: string;
  queuedDisplay: string;
  children: React.ReactNode;
};

const groups = [
  {
    title: "Overview",
    items: [{ href: "/app", label: "Dashboard", Icon: LayoutDashboard }],
  },
  {
    title: "Money",
    items: [
      { href: "/app/deposit", label: "Deposit", Icon: ArrowDownToLine },
      { href: "/app/withdraw", label: "Withdraw", Icon: ArrowUpFromLine },
      { href: "/app/history", label: "History", Icon: History },
    ],
  },
  {
    title: "Support",
    items: [{ href: "/app/tickets", label: "Tickets", Icon: LifeBuoy }],
  },
  {
    title: "Account",
    items: [{ href: "/app/profile", label: "Profile & security", Icon: UserCog }],
  },
];

const kycBadge: Record<KycStatus, { label: string; cls: string }> = {
  NOT_SUBMITTED: { label: "KYC required", cls: "border-gold-500/40 bg-gold-600/10 text-gold-300" },
  PENDING: { label: "KYC in review", cls: "border-gold-500/40 bg-gold-600/10 text-gold-300" },
  APPROVED: { label: "KYC verified", cls: "border-positive/40 bg-positive/10 text-positive" },
  REJECTED: { label: "KYC rejected", cls: "border-negative/40 bg-negative/10 text-negative" },
};

function NavLinks({ pathname, isAdmin, onNavigate }: { pathname: string; isAdmin: boolean; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="App">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="eyebrow px-3">{group.title}</p>
          <ul className="mt-2 space-y-0.5">
            {group.items.map(({ href, label, Icon }) => {
              const active = href === "/app" ? pathname === "/app" : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                      active
                        ? "bg-gold-600/12 text-gold-300"
                        : "text-ink-dim hover:bg-ink/5 hover:text-ink",
                    )}
                  >
                    {active && (
                      <span
                        aria-hidden
                        className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-gold-500"
                      />
                    )}
                    <Icon className="size-4" aria-hidden />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {isAdmin && (
        <div>
          <p className="eyebrow px-3">Staff</p>
          <ul className="mt-2">
            <li>
              <Link
                href="/admin"
                onClick={onNavigate}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-dim transition-colors hover:bg-ink/5 hover:text-ink"
              >
                <ShieldCheck className="size-4" aria-hidden />
                Admin console
              </Link>
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
}

function SidebarFooter({ name, email }: { name: string; email: string }) {
  return (
    <div className="border-t border-gold-600/10 p-4">
      <p className="truncate text-sm text-ink">{name}</p>
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
}

export function AppShell({ name, email, isAdmin, kycStatus, investedDisplay, queuedDisplay, children }: ShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const badge = kycBadge[kycStatus];

  const brand = (
    <Link href="/app" className="flex items-center gap-2.5 px-5 py-5">
      <span
        aria-hidden
        className="flex size-8 items-center justify-center rounded-full border border-gold-500/40 bg-gold-600/10 font-serif text-[13px] font-semibold text-gold-400"
      >
        CC
      </span>
      <span className="font-serif text-base tracking-tight text-ink">
        Chopra <span className="italic text-gold-400">Capital</span>
      </span>
    </Link>
  );

  return (
    <div className="flex min-h-svh">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r border-gold-600/10 bg-vault-900/60 lg:flex">
        {brand}
        <hr className="hairline" />
        <NavLinks pathname={pathname} isAdmin={isAdmin} />
        <SidebarFooter name={name} email={email} />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-gold-600/15 bg-vault-900">
            <div className="flex items-center justify-between pr-3">
              {brand}
              <button
                type="button"
                aria-label="Close menu"
                className="rounded-md p-2 text-ink-dim hover:text-ink"
                onClick={() => setOpen(false)}
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <hr className="hairline" />
            <NavLinks pathname={pathname} isAdmin={isAdmin} onNavigate={() => setOpen(false)} />
            <SidebarFooter name={name} email={email} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Glass topbar */}
        <header className="sticky top-0 z-40 border-b border-gold-600/10 bg-vault-950/80 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              className="-ml-1 rounded-md p-2 text-ink-dim hover:text-ink lg:hidden"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
            >
              <Menu className="size-5" aria-hidden />
            </button>

            <div className="flex min-w-0 items-center gap-4 sm:gap-6">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.16em] text-ink-faint">In the pool</p>
                <p className="truncate font-mono text-sm text-ink">{investedDisplay}</p>
              </div>
              <div className="hidden min-w-0 sm:block">
                <p className="text-[10px] uppercase tracking-[0.16em] text-ink-faint">Queued</p>
                <p className="truncate font-mono text-sm text-ink">{queuedDisplay}</p>
              </div>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <Link
                href="/app/profile"
                className={cn("rounded-full border px-3 py-1 text-[11px] font-medium", badge.cls)}
              >
                {badge.label}
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
