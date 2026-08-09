import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getUserNotificationCenter } from "@/lib/userNotifications";
import { markNotificationReadAndOpen } from "./actions";
import {
  AccountJourney,
  NotificationList,
} from "@/components/app/UserNotifications";
import { AutoReadNotifications } from "@/components/app/AutoReadNotifications";
import { ExpandableActivityList } from "@/components/app/ExpandableActivityList";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const center = await getUserNotificationCenter(user.id);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <h1 className="sr-only">Notifications</h1>
      <AutoReadNotifications unreadCount={center.unreadCount} />

      <section aria-label="Your account journey">
        <AccountJourney steps={center.journey} />
      </section>

      {center.actionItems.length > 0 && (
        <section aria-labelledby="action-notifications-title" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id="action-notifications-title" className="font-serif text-2xl text-ink">
              Action required
            </h2>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
              {center.urgentCount} pending
            </span>
          </div>
          <NotificationList
            items={center.actionItems}
            openNotification={markNotificationReadAndOpen}
          />
        </section>
      )}

      {center.updates.length > 0 && (
        <section aria-label="Account activity">
          <ExpandableActivityList
            total={center.updates.length}
            batches={Array.from(
              { length: Math.ceil(center.updates.length / 5) },
              (_, index) => (
                <NotificationList
                  key={index}
                  items={center.updates.slice(index * 5, index * 5 + 5)}
                  openNotification={markNotificationReadAndOpen}
                  compact
                />
              ),
            )}
          />
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
          <NotificationList
            items={center.recommendations}
            openNotification={markNotificationReadAndOpen}
          />
        </section>
      )}
    </div>
  );
}