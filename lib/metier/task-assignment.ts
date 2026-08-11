import { createNotification } from '@/lib/services/notification-service';
import { resolveAssigneeUser } from '@/lib/metier/resolve-assignee';

type TaskRef = {
  id: string;
  title: string;
  commandeId?: string | null;
  assigneeName?: string | null;
};

/** Notifie l'assigné lorsqu'une tâche lui est attribuée (création ou réassignation). */
export async function notifyTaskAssignment(
  task: TaskRef,
  assigneeName: string | null | undefined,
  assignedBy?: string | null,
) {
  const name = assigneeName?.trim();
  if (!name) return;

  const user = await resolveAssigneeUser(name);
  if (!user) return;

  const link = `/equipe/taches?task=${task.id}`;
  await createNotification({
    userId: user.id,
    title: 'Nouvelle tâche assignée',
    message: `${task.title}${assignedBy ? ` — par ${assignedBy}` : ''}`,
    link,
    type: 'info',
    category: 'production',
  });
}

/** Résout assigneeId + assigneeName à partir d'un nom saisi. */
export async function resolveTaskAssignee(name: string | null | undefined) {
  const trimmed = name?.trim() || null;
  if (!trimmed) return { assigneeId: null as string | null, assigneeName: null as string | null };

  const user = await resolveAssigneeUser(trimmed);
  return {
    assigneeId: user?.id ?? null,
    assigneeName: user?.name ?? trimmed,
  };
}
