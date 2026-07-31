"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BellRing, Info, X } from "lucide-react";

export function AccountActivityPanel({
  unreadCount,
  items,
}: {
  unreadCount: number;
  items: Array<{ id: string; title: string }>;
}) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <section
      aria-labelledby="account-activity-title"
      className="overflow-hidden rounded-2xl border-2 border-blue-200 bg-blue-50 shadow-sm"
    >
      <div className="flex flex-col gap-4 border-b border-blue-200 bg-blue-100/70 px-5 py-4 sm:flex-row sm:items-center">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
          <BellRing className="size-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-blue-700">
            New account activity
          </p>
          <h2
            id="account-activity-title"
            className="mt-0.5 font-serif text-xl text-blue-950"
          >
            {unreadCount} new update{unreadCount === 1 ? "" : "s"}
          </h2>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Link
            href="/app/notifications"
            className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
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
      </div>

      <div className="divide-y divide-blue-200 px-5">
        {items.map((item) => (
          <Link
            key={item.id}
            href="/app/notifications"
            className="group flex items-center gap-3 py-3.5 text-sm"
          >
            <Info className="size-4 shrink-0 text-blue-700" aria-hidden />
            <span className="min-w-0 flex-1 font-medium text-blue-950">
              {item.title}
            </span>
            <ArrowRight
              className="size-4 shrink-0 text-blue-700 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        ))}
      </div>
    </section>
  );
}