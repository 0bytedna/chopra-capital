"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function markAllNotificationsRead(): Promise<void> {
  const user = await requireUser();

  await prisma.accountNotification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function markNotificationReadAndOpen(formData: FormData): Promise<void> {
  const user = await requireUser();
  const notificationId = String(formData.get("notificationId") ?? "");
  const requestedHref = String(formData.get("href") ?? "");
  const href = /^\/app(?:[/?#]|$)/.test(requestedHref)
    ? requestedHref
    : "/app/notifications";

  if (notificationId) {
    await prisma.accountNotification.updateMany({
      where: { id: notificationId, userId: user.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  revalidatePath("/app");
  revalidatePath("/app", "layout");
  revalidatePath("/app/notifications");
  redirect(href);
}
