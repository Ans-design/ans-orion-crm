/**
 * Planning Gantt → tâches métier du poste (Mon studio / atelier).
 * Un créneau + opérateurs = une tâche par personne, filtrable mine=1.
 */

import { prisma } from '@/lib/prisma';
import { splitOperatorNames } from '@/lib/planning/planning-pool';
import { resolveTaskAssignee, notifyTaskAssignment } from '@/lib/metier/task-assignment';
import type { TaskType } from '@/lib/constants/metier-task';
import { TASK_TYPES } from '@/lib/constants/metier-task';

export function etapeToTaskType(etapeName: string | null | undefined): TaskType {
  const n = (etapeName || '').toLowerCase();
  if (
    n.includes('graph')
    || n.includes('bat')
    || n.includes('conception')
    || n.includes('fichier')
    || n.includes('prépresse')
    || n.includes('prepresse')
  ) {
    return 'graphisme';
  }
  if (n.includes('façonn') || n.includes('faconn') || n.includes('finition') || n.includes('qualité') || n.includes('qualite')) {
    return 'finition';
  }
  if (n.includes('livr')) return 'logistique';
  if (
    n.includes('devis')
    || n.includes('client')
    || n.includes('commande valid')
    || n.includes('facture')
    || n.includes('paiement')
  ) {
    return 'commercial';
  }
  return 'production';
}

async function fluxTaskType(etapeName: string): Promise<TaskType | null> {
  const { getProductionFluxConfig } = await import('@/lib/services/production-flux-service');
  const config = await getProductionFluxConfig().catch(() => null);
  const step = config?.steps.find(
    (s) => s.name.toLowerCase() === etapeName.toLowerCase() || s.code.toLowerCase() === etapeName.toLowerCase(),
  );
  if (step?.taskType && (TASK_TYPES as readonly string[]).includes(step.taskType)) {
    return step.taskType as TaskType;
  }
  return null;
}

export async function syncPlanningSlotToMetierTasks(slot: {
  id: string;
  title: string;
  commandeId?: string | null;
  machine?: string | null;
  operateur?: string | null;
  startAt: Date;
  endAt: Date;
  assignedBy?: string | null;
}): Promise<number> {
  if (!slot.commandeId) return 0;
  const names = splitOperatorNames(slot.operateur);
  if (names.length === 0) return 0;

  const etape = (slot.machine || '').trim() || 'Atelier';
  const type = (await fluxTaskType(etape)) ?? etapeToTaskType(etape);
  const estimatedMin = Math.max(
    15,
    Math.round((slot.endAt.getTime() - slot.startAt.getTime()) / 60_000),
  );

  let created = 0;
  for (const name of names) {
    const assignee = await resolveTaskAssignee(name);
    const existing = await prisma.metierTask.findFirst({
      where: {
        commandeId: slot.commandeId,
        status: { notIn: ['Annulée'] },
        OR: [
          { title: { contains: etape } },
          { AND: [{ type }, { title: { contains: slot.title.slice(0, 24) } }] },
        ],
        ...(assignee.assigneeId
          ? { assigneeId: assignee.assigneeId }
          : { assigneeName: assignee.assigneeName ?? name }),
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      if (existing.status === 'Terminée') continue;
      await prisma.metierTask.update({
        where: { id: existing.id },
        data: {
          assigneeId: assignee.assigneeId ?? existing.assigneeId,
          assigneeName: assignee.assigneeName ?? existing.assigneeName,
          dueDate: slot.startAt,
          estimatedMin: existing.estimatedMin || estimatedMin,
          type,
        },
      });
      continue;
    }

    const task = await prisma.metierTask.create({
      data: {
        title: `${etape} — ${slot.title}`.slice(0, 200),
        description: `Planifié Gantt · ${etape}`,
        type,
        status: 'À faire',
        priorite: 'Normal',
        commandeId: slot.commandeId,
        assigneeId: assignee.assigneeId,
        assigneeName: assignee.assigneeName ?? name,
        estimatedMin,
        dueDate: slot.startAt,
      },
    });
    created += 1;
    await notifyTaskAssignment(task, assignee.assigneeName ?? name, slot.assignedBy).catch(() => {});
  }
  return created;
}
