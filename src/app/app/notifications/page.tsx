import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getUserNotificationCenter } from "@/lib/userNotifications";
import { markAllNotificationsRead } from "./actions";
import {
  AccountJourney,
  AllCaughtUp,
  NotificationList,
} from "@/components/app/UserNotifications";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const center = await getUserNotificationCenter(user.id);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="eyebrow">Account activity</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-3xl text-ink sm:text-4xl">Notification center</h1>
          {center.attentionCount > 0 && (
            <span className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-full bg-amber-600 px-2.5 text-base font-bold text-white shadow-sm">
              {center.attentionCount}
            </span>
          )}
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-dim">
          Your KYC, deposit, and withdrawal journey appears here alongside requests that need
          attention, transaction updates, support replies, and security recommendations.
        </p>
      </header>

      <section aria-labelledby="account-journey-title" className="space-y-3">
        <div>
          <h2 id="account-journey-title" className="font-serif text-2xl text-ink">
            Your account journey
          </h2>
          <p className="mt-1 text-sm leading-6 text-ink-dim">
            Complete each step in order. Your current step is highlighted automatically.
          </p>
        </div>
        <AccountJourney steps={center.journey} />
      </section>

      {center.actionItems.length > 0 ? (
        <section aria-labelledby="action-notifications-title" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id="action-notifications-title" className="font-serif text-2xl text-ink">
              Action required
            </h2>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
              {center.urgentCount} pending
            </span>
          </div>
          <NotificationList items={center.actionItems} />
        </section>
      ) : (
        <AllCaughtUp />
      )}

      {center.updates.length > 0 && (
        <section aria-labelledby="notification-updates-title" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 id="notification-updates-title" className="font-serif text-2xl text-ink">
                Account activity
              </h2>
              {center.unreadCount > 0 && (
                <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800">
                  {center.unreadCount} new
                </span>
              )}
            </div>
            {center.unreadCount > 0 && (
              <form action={markAllNotificationsRead}>
                <button
                  type="submit"
                  className="rounded-full border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition-colors hover:border-blue-500 hover:bg-blue-50"
                >
                  Mark all as read
                </button>
              </form>
            )}
          </div>
          <p className="text-sm leading-6 text-ink-dim">
            Important changes to your account are stored here, newest first.
          </p>
          <NotificationList items={center.updates} />
        </section>
      )}

      {center.recommendations.length > 0 && (
        <section aria-labelledby="notification-recommendations-title" className="space-y-3">
          <h2
            id="notification-recommendations-title"
            className="font-serif text-2xl text-ink"
          >
            Recommended
          </h2>
          <p className="text-sm leading-6 text-ink-dim">
            These are optional until you use the related withdrawal method.
          </p>
          <NotificationList items={center.recommendations} />
        </section>
      )}
    </div>
  );
}
