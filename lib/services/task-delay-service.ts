import { prisma } from '@/lib/prisma';
import { CommandeStatut } from '@prisma/client';
import { createNotification } from '@/lib/services/notification-service';
import {
  delayMachineFromTask,
  delaySlotTitle,
  formatExtraHours,
  nextWorkExtensionWindow,
  validateDelayInput,
} from '@/lib/metier/task-delay';

export async function declareTaskProductionDelay(input: {
  taskId: string;
  motif: string;
  extraMin: number;
  declaredByName?: string | null;
}) {
  const err = validateDelayInput(input.motif, input.extraMin);
  if (err) throw new Error(err);

  const task = await prisma.metierTask.findUnique({ where: { id: input.taskId } });
  if (!task) throw new Error('Tâche introuvable');
  if (task.status === 'Terminée' || task.status === 'Annulée') {
    throw new Error('Tâche déjà clôturée');
  }

  const extraMin = Math.round(input.extraMin);
  const motif = input.motif.trim();
  const { startAt, endAt } = nextWorkExtensionWindow(extraMin);
  const note = `Retard prod · +${formatExtraHours(extraMin)} · ${motif}`.slice(0, 2000);

  let elapsedSec = task.elapsedSec;
  if (task.timerStatus === 'running' && task.timerStartedAt) {
    elapsedSec += Math.max(0, Math.floor((Date.now() - task.timerStartedAt.getTime()) / 1000));
  }

  const originalSlot = task.commandeId
    ? await prisma.productionSlot.findFirst({
        where: {
          commandeId: task.commandeId,
          statut: { notIn: ['Annulé', 'Annulée'] },
        },
        orderBy: { endAt: 'desc' },
      })
    : null;

  if (originalSlot) {
    await prisma.productionSlot.update({
      where: { id: originalSlot.id },
      data: {
        notes: [originalSlot.notes, note].filter(Boolean).join('\n').slice(0, 2000),
        statut: originalSlot.statut === 'Terminé' ? originalSlot.statut : 'En cours',
      },
    });
  }

  const slot = await prisma.productionSlot.create({
    data: {
      title: delaySlotTitle(task.title, extraMin),
      productionId: task.productionId,
      commandeId: task.commandeId,
      machine: delayMachineFromTask(task, originalSlot?.machine),
      operateur: originalSlot?.operateur ?? task.assigneeName,
      startAt,
      endAt,
      statut: 'Planifié',
      notes: note,
    },
  });

  const updated = await prisma.metierTask.update({
    where: { id: task.id },
    data: {
      elapsedSec,
      timerStatus: 'paused',
      timerStartedAt: null,
      status: 'En pause',
      lastPausedAt: new Date(),
      problemNote: motif.slice(0, 500),
      delayMotif: motif.slice(0, 500),
      extraMin,
      delayDeclaredAt: new Date(),
      dueDate: startAt,
      estimatedMin: extraMin,
      priorite: task.priorite === 'Basse' ? 'Haute' : task.priorite === 'Normal' ? 'Haute' : task.priorite,
    },
  });

  if (task.commandeId) {
    const cmd = await prisma.commande.findUnique({
      where: { id: task.commandeId },
      select: { id: true, statut: true },
    });
    const terminal = new Set<string>(['Livré', 'Livrée', 'Annulée', 'Terminée', 'Suspendu']);
    if (cmd && !terminal.has(cmd.statut)) {
      await prisma.commande.update({
        where: { id: cmd.id },
        data: { statut: CommandeStatut.En_retard },
      }).catch(() => {});
    }
  }

  const leads = await prisma.user.findMany({
    where: { role: { in: ['admin', 'manager'] } },
    select: { id: true },
    take: 24,
  });
  if (leads.length) {
    await createNotification({
      userIds: leads.map((u) => u.id),
      title: 'Retard de production à replanifier',
      message: `${input.declaredByName || task.assigneeName || 'Opérateur'} · ${task.title} · +${formatExtraHours(extraMin)} · ${motif}`,
      link: '/planning',
      type: 'warning',
      category: 'production',
      resourceType: 'MetierTask',
      resourceId: task.id,
      skipEmail: true,
    }).catch(() => {});
  }

  return { task: updated, slot, extraMin, startAt, endAt };
}
