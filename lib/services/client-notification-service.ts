import { prisma } from '@/lib/prisma';
import {
  commandeRetardStatut,
  completedCommandeStatuts,
  materialPlanCommandeStatutLabel,
  shippedCommandeStatuts,
} from '@/lib/server/data/prisma-statut-bridge';

export type PendingNotification = {
  type: 'retard' | 'bat' | 'livraison';
  commandeId: string;
  numero: string;
  client: string;
  article: string;
  dateLiv: string | null;
  message: string;
};

export async function getPendingClientNotifications(): Promise<PendingNotification[]> {
  const commandes = await prisma.commande.findMany({
    where: { statut: { notIn: [...completedCommandeStatuts()] } },
    include: { client: { select: { name: true } } },
    orderBy: { dateLiv: 'asc' },
    take: 100,
  });

  const proofsPending = await prisma.proof.findMany({
    where: { statut: { in: ['En attente', 'Envoyé'] } },
    select: { commandeId: true },
  }).catch(() => [] as { commandeId: string }[]);
  const batCmdIds = new Set(proofsPending.map((p) => p.commandeId));

  const now = new Date();
  const items: PendingNotification[] = [];

  for (const c of commandes) {
    const client = c.client?.name ?? '—';
    const dateLiv = c.dateLiv?.toISOString() ?? null;
    if (c.statut === commandeRetardStatut() || (c.dateLiv && c.dateLiv < now)) {
      items.push({
        type: 'retard',
        commandeId: c.id,
        numero: c.numero,
        client,
        article: c.article,
        dateLiv,
        message: `Retard sur commande ${c.numero} — ${c.article}`,
      });
    } else if (batCmdIds.has(c.id)) {
      items.push({
        type: 'bat',
        commandeId: c.id,
        numero: c.numero,
        client,
        article: c.article,
        dateLiv,
        message: `BAT à valider pour ${c.numero} — ${client}`,
      });
    }
  }

  const livrees = await prisma.commande.findMany({
    where: { statut: { in: shippedCommandeStatuts() } },
    include: { client: { select: { name: true } } },
    orderBy: { updatedAt: 'desc' },
    take: 5,
  });
  for (const c of livrees) {
    items.push({
      type: 'livraison',
      commandeId: c.id,
      numero: c.numero,
      client: c.client?.name ?? '—',
      article: c.article,
      dateLiv: c.dateLiv?.toISOString() ?? null,
      message: `Commande ${c.numero} prête à livrer — ${c.client?.name ?? '—'}`,
    });
  }

  return items;
}

export async function logClientNotification(data: {
  clientId?: string | null;
  commandeId?: string | null;
  type: string;
  canal: string;
  message: string;
  sentBy?: string | null;
  /** Si true et connecteur absent → ASSISTE (preuve manuelle). */
  assisted?: boolean;
}) {
  // V14 P0-10 : jamais « Envoyé » sans adaptateur réel.
  const connectorConfigured = Boolean(
    process.env.CM_WHATSAPP_WEBHOOK_URL
    || process.env.CM_SMS_API_KEY
    || process.env.CM_EMAIL_PROVIDER_KEY,
  );

  let statut: 'NON_CONFIGURE' | 'ASSISTE' | 'Envoyé' = 'NON_CONFIGURE';
  if (connectorConfigured) {
    statut = 'Envoyé';
  } else if (data.assisted) {
    statut = 'ASSISTE';
  }

  return prisma.clientNotificationLog.create({
    data: {
      clientId: data.clientId || null,
      commandeId: data.commandeId || null,
      type: data.type,
      canal: data.canal,
      message: data.message,
      statut,
      sentBy: data.sentBy || null,
    },
  });
}

export async function listNotificationHistory(days = 7) {
  const since = new Date(Date.now() - days * 86400000);
  return prisma.clientNotificationLog.findMany({
    where: { sentAt: { gte: since } },
    orderBy: { sentAt: 'desc' },
    take: 20,
    include: { client: { select: { name: true } } },
  });
}

export async function getNotificationStats() {
  const [retards, batPending, clients] = await Promise.all([
    prisma.commande.count({ where: { statut: commandeRetardStatut() } }),
    prisma.proof.count({ where: { statut: { in: ['En attente', 'Envoyé'] } } }).catch(() => 0),
    prisma.client.count({ where: { archived: false } }),
  ]);
  const livrees = await prisma.commande.count({ where: { statut: { in: shippedCommandeStatuts() } } });
  return { retards, batPending, livrees, clients };
}
