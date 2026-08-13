import { prisma } from '@/lib/prisma';
import {
  type TaskStatus,
  type TaskType,
  type TimerAction,
} from '@/lib/constants/metier-task';
import {
  DEFAULT_PRODUCTION_CHECKLIST,
  type MetierTaskCheckItem,
  type MetierTaskComment,
} from '@/lib/metier/task-checklist';
import { notifyTaskAssignment, resolveTaskAssignee } from '@/lib/metier/task-assignment';
import { resolveAssigneeFromRole } from '@/lib/metier/resolve-assignee-from-role';
import { buildTaskEvaluation } from '@/lib/metier/task-evaluation';
import { Prisma } from '@prisma/client';
import { logPosAudit } from '@/lib/pos-audit';

export { TASK_TYPES, TASK_STATUSES, TASK_TYPE_LABELS } from '@/lib/constants/metier-task';

export function getLiveElapsedSec(task: {
  elapsedSec: number;
  timerStartedAt: Date | null;
  timerStatus: string;
}): number {
  if (task.timerStatus !== 'running' || !task.timerStartedAt) return task.elapsedSec;
  const delta = Math.floor((Date.now() - task.timerStartedAt.getTime()) / 1000);
  return task.elapsedSec + Math.max(0, delta);
}

export function formatElapsed(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

type ListFilters = {
  type?: string;
  status?: string;
  commandeId?: string;
  assigneeId?: string;
  mine?: boolean;
  userId?: string;
  userName?: string;
  limit?: number;
};

export async function listMetierTasks(filters: ListFilters = {}) {
  const where: Record<string, unknown> = {};
  if (filters.type && filters.type !== 'tous') where.type = filters.type;
  if (filters.status && filters.status !== 'tous') where.status = filters.status;
  if (filters.commandeId) where.commandeId = filters.commandeId;
  if (filters.mine && (filters.userId || filters.userName)) {
    const or: Record<string, unknown>[] = [];
    if (filters.userId) or.push({ assigneeId: filters.userId });
    if (filters.userName) or.push({ assigneeName: filters.userName });
    where.OR = or;
  } else if (filters.assigneeId) {
    where.assigneeId = filters.assigneeId;
  }

  return prisma.metierTask.findMany({
    where,
    orderBy: [{ priorite: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    take: filters.limit ?? 100,
    include: {
      commande: { select: { id: true, numero: true, article: true, statut: true, clientId: true } },
      production: { select: { id: true, statut: true, avancement: true } },
    },
  });
}

export async function createMetierTask(data: {
  title: string;
  description?: string | null;
  type?: TaskType;
  priorite?: string;
  commandeId?: string | null;
  productionId?: string | null;
  assigneeId?: string | null;
  assigneeName?: string | null;
  assigneeRole?: string | null;
  createdById?: string | null;
  createdByName?: string | null;
  estimatedMin?: number | null;
  dueDate?: Date | null;
}) {
  let assignee = data.assigneeName
    ? await resolveTaskAssignee(data.assigneeName)
    : { assigneeId: data.assigneeId ?? null, assigneeName: data.assigneeName ?? null };

  let autoAssigned = false;
  if (!assignee.assigneeId && data.assigneeRole) {
    const fromRole = await resolveAssigneeFromRole(data.assigneeRole);
    if (fromRole) {
      assignee = fromRole;
      autoAssigned = true;
    }
  }

  const task = await prisma.metierTask.create({
    data: {
      title: data.title.trim(),
      description: data.description?.trim() || null,
      type: data.type ?? 'production',
      priorite: data.priorite ?? 'Normal',
      commandeId: data.commandeId ?? null,
      productionId: data.productionId ?? null,
      assigneeId: assignee.assigneeId,
      assigneeName: assignee.assigneeName,
      assigneeRole: data.assigneeRole ?? null,
      createdById: data.createdById ?? null,
      createdByName: data.createdByName ?? null,
      estimatedMin: data.estimatedMin ?? null,
      dueDate: data.dueDate ?? null,
      checklist: (data.type ?? 'production') === 'production'
        ? DEFAULT_PRODUCTION_CHECKLIST
        : [],
    },
    include: {
      commande: { select: { id: true, numero: true, article: true } },
    },
  });

  if (assignee.assigneeName) {
    await notifyTaskAssignment(task, assignee.assigneeName, data.createdByName).catch(() => {});
  }

  if (autoAssigned && assignee.assigneeId) {
    await logPosAudit({
      userId: data.createdById ?? undefined,
      userName: data.createdByName ?? undefined,
      action: 'TASK_AUTO_ASSIGN',
      entity: 'MetierTask',
      entityId: task.id,
      entityLabel: task.title,
      details: {
        assigneeId: assignee.assigneeId,
        assigneeName: assignee.assigneeName,
        assigneeRole: data.assigneeRole,
        commandeId: data.commandeId,
      },
    }).catch(() => {});
  }

  return task;
}

export async function updateMetierTask(
  id: string,
  data: Partial<{
    title: string;
    description: string | null;
    status: TaskStatus;
    priorite: string;
    assigneeId: string | null;
    assigneeName: string | null;
    assigneeRole: string | null;
    estimatedMin: number | null;
    dueDate: Date | null;
    problemNote: string | null;
    checklist: MetierTaskCheckItem[] | null;
    comments: MetierTaskComment[] | null;
  }>,
) {
  const existing = await prisma.metierTask.findUnique({
    where: { id },
    select: { assigneeName: true, title: true, commandeId: true },
  });
  if (!existing) throw new Error('Tâche introuvable');

  const patch: Record<string, unknown> = { ...data };
  if (data.assigneeName !== undefined) {
    const assignee = await resolveTaskAssignee(data.assigneeName);
    patch.assigneeId = assignee.assigneeId;
    patch.assigneeName = assignee.assigneeName;
  }
  if (data.checklist !== undefined) {
    patch.checklist = data.checklist === null ? Prisma.JsonNull : data.checklist;
  }
  if (data.comments !== undefined) {
    patch.comments = data.comments === null ? Prisma.JsonNull : data.comments;
  }

  const task = await prisma.metierTask.update({
    where: { id },
    data: patch,
    include: {
      commande: { select: { id: true, numero: true, article: true } },
    },
  });

  const newAssignee = data.assigneeName?.trim();
  if (newAssignee && newAssignee !== (existing.assigneeName ?? '')) {
    await notifyTaskAssignment(task, newAssignee).catch(() => {});
  }

  if (data.status !== undefined) {
    await syncCommandeProgressFromPersonnelTasks(existing.commandeId);
  }

  return task;
}

async function accumulateTimer(task: { id: string; elapsedSec: number; timerStartedAt: Date | null; timerStatus: string }) {
  if (task.timerStatus !== 'running' || !task.timerStartedAt) return task.elapsedSec;
  const added = Math.floor((Date.now() - task.timerStartedAt.getTime()) / 1000);
  const elapsedSec = task.elapsedSec + Math.max(0, added);
  await prisma.metierTask.update({
    where: { id: task.id },
    data: { elapsedSec, timerStartedAt: null },
  });
  return elapsedSec;
}

async function syncCommandeProgressFromPersonnelTasks(commandeId: string | null | undefined) {
  if (!commandeId) return;
  const { syncCommandeAvancementFromTasks } = await import(
    '@/lib/services/sync-commande-avancement-from-tasks'
  );
  await syncCommandeAvancementFromTasks(commandeId).catch(() => {});
}

export async function applyTimerAction(
  id: string,
  action: TimerAction,
  problemNote?: string,
  evaluationInput?: {
    quality: number;
    delay: number;
    comment?: string;
    problemEncountered?: string;
    evaluatedBy?: string;
  },
) {
  const task = await prisma.metierTask.findUnique({ where: { id } });
  if (!task) throw new Error('Tâche introuvable');

  let updated;
  switch (action) {
    case 'start': {
      if (task.status === 'Terminée' || task.status === 'Annulée') {
        throw new Error('Tâche déjà clôturée');
      }
      updated = await prisma.metierTask.update({
        where: { id },
        data: {
          timerStartedAt: new Date(),
          timerStatus: 'running',
          status: 'En cours',
        },
      });
      break;
    }
    case 'pause': {
      const elapsedSec = await accumulateTimer(task);
      updated = await prisma.metierTask.update({
        where: { id },
        data: {
          elapsedSec,
          timerStatus: 'paused',
          status: 'En pause',
          lastPausedAt: new Date(),
          pauseCount: { increment: 1 },
        },
      });
      break;
    }
    case 'resume': {
      if (task.status === 'Terminée') throw new Error('Tâche terminée');
      let pauseSec = task.pauseSec ?? 0;
      if (task.lastPausedAt) {
        pauseSec += Math.max(0, Math.floor((Date.now() - task.lastPausedAt.getTime()) / 1000));
      }
      updated = await prisma.metierTask.update({
        where: { id },
        data: {
          timerStartedAt: new Date(),
          timerStatus: 'running',
          status: 'En cours',
          pauseSec,
          lastPausedAt: null,
        },
      });
      break;
    }
    case 'finish': {
      const elapsedSec = await accumulateTimer(task);
      let pauseSec = task.pauseSec ?? 0;
      if (task.timerStatus === 'paused' && task.lastPausedAt) {
        pauseSec += Math.max(0, Math.floor((Date.now() - task.lastPausedAt.getTime()) / 1000));
      }
      const patch: Record<string, unknown> = {
        elapsedSec,
        pauseSec,
        lastPausedAt: null,
        timerStatus: 'idle',
        timerStartedAt: null,
        status: 'Terminée',
        completedAt: new Date(),
      };
      if (evaluationInput && evaluationInput.evaluatedBy) {
        patch.evaluation = buildTaskEvaluation(evaluationInput, evaluationInput.evaluatedBy);
      }
      updated = await prisma.metierTask.update({ where: { id }, data: patch });
      break;
    }
    case 'problem': {
      const elapsedSec = task.timerStatus === 'running' ? await accumulateTimer(task) : task.elapsedSec;
      updated = await prisma.metierTask.update({
        where: { id },
        data: {
          elapsedSec,
          timerStatus: 'paused',
          timerStartedAt: null,
          status: 'Bloquée',
          problemNote: problemNote?.trim() || task.problemNote,
        },
      });
      if (task.commandeId) {
        const { onMetierTaskBloquee } = await import('@/lib/services/sav-auto-service');
        await onMetierTaskBloquee(task.commandeId, task.title, problemNote).catch(() => {});
      }
      break;
    }
    default:
      throw new Error('Action chronomètre invalide');
  }

  await syncCommandeProgressFromPersonnelTasks(task.commandeId);
  return updated;
}

export async function getMetierTaskStats(filters?: { type?: TaskType; assigneeId?: string }) {
  const base: Record<string, unknown> = {};
  if (filters?.type) base.type = filters.type;
  if (filters?.assigneeId) base.assigneeId = filters.assigneeId;

  const openStatuses = ['À faire', 'En cours', 'En pause', 'Bloquée'];

  const [totalOpen, blocked, todayDue, byType] = await Promise.all([
    prisma.metierTask.count({ where: { ...base, status: { in: openStatuses } } }),
    prisma.metierTask.count({ where: { ...base, status: 'Bloquée' } }),
    prisma.metierTask.count({
      where: {
        ...base,
        status: { in: openStatuses },
        dueDate: { lte: new Date(new Date().setHours(23, 59, 59, 999)) },
      },
    }),
    prisma.metierTask.groupBy({
      by: ['type'],
      where: { status: { in: openStatuses } },
      _count: true,
    }),
  ]);

  return {
    totalOpen,
    blocked,
    todayDue,
    byType: Object.fromEntries(byType.map((b) => [b.type, b._count])),
  };
}

export async function getMetierTaskKpis(limit = 8) {
  const { aggregateTaskKpis } = await import('@/lib/metier/task-evaluation');
  const tasks = await prisma.metierTask.findMany({
    where: { status: 'Terminée' },
    select: {
      assigneeName: true,
      status: true,
      elapsedSec: true,
      estimatedMin: true,
      evaluation: true,
    },
    take: 500,
    orderBy: { completedAt: 'desc' },
  });
  return aggregateTaskKpis(tasks).slice(0, limit);
}

export async function getDailyTaskResume(assigneeId?: string, assigneeName?: string) {
  const { derivePosteLabels } = await import('@/lib/metier/poste-labels');
  const { startOfBusinessDay, addBusinessDays } = await import('@/lib/kpi/business-clock');
  const start = startOfBusinessDay(new Date());
  const end = addBusinessDays(start, 1);

  const mineFilter =
    assigneeId || assigneeName
      ? {
          OR: [
            ...(assigneeId ? [{ assigneeId }] : []),
            ...(assigneeName ? [{ assigneeName }] : []),
          ],
        }
      : {};

  const tasks = await prisma.metierTask.findMany({
    where: {
      AND: [
        mineFilter,
        {
          OR: [
            { timerStartedAt: { gte: start, lt: end } },
            { lastPausedAt: { gte: start, lt: end } },
            { completedAt: { gte: start, lt: end } },
            { dueDate: { gte: start, lt: end } },
            { status: { in: ['En cours', 'En pause'] } },
          ],
        },
      ],
    },
    select: {
      assigneeId: true,
      assigneeName: true,
      elapsedSec: true,
      pauseSec: true,
      pauseCount: true,
      estimatedMin: true,
      status: true,
      timerStatus: true,
      completedAt: true,
    },
  }).catch(() => []);

  const byName = new Map<string, typeof tasks>();
  for (const t of tasks) {
    const key = t.assigneeName || t.assigneeId || '—';
    const list = byName.get(key) ?? [];
    list.push(t);
    byName.set(key, list);
  }

  return [...byName.entries()].map(([assigneeName, list]) => {
    const workSec = list.reduce((s, t) => s + (t.elapsedSec || 0), 0);
    const pauseSec = list.reduce((s, t) => s + (t.pauseSec || 0), 0);
    const pauseCount = list.reduce((s, t) => s + (t.pauseCount || 0), 0);
    const estimatedSec = list.reduce((s, t) => s + (t.estimatedMin || 0) * 60, 0) || null;
    const openCount = list.filter((t) => !['Terminée', 'Annulée'].includes(t.status)).length;
    const finishedToday = list.filter(
      (t) => t.status === 'Terminée' && t.completedAt && t.completedAt >= start,
    ).length;
    const running = list.some((t) => t.timerStatus === 'running');
    return {
      assigneeName,
      workSec,
      pauseSec,
      pauseCount,
      openCount,
      finishedToday,
      labels: derivePosteLabels({
        workSec,
        pauseSec,
        pauseCount,
        estimatedSec,
        openCount,
        finishedToday,
        running,
      }),
    };
  });
}
