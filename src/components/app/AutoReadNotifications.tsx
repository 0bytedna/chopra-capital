"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { markAllNotificationsRead } from "@/app/app/notifications/actions";

export function AutoReadNotifications({ unreadCount }: { unreadCount: number }) {
  const router = useRouter();

  useEffect(() => {
    if (unreadCount > 0) {
      void markAllNotificationsRead()
        .then(() => router.refresh())
        .catch(() => undefined);
    }
  }, [router, unreadCount]);

  return null;
}
