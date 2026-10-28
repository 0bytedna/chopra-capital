"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BellRing, X } from "lucide-react";

export function AccountActivityPanel({
  unreadCount,
  items,
}: {
  unreadCount: number;
  items: Array<{ id: string; title: string }>;
}) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const updateLabel = `${unreadCount} unread account update${unreadCount === 1 ? "" : "s"}`;

  return (
    <section
      aria-label={updateLabel}
      className="rounded-2xl border-2 border-gold-200 bg-gold-50 p-3 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-600 text-white shadow-sm">
          <BellRing className="size-5" aria-hidden />
        </span>
        <div className="hidden min-w-0 flex-1 sm:block">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gold-700">
            {updateLabel}
          </p>
          <p className="mt-0.5 truncate text-sm font-medium text-ink">
            {items[0]?.title ?? "New account activity is available"}
          </p>
        </div>
        <Link
          href="/app/notifications"
          aria-label={`Review ${updateLabel}`}
          className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-gold-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gold-700 sm:flex-none"
        >
          Review updates
          <ArrowRight className="size-4" aria-hidden />
        </Link>
        <button
          type="button"
          aria-label="Dismiss account activity update"
          onClick={() => setVisible(false)}
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-gold-300 bg-white text-gold-700 transition-colors hover:border-gold-500 hover:bg-gold-50"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </section>
  );
}
