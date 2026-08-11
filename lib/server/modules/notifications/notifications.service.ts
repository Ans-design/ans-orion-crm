import { prisma } from '@/lib/prisma';
import { getNotificationDrawerItems } from '@/lib/services/notification-drawer-service';

/**
 * Inbox personnelle via receipts (V14).
 * Les notifications globales (userId null, sans receipt) vont au drawer alertes actives — pas ici.
 */
export async function listUserNotifications(userId: string, opts?: { unreadOnly?: boolean }) {
  const receipts = await prisma.notificationReceipt.findMany({
    where: {
      userId,
      archivedAt: null,
      ...(opts?.unreadOnly ? { readAt: null } : {}),
    },
    include: { notification: true },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  const notifications = receipts.map((r) => ({
    id: r.notification.id,
    userId: r.userId,
    title: r.notification.title,
    message: r.notification.message,
    link: r.notification.link,
    type: r.notification.type,
    category: r.notification.category,
    read: Boolean(r.readAt),
    createdAt: r.notification.createdAt,
    receiptId: r.id,
    seenAt: r.seenAt,
    readAt: r.readAt,
  }));

  const unreadCount = await prisma.notificationReceipt.count({
    where: { userId, readAt: null, archivedAt: null },
  });

  return { notifications, unreadCount, quality: 'OK' as const };
}

/**
 * Marquage lu scoped session + receipt (P0-02) — jamais updateMany par ids seuls.
 */
export async function markNotificationsRead(
  userId: string,
  input: { ids?: string[]; markAllRead?: boolean },
) {
  const now = new Date();

  if (input.markAllRead) {
    await prisma.notificationReceipt.updateMany({
      where: { userId, readAt: null },
      data: { readAt: now, seenAt: now },
    });
    // Legacy mirror pour userId ciblé
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { success: true as const, scoped: true as const };
  }

  if (input.ids?.length) {
    const updated = await prisma.notificationReceipt.updateMany({
      where: {
        userId,
        notificationId: { in: input.ids },
      },
      data: { readAt: now, seenAt: now },
    });

    await prisma.notification.updateMany({
      where: {
        id: { in: input.ids },
        userId,
      },
      data: { read: true },
    });

    return { success: true as const, scoped: true as const, updated: updated.count };
  }

  return { success: true as const, scoped: true as const, updated: 0 };
}

export { getNotificationDrawerItems };
