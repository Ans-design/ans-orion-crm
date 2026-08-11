import { prisma } from '@/lib/prisma';
import { createNotification, type NotificationCategory } from '@/lib/services/notification-service';
import { createOrderConversation, sendTalkMessage } from '@/lib/messaging/messaging-service';
import { ensureServiceConversations } from '@/lib/messaging/messaging-service';

export type OrionAssistantEventType =
  | 'devis_expiration'
  | 'devis_expire'
  | 'acompte_recu'
  | 'commande_creee'
  | 'client_inactif'
  | 'stock_insuffisant'
  | 'bat_attente'
  | 'generic';

const EVENT_CATEGORY: Record<OrionAssistantEventType, NotificationCategory> = {
  devis_expiration: 'devis',
  devis_expire: 'devis',
  acompte_recu: 'paiements',
  commande_creee: 'commandes',
  client_inactif: 'commandes',
  stock_insuffisant: 'production',
  bat_attente: 'production',
  generic: 'commandes',
};

const SERVICE_KEY_BY_TYPE: Partial<Record<OrionAssistantEventType, string>> = {
  devis_expiration: 'commercial',
  devis_expire: 'commercial',
  acompte_recu: 'finance',
  commande_creee: 'commercial',
  client_inactif: 'commercial',
  stock_insuffisant: 'stock',
  bat_attente: 'graphistes',
  generic: 'direction',
};

async function wasRecentlyNotified(dedupKey: string, hours = 24): Promise<boolean> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const hit = await prisma.notification.findFirst({
    where: {
      message: { contains: dedupKey },
      createdAt: { gte: since },
    },
    select: { id: true },
  });
  return Boolean(hit);
}

async function resolveOrionSender(): Promise<{ userId: string; userName: string; role: string } | null> {
  const user = await prisma.user.findFirst({
    where: { role: { in: ['admin', 'manager'] } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, role: true },
  });
  if (!user) return null;
  return { userId: user.id, userName: user.name ?? 'ORION Assistant', role: user.role };
}

/** ORION Assistant — notifications cockpit + ANS Talk. */
export async function postOrionAssistantMessage(event: {
  type: OrionAssistantEventType;
  title: string;
  body: string;
  link?: string;
  commandeId?: string;
  dedupKey?: string;
}) {
  const dedupKey =
    event.dedupKey
    ?? `orion:${event.type}:${event.commandeId ?? 'global'}:${event.title.slice(0, 40)}`;
  if (await wasRecentlyNotified(dedupKey)) return { skipped: true as const };

  await createNotification({
    title: `ORION · ${event.title}`,
    message: event.body,
    link: event.link ?? '/dashboard',
    type: 'info',
    category: EVENT_CATEGORY[event.type] ?? 'commandes',
    dedupKey,
    sourceEventId: dedupKey,
    resourceType: event.commandeId ? 'Commande' : 'Orion',
    resourceId: event.commandeId ?? event.type,
  }).catch(() => {});

  const sender = await resolveOrionSender();
  if (!sender) return { skipped: false as const };

  const talkBody = `🤖 **${event.title}**\n${event.body}${event.link ? `\n→ ${event.link}` : ''}`;

  try {
    if (event.commandeId) {
      const conv = await createOrderConversation(event.commandeId, {
        userId: sender.userId,
        userName: sender.userName,
      });
      await sendTalkMessage({
        conversationId: conv.id,
        userId: sender.userId,
        userName: 'ORION Assistant',
        userRole: sender.role,
        body: talkBody,
        commandeId: event.commandeId,
      });
    } else {
      await ensureServiceConversations();
      const serviceKey = SERVICE_KEY_BY_TYPE[event.type] ?? 'direction';
      const conv = await prisma.talkConversation.findFirst({
        where: { type: 'service', serviceKey },
      });
      if (conv) {
        await sendTalkMessage({
          conversationId: conv.id,
          userId: sender.userId,
          userName: 'ORION Assistant',
          userRole: sender.role,
          body: talkBody,
        });
      }
    }
  } catch {
    /* Talk optionnel */
  }

  return { skipped: false as const };
}
