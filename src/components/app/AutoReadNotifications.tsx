"use client";

import { useEffect } from "react";
import { markAllNotificationsRead } from "@/app/app/notifications/actions";

export function AutoReadNotifications({ unreadCount }: { unreadCount: number }) {
  useEffect(() => {
    if (unreadCount > 0) {
      void markAllNotificationsRead();
    }
  }, [unreadCount]);

  return null;
}
