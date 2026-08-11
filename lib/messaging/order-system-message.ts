import { prisma } from '@/lib/prisma';

/** Message système dans le groupe Talk commande après création dossier / tâches. */
export async function postSystemMessageForOrder(
  commandeId: string,
  conversationId: string,
  opts?: { userId?: string; userName?: string },
) {
  const [commande, tasks, slot] = await Promise.all([
    prisma.commande.findUnique({
      where: { id: commandeId },
      select: { numero: true, article: true },
    }),
    prisma.metierTask.findMany({
      where: { commandeId },
      select: { title: true, assigneeName: true, assigneeRole: true, type: true },
      take: 20,
    }),
    prisma.productionSlot.findFirst({
      where: { commandeId },
      select: { title: true, startAt: true },
    }),
  ]);

  if (!commande) return null;

  const assigned = tasks.filter((t) => t.assigneeName);
  const lines = [
    `Dossier GPAO créé pour la commande ${commande.numero}.`,
    `Article : ${commande.article}`,
    tasks.length
      ? `Tâches : ${tasks.length} (${assigned.length} assignée${assigned.length > 1 ? 's' : ''}).`
      : 'Tâches : en cours de synchronisation.',
    slot
      ? `Planning : ${slot.title} — ${slot.startAt.toLocaleString('fr-FR')}.`
      : null,
  ].filter(Boolean);

  const existing = await prisma.talkMessage.findFirst({
    where: {
      conversationId,
      body: { startsWith: `Dossier GPAO créé pour la commande ${commande.numero}` },
    },
  });
  if (existing) return existing;

  return prisma.talkMessage.create({
    data: {
      conversationId,
      senderId: opts?.userId ?? null,
      senderName: opts?.userName ?? 'ANS ORION',
      senderRole: 'system',
      body: lines.join('\n'),
      commandeId,
    },
  });
}
