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
  UserJourneyStep,
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

const journeyStyle = {
  COMPLETE: {
    card: "border-emerald-200 bg-emerald-50/70",
    number: "bg-emerald-600 text-white",
    badge: "bg-emerald-100 text-emerald-800",
    label: "Complete",
  },
  CURRENT: {
    card: "border-blue-300 bg-blue-50/80 shadow-sm",
    number: "bg-blue-600 text-white",
    badge: "bg-blue-100 text-blue-800",
    label: "Next step",
  },
  UPCOMING: {
    card: "border-slate-200 bg-slate-50",
    number: "bg-slate-200 text-slate-700",
    badge: "bg-slate-200 text-slate-700",
    label: "Coming up",
  },
} as const;

export function AccountJourney({ steps }: { steps: UserJourneyStep[] }) {
  return (
    <ol className="grid snap-x auto-cols-[minmax(15rem,78vw)] grid-flow-col gap-3 overflow-x-auto pb-2 sm:auto-cols-[18rem] lg:grid-flow-row lg:grid-cols-3 lg:overflow-visible lg:pb-0">
      {steps.map((step, index) => {
        const style = journeyStyle[step.state];

        return (
          <li key={step.id} className={`flex h-full snap-start flex-col rounded-xl border p-4 ${style.card}`}>
            <div className="flex items-center justify-between gap-3">
              <span className={`flex size-8 items-center justify-center rounded-full text-sm font-bold ${style.number}`}>
                {step.state === "COMPLETE" ? (
                  <CircleCheck className="size-4" aria-label="Completed" />
                ) : (
                  index + 1
                )}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${style.badge}`}>
                {style.label}
              </span>
            </div>
            <h3 className="mt-3 font-serif text-lg text-ink">{step.title}</h3>
            {step.state === "UPCOMING" ? (
              <span className="mt-3 text-sm font-semibold text-slate-500">Available later</span>
            ) : (
              <Link
                href={step.href}
                className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900"
              >
                {step.actionLabel}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function formatNotificationTime(value: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}


function formatCompactNotificationTime(value: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}
export function NotificationList({
  items,
  openNotification,
  compact = false,
}: {
  items: UserNotification[];
  openNotification?: (formData: FormData) => Promise<void>;
  compact?: boolean;
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const style = notificationStyle[item.kind];
        const Icon = style.icon;
        const isReadUpdate = item.kind === "UPDATE" && item.isUnread === false;
        const surfaceClass = isReadUpdate
          ? "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80"
          : style.surfaceClass;
        const iconClass = isReadUpdate
          ? "bg-slate-100 text-slate-600"
          : style.iconClass;
        const actionClass = isReadUpdate
          ? "border-slate-300 bg-slate-50 text-slate-700 group-hover:border-slate-400 group-hover:bg-slate-100"
          : "border-blue-300 bg-white text-blue-700 group-hover:border-blue-500 group-hover:bg-blue-50";

        const information = (
          <div className={compact ? "contents" : "flex min-w-0 flex-1 items-start gap-3"}>
            <span
              className={`flex shrink-0 items-center justify-center rounded-full ${compact ? "size-8" : "size-10"} ${iconClass}`}
            >
              <Icon className={compact ? "size-4" : "size-5"} aria-hidden />
            </span>
            <div className="min-w-0">
              <div className={compact ? "" : "flex flex-wrap items-center gap-2"}>
                <h3 className={compact ? "line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-ink sm:text-base" : "font-semibold text-ink"}>
                  {item.title}
                </h3>
                {item.isUnread && !compact && (
                  <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-bold text-white">
                    New
                  </span>
                )}
                {item.occurredAt && (
                  <time
                    dateTime={item.occurredAt.toISOString()}
                    className={compact ? "mt-1 block whitespace-nowrap text-xs font-medium text-slate-600" : "text-xs font-medium text-slate-600"}
                  >
                    {compact
                      ? formatCompactNotificationTime(item.occurredAt)
                      : formatNotificationTime(item.occurredAt)}
                  </time>
                )}
              </div>
              {!compact && <p className="mt-1 text-sm leading-6 text-ink-dim">{item.message}</p>}
            </div>
          </div>
        );

        if (item.notificationId && openNotification) {
          return (
            <form
              key={item.id}
              action={openNotification}
              className={`group relative rounded-xl border transition-colors ${surfaceClass} ${item.isUnread ? "ring-2 ring-blue-200 shadow-sm" : ""}`}
            >
              <input type="hidden" name="notificationId" value={item.notificationId} />
              <input type="hidden" name="href" value={item.href} />
              <button
                type="submit"
                aria-label={`${item.actionLabel}: ${item.title}`}
                className="absolute inset-0 z-10 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              />
              <div
                className={compact
                  ? "pointer-events-none relative z-20 grid min-h-28 grid-cols-[2rem_minmax(0,1fr)_5rem] items-center gap-3 p-3 sm:grid-cols-[2rem_minmax(0,1fr)_7rem]"
                  : "pointer-events-none relative z-20 flex flex-col gap-4 p-4 sm:flex-row sm:items-center"}
              >
                {information}
                <span
                  className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-full border font-semibold transition-colors ${compact ? "w-20 px-2 py-2 text-xs sm:w-28 sm:text-sm" : "px-4 py-2 text-sm"} ${actionClass}`}
                >
                  {compact ? "View" : item.actionLabel}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </div>
            </form>
          );
        }

        return (
          <article
            key={item.id}
            className={`rounded-xl border ${compact ? "grid min-h-28 grid-cols-[2rem_minmax(0,1fr)_5rem] items-center gap-3 p-3 sm:grid-cols-[2rem_minmax(0,1fr)_7rem]" : "flex flex-col gap-4 p-4 sm:flex-row sm:items-center"} ${surfaceClass} ${item.isUnread ? "ring-2 ring-blue-200 shadow-sm" : ""}`}
          >
            {information}
            <Link
              href={item.href}
              className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-blue-300 bg-white font-semibold text-blue-700 transition-colors hover:border-blue-500 hover:bg-blue-50 ${compact ? "w-20 px-2 py-2 text-xs sm:w-28 sm:text-sm" : "px-4 py-2 text-sm"}`}
            >
              {compact ? "View" : item.actionLabel}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </article>
        );
      })}
    </div>
  );
}
export function AttentionPanel({ center }: { center: UserNotificationCenter }) {
  if (center.actionItems.length > 0) {
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
              {center.urgentCount} item{center.urgentCount === 1 ? "" : "s"} need your attention
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

  const unreadItems = center.updates.filter((item) => item.isUnread).slice(0, 3);
  if (unreadItems.length > 0) {
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
            <h2 id="account-activity-title" className="mt-0.5 font-serif text-xl text-blue-950">
              {center.unreadCount} new update{center.unreadCount === 1 ? "" : "s"}
            </h2>
          </div>
          <Link
            href="/app/notifications"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            Review updates
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        <div className="divide-y divide-blue-200 px-5">
          {unreadItems.map((item) => (
            <Link
              key={item.id}
              href="/app/notifications"
              className="group flex items-center gap-3 py-3.5 text-sm"
            >
              <Info className="size-4 shrink-0 text-blue-700" aria-hidden />
              <span className="min-w-0 flex-1 font-medium text-blue-950">{item.title}</span>
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

  const currentStep = center.journey.find(
    (step) => step.state === "CURRENT" && step.id !== "withdraw",
  );
  if (!currentStep) return null;

  return (
    <section
      aria-labelledby="guided-step-title"
      className="flex flex-col gap-4 rounded-2xl border-2 border-blue-200 bg-blue-50 p-5 shadow-sm sm:flex-row sm:items-center"
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
        {center.journey.findIndex((step) => step.id === currentStep.id) + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-blue-700">
          Your next step
        </p>
        <h2 id="guided-step-title" className="mt-0.5 font-serif text-xl text-blue-950">
          {currentStep.title}
        </h2>
        <p className="mt-1 text-sm leading-6 text-blue-900">{currentStep.message}</p>
      </div>
      <Link
        href={currentStep.href}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
      >
        {currentStep.actionLabel}
        <ArrowRight className="size-4" aria-hidden />
      </Link>
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
