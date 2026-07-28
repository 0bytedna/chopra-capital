import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CircleCheck,
  Info,
  ShieldCheck,
} from "lucide-react";
import type {
  UserNotification,
  UserNotificationCenter,
  UserNotificationKind,
} from "@/lib/userNotifications";

const notificationStyle: Record<
  UserNotificationKind,
  { icon: typeof AlertTriangle; iconClass: string; surfaceClass: string }
> = {
  ACTION: {
    icon: AlertTriangle,
    iconClass: "bg-amber-100 text-amber-700",
    surfaceClass: "border-amber-200 bg-amber-50/70",
  },
  UPDATE: {
    icon: Info,
    iconClass: "bg-blue-100 text-blue-700",
    surfaceClass: "border-blue-200 bg-blue-50/70",
  },
  RECOMMENDATION: {
    icon: ShieldCheck,
    iconClass: "bg-slate-100 text-slate-700",
    surfaceClass: "border-slate-200 bg-white",
  },
};

export function NotificationList({ items }: { items: UserNotification[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const style = notificationStyle[item.kind];
        const Icon = style.icon;

        return (
          <article
            key={item.id}
            className={`flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center ${style.surfaceClass}`}
          >
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span
                className={`flex size-10 shrink-0 items-center justify-center rounded-full ${style.iconClass}`}
              >
                <Icon className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="font-semibold text-ink">{item.title}</h3>
                <p className="mt-1 text-sm leading-6 text-ink-dim">{item.message}</p>
              </div>
            </div>
            <Link
              href={item.href}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition-colors hover:border-blue-500 hover:bg-blue-50"
            >
              {item.actionLabel}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </article>
        );
      })}
    </div>
  );
}

export function AttentionPanel({ center }: { center: UserNotificationCenter }) {
  if (center.attentionCount === 0) return null;

  const visibleItems = center.actionItems.slice(0, 3);
  const remaining = Math.max(0, center.actionItems.length - visibleItems.length);

  return (
    <section
      aria-labelledby="attention-panel-title"
      className="overflow-hidden rounded-2xl border-2 border-amber-300 bg-amber-50 shadow-lg shadow-amber-900/5"
    >
      <div className="flex flex-col gap-4 border-b border-amber-200 bg-amber-100/70 px-5 py-4 sm:flex-row sm:items-center">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white shadow-sm">
          <BellRing className="size-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-amber-800">
            Action required
          </p>
          <h2 id="attention-panel-title" className="mt-0.5 font-serif text-xl text-amber-950">
            {center.attentionCount} item{center.attentionCount === 1 ? "" : "s"} need your attention
          </h2>
        </div>
        <Link
          href="/app/notifications"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          Open notification center
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      <div className="divide-y divide-amber-200 px-5">
        {visibleItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="group flex items-center gap-3 py-3.5 text-sm"
          >
            <AlertTriangle className="size-4 shrink-0 text-amber-700" aria-hidden />
            <span className="min-w-0 flex-1 font-medium text-amber-950">{item.title}</span>
            <ArrowRight
              className="size-4 shrink-0 text-amber-700 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        ))}
        {remaining > 0 && (
          <p className="py-3.5 text-sm font-medium text-amber-900">
            Plus {remaining} more notification{remaining === 1 ? "" : "s"}.
          </p>
        )}
      </div>
    </section>
  );
}

export function AllCaughtUp() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <CircleCheck className="size-5" aria-hidden />
      </span>
      <div>
        <h2 className="font-semibold text-emerald-950">You&apos;re all caught up</h2>
        <p className="mt-1 text-sm leading-6 text-emerald-900">
          There are no account issues that require your attention.
        </p>
      </div>
    </div>
  );
}
