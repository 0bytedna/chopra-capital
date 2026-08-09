"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BellRing, X } from "lucide-react";

export function AccountActivityPanel({
  unreadCount,
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
      className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-3 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
          <BellRing className="size-5" aria-hidden />
        </span>
        <Link
          href="/app/notifications"
          aria-label={`Review ${updateLabel}`}
          className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 sm:flex-none"
        >
          Review updates
          <ArrowRight className="size-4" aria-hidden />
        </Link>
        <button
          type="button"
          aria-label="Dismiss account activity update"
          onClick={() => setVisible(false)}
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-blue-300 bg-white text-blue-700 transition-colors hover:border-blue-500 hover:bg-blue-50"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </section>
  );
}