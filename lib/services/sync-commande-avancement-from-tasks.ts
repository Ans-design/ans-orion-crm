import { prisma } from '@/lib/prisma';
import { computeCommandeAvancementFromTasks } from '@/lib/commande/commande-task-avancement';
import type { CommandeStatut, Prisma } from '@prisma/client';

/**
 * Recalcule et persiste commande.avancement (+ statut si progression)
 * à partir des MetierTask assignées au personnel.
 */
export async function syncCommandeAvancementFromTasks(commandeId: string | null | undefined) {
  if (!commandeId) return null;

  const tasks = await prisma.metierTask.findMany({
    where: { commandeId },
    select: { title: true, status: true, assigneeName: true, type: true },
  });

  const computed = computeCommandeAvancementFromTasks(tasks);
  const before = await prisma.commande.findUnique({
    where: { id: commandeId },
    select: { id: true, avancement: true, statut: true },
  });
  if (!before) return null;

  // Ne jamais reculer l’avancement (évite clignotements si tâches partielles)
  const nextAvancement = Math.max(before.avancement ?? 0, computed.avancement);

  const data: Prisma.CommandeUpdateInput = { avancement: nextAvancement };
  // Avancer le statut atelier seulement si le pipeline le suggère et qu’on n’est pas déjà plus loin
  const terminal = new Set(['Livré', 'Annulée', 'Suspendu']);
  if (
    computed.suggestedStatut
    && !terminal.has(before.statut)
    && before.statut !== computed.suggestedStatut
    && nextAvancement >= computed.avancement
  ) {
    // Ne pas rétrograder statut (ordre pipeline approximatif)
    const order = [
      'À planifier',
      'En attente stock',
      'En production',
      'En finition',
      'Prête',
      'Livré',
    ];
    const bi = order.indexOf(before.statut);
    const si = order.indexOf(computed.suggestedStatut);
    if (si >= 0 && (bi < 0 || si > bi)) {
      data.statut = computed.suggestedStatut as CommandeStatut;
    }
  }

  if (data.avancement === before.avancement && !data.statut) {
    return { ...before, computed };
  }

  const updated = await prisma.commande.update({
    where: { id: commandeId },
    data,
    select: { id: true, avancement: true, statut: true },
  });

  return { ...updated, computed };
}
