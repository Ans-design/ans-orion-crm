import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

export async function listCommandeBlocages(commandeId: string) {
  return prisma.commandeBlocage.findMany({
    where: { commandeId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function listActiveBlocages(commandeId: string) {
  return prisma.commandeBlocage.findMany({
    where: { commandeId, statut: 'actif' },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createCommandeBlocage(
  commandeId: string,
  data: {
    raison: string;
    causeDetail?: string | null;
    responsable?: string | null;
    actionAttendue?: string | null;
    createdBy?: string;
    createdByName?: string;
  },
) {
  const blocage = await prisma.commandeBlocage.create({
    data: {
      commandeId,
      raison: data.raison,
      causeDetail: data.causeDetail ?? null,
      responsable: data.responsable ?? null,
      actionAttendue: data.actionAttendue ?? null,
      createdBy: data.createdBy ?? null,
      createdByName: data.createdByName ?? null,
      statut: 'actif',
    },
  });

  await logAudit({
    userId: data.createdBy,
    userName: data.createdByName,
    action: 'COMMANDE_BLOCAGE',
    entity: 'Commande',
    entityId: commandeId,
    entityLabel: data.raison,
    details: { blocageId: blocage.id, cause: data.causeDetail },
  });

  return blocage;
}

export async function resolveCommandeBlocage(
  blocageId: string,
  opts: { commandeId?: string; resolvedBy?: string; resolveNote?: string | null },
) {
  const existing = await prisma.commandeBlocage.findUnique({ where: { id: blocageId } });
  if (!existing || existing.statut === 'resolu') return null;
  if (opts.commandeId && existing.commandeId !== opts.commandeId) return null;

  const blocage = await prisma.commandeBlocage.update({
    where: { id: blocageId },
    data: {
      statut: 'resolu',
      resolvedAt: new Date(),
      resolvedBy: opts.resolvedBy ?? null,
      resolveNote: opts.resolveNote ?? null,
    },
  });

  await logAudit({
    userId: opts.resolvedBy,
    action: 'COMMANDE_DEBLOCAGE',
    entity: 'Commande',
    entityId: existing.commandeId,
    entityLabel: existing.raison,
    details: { blocageId, note: opts.resolveNote },
  });

  return blocage;
}
