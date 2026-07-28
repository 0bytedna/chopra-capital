"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function markAllNotificationsRead(): Promise<void> {
  const user = await requireUser();

  await prisma.accountNotification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });

  revalidatePath("/app");
  revalidatePath("/app/notifications");
}
