/**
 * V14 — santé communications (admin).
 */

import { prisma } from '@/lib/prisma';
import { isEmailConfigured } from '@/lib/services/email-service';
import { isObjectStorageConfigured } from '@/lib/storage/object-storage';

export type CommsHealthReport = {
  quality: 'OK' | 'PARTIAL' | 'ERROR';
  channels: {
    email: { configured: boolean; status: string };
    whatsapp: { configured: boolean; status: string };
    sms: { configured: boolean; status: string };
    objectStorage: { configured: boolean; status: string };
  };
  outbox: { pending: number; failed: number; dead: number };
  talk: { unreadSample: number; conversations: number };
  cm: { nonConfigure: number; assiste: number; envoye: number };
  kpis: { cm006_honestDeliveryRate: number | null; note: string };
  checkedAt: string;
};

export async function getCommsHealth(): Promise<CommsHealthReport> {
  const emailOk = isEmailConfigured();
  const wa = Boolean(process.env.CM_WHATSAPP_WEBHOOK_URL);
  const sms = Boolean(process.env.CM_SMS_API_KEY);
  const storage = isObjectStorageConfigured();

  const [pending, failed, dead, conversations, nonConfigure, assiste, envoye] = await Promise.all([
    prisma.outboxEvent.count({ where: { status: 'pending' } }).catch(() => -1),
    prisma.outboxEvent.count({ where: { status: 'failed' } }).catch(() => -1),
    prisma.outboxEvent.count({ where: { status: 'dead' } }).catch(() => -1),
    prisma.talkConversation.count().catch(() => -1),
    prisma.clientNotificationLog.count({ where: { statut: 'NON_CONFIGURE' } }).catch(() => 0),
    prisma.clientNotificationLog.count({ where: { statut: 'ASSISTE' } }).catch(() => 0),
    prisma.clientNotificationLog.count({ where: { statut: 'Envoyé' } }).catch(() => 0),
  ]);

  const delivered = envoye + assiste;
  const total = delivered + nonConfigure;
  const honestRate = total > 0 ? delivered / total : null;

  let quality: CommsHealthReport['quality'] = 'OK';
  if (!emailOk || !storage) quality = 'PARTIAL';
  if (failed > 10 || dead > 0) quality = 'PARTIAL';
  if (pending < 0) quality = 'ERROR';

  return {
    quality,
    channels: {
      email: { configured: emailOk, status: emailOk ? 'ready' : 'NON_CONFIGURE' },
      whatsapp: { configured: wa, status: wa ? 'ready' : 'NON_CONFIGURE' },
      sms: { configured: sms, status: sms ? 'ready' : 'NON_CONFIGURE' },
      objectStorage: {
        configured: storage,
        status: storage ? 'ready' : process.env.NODE_ENV === 'production' ? 'REQUIRED' : 'local_ok',
      },
    },
    outbox: { pending: Math.max(0, pending), failed: Math.max(0, failed), dead: Math.max(0, dead) },
    talk: { unreadSample: 0, conversations: Math.max(0, conversations) },
    cm: { nonConfigure, assiste, envoye },
    kpis: {
      cm006_honestDeliveryRate: honestRate,
      note: 'CM-006 = (Envoyé+ASSISTE) / total logs — Envoyé faux interdit',
    },
    checkedAt: new Date().toISOString(),
  };
}
