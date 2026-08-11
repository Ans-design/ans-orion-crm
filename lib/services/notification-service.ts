/**
 * V14 — createNotification canonique : persist + receipts avant e-mail ;
 * e-mail uniquement destinataires explicites (jamais fan-out prefs globales).
 */

import { prisma } from '@/lib/prisma';
import type { Prisma, PrismaClient } from '@prisma/client';
import { DEFAULT_NOTIFICATIONS } from '@/lib/settings-defaults';
import { isEmailConfigured, sendAlertEmail } from './email-service';
import { enqueueOutbox } from '@/lib/server/outbox';

export type NotificationCategory =
  | 'devis'
  | 'commandes'
  | 'factures'
  | 'paiements'
  | 'production'
  | 'livraisons'
  | 'audit';

export type CreateNotificationParams = {
  userId?: string | null;
  /** Destinataires explicites (préféré). */
  userIds?: string[];
  title: string;
  message: string;
  link?: string;
  type?: 'info' | 'warning' | 'success' | 'error';
  category?: NotificationCategory;
  dedupKey?: string;
  sourceEventId?: string;
  sensitivity?: 'normal' | 'sensitive' | 'restricted';
  resourceType?: string;
  resourceId?: string;
  /** Scope e-mail (Talk) — sous-ensemble des destinataires. */
  onlyUserIds?: string[];
  skipEmail?: boolean;
  tx?: Prisma.TransactionClient;
};

export type CreateNotificationResult =
  | { ok: true; notificationId: string; receiptIds: string[]; duplicate?: boolean }
  | { ok: false; code: 'DEDUP' | 'PERSIST_FAILED' | 'NO_RECIPIENT'; message: string; notificationId?: string };

type Db = Prisma.TransactionClient | PrismaClient;

function resolveRecipients(params: CreateNotificationParams): string[] {
  const ids = new Set<string>();
  if (params.userIds?.length) {
    for (const id of params.userIds) {
      if (id) ids.add(id);
    }
  }
  if (params.userId) ids.add(params.userId);
  return [...ids];
}

export async function createNotification(
  params: CreateNotificationParams,
): Promise<CreateNotificationResult | null> {
  const db: Db = params.tx ?? prisma;
  const recipients = resolveRecipients(params);

  if (params.dedupKey) {
    const existing = await db.notification.findUnique({
      where: { dedupKey: params.dedupKey },
      select: { id: true },
    });
    if (existing) {
      return { ok: true, notificationId: existing.id, receiptIds: [], duplicate: true };
    }
  }

  let notificationId: string;
  const receiptIds: string[] = [];

  try {
    const created = await db.notification.create({
      data: {
        userId: recipients[0] ?? params.userId ?? null,
        title: params.title,
        message: params.message,
        link: params.link ?? null,
        type: params.type ?? 'info',
        category: params.category ?? null,
        sourceEventId: params.sourceEventId ?? null,
        dedupKey: params.dedupKey ?? null,
        sensitivity: params.sensitivity ?? 'normal',
        resourceType: params.resourceType ?? null,
        resourceId: params.resourceId ?? null,
        receipts:
          recipients.length > 0
            ? {
                create: recipients.map((userId) => ({ userId })),
              }
            : undefined,
      },
      include: { receipts: true },
    });
    notificationId = created.id;
    receiptIds.push(...created.receipts.map((r) => r.id));
  } catch (e) {
    console.error('Notification error:', e);
    return { ok: false, code: 'PERSIST_FAILED', message: 'Persistance notification échouée' };
  }

  if (!params.skipEmail && recipients.length > 0) {
    const emailTargets = params.onlyUserIds?.length
      ? params.onlyUserIds.filter((id) => recipients.includes(id))
      : recipients;

    if (emailTargets.length > 0) {
      try {
        await enqueueOutbox({
          type: 'NotificationEmailFanout',
          aggregateType: 'Notification',
          aggregateId: notificationId,
          idempotencyKey: params.dedupKey
            ? `notif-email:${params.dedupKey}`
            : `notif-email:${notificationId}`,
          payload: {
            notificationId,
            title: params.title,
            message: params.message,
            link: params.link ?? null,
            category: params.category ?? null,
            onlyUserIds: emailTargets,
          },
          tx: params.tx,
        });
      } catch (e) {
        console.error('Notification outbox enqueue:', e);
      }

      // Fan-out e-mail hors TX métier si pas de tx — toujours après persist, scoped.
      if (!params.tx) {
        dispatchEmailAlerts(
          {
            title: params.title,
            message: params.message,
            link: params.link,
            category: params.category,
          },
          { onlyUserIds: emailTargets },
        ).catch((err) => console.error('Email alert dispatch:', err));
      }
    }
  }

  return { ok: true, notificationId, receiptIds };
}

/** @internal — e-mail uniquement si onlyUserIds fourni (P0-05). */
export async function dispatchEmailAlerts(
  params: {
    title: string;
    message: string;
    link?: string;
    category?: NotificationCategory;
  },
  opts: { onlyUserIds: string[] },
) {
  if (!isEmailConfigured()) return;
  if (!opts.onlyUserIds.length) return;

  const prefs = await prisma.userPreference.findMany({
    where: {
      category: 'notifications',
      userId: { in: opts.onlyUserIds },
    },
  });

  const subject = `[ANS ORION] ${params.title}`;

  for (const pref of prefs) {
    const data = { ...DEFAULT_NOTIFICATIONS, ...(pref.data as object) } as typeof DEFAULT_NOTIFICATIONS;
    if (!data.emailAlerts || !data.alertEmail?.trim()) continue;
    if (params.category && !(data as Record<string, unknown>)[params.category]) continue;

    await sendAlertEmail({
      to: data.alertEmail.trim(),
      subject,
      title: params.title,
      message: params.message,
      link: params.link,
    });
  }
}

export async function seedDemoNotifications(client: PrismaClient = prisma) {
  const existing = await client.notification.count();
  if (existing >= 3) return;

  const samples = [
    { title: 'Stock critique', message: 'Bristol 300g sous le seuil minimum — réappro recommandé', link: '/stock', type: 'warning' as const },
    { title: 'BAT en attente', message: '1 bon à tirer attend validation client', link: '/bat', type: 'info' as const },
    { title: 'Achat fournisseur', message: 'Commande ACH en attente de réception Paperland', link: '/achats', type: 'info' as const },
  ];

  for (const s of samples) {
    await client.notification.create({
      data: {
        title: s.title,
        message: s.message,
        link: s.link,
        type: s.type,
        category: 'commandes',
      },
    });
  }
  console.log(`${samples.length} notifications démo seedées`);
}
