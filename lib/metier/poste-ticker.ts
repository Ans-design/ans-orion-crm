/** Bandeau Live : tâches du poste (Moi) vs messages destinés à tous. */

import { startOfBusinessDay, zonedParts } from '@/lib/kpi/business-clock';

export type PosteTickerSeverity = 'info' | 'warn' | 'critical';

export type PosteTickerTask = {
  id: string;
  title: string;
  type: string;
  status: string;
  priorite?: string | null;
  dueDate?: Date | string | null;
  timerStatus?: string | null;
  extraMin?: number | null;
  delayMotif?: string | null;
  commande?: { numero?: string | null; article?: string | null } | null;
};

export const BROADCAST_TICKER_TYPES = new Set(['broadcast', 'custom', 'info']);
export const GLOBAL_OPS_TICKER_TYPES = new Set(['machine-down', 'broadcast', 'custom', 'info']);

export function posteStudioHref(taskType: string, role?: string): string {
  if (role === 'conducteur') return '/workspace/conducteur';
  if (role === 'faconnage') return '/workspace/faconnage';
  if (role === 'technicien') return '/workspace/maintenance';
  if (role === 'accueil') return '/workspace/accueil';
  if (role === 'cm') return '/workspace/cm';
  if (role === 'caisse' || role === 'finance') return '/workspace/finance';
  switch (taskType) {
    case 'graphisme':
      return '/workspace/studio';
    case 'finition':
      return '/workspace/faconnage';
    case 'logistique':
      return '/workspace/logistique';
    case 'commercial':
      return '/workspace/commercial';
    default:
      return '/workspace/production';
  }
}

function isOverdue(due?: Date | string | null): boolean {
  if (!due) return false;
  const d = due instanceof Date ? due : new Date(due);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < startOfBusinessDay(new Date()).getTime();
}

function isDueToday(due?: Date | string | null): boolean {
  if (!due) return false;
  const d = due instanceof Date ? due : new Date(due);
  if (Number.isNaN(d.getTime())) return false;
  const a = zonedParts(d);
  const b = zonedParts(new Date());
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

function taskRef(task: PosteTickerTask): string {
  const cmd = task.commande?.numero?.trim();
  const article = task.commande?.article?.trim();
  const extra = [cmd, article].filter(Boolean).join(' · ');
  return extra ? `${task.title} (${extra})` : task.title;
}

export function formatPosteTickerAlert(
  task: PosteTickerTask,
  role?: string,
): {
  id: string;
  type: 'task-mine';
  label: string;
  href: string;
  severity: PosteTickerSeverity;
} {
  const ref = taskRef(task);
  const urgent = task.priorite === 'Urgent' || task.priorite === 'Haute';
  let severity: PosteTickerSeverity = 'info';
  let label = `Moi · ${ref}`;

  if (task.status === 'Bloquée') {
    severity = 'critical';
    label = `Moi · ⛔ Bloquée — ${ref}`;
  } else if (task.extraMin && task.delayMotif) {
    severity = 'warn';
    label = `Moi · ⏰ Suite +${Math.round(task.extraMin / 60)} h demain — ${ref}`;
  } else if (task.timerStatus === 'paused' || task.status === 'En pause') {
    severity = 'warn';
    label = `Moi · ⏸ Pause — ${ref}`;
  } else if (task.timerStatus === 'running' || task.status === 'En cours') {
    severity = urgent ? 'critical' : 'info';
    label = `Moi · ▶ En cours — ${ref}`;
  } else if (isOverdue(task.dueDate)) {
    severity = 'critical';
    label = `Moi · ⏰ Retard — ${ref}`;
  } else if (isDueToday(task.dueDate) || !task.dueDate) {
    severity = urgent ? 'critical' : 'warn';
    label = `Moi · ▶ À faire — ${ref}`;
  } else {
    severity = urgent ? 'warn' : 'info';
    label = `Moi · 📋 Planifié — ${ref}`;
  }

  return {
    id: `task-mine-${task.id}`,
    type: 'task-mine',
    label,
    href: posteStudioHref(task.type, role),
    severity,
  };
}

export function rankPosteTickerTask(task: PosteTickerTask): number {
  if (task.status === 'Bloquée') return 0;
  if (task.timerStatus === 'running' || task.status === 'En cours') return 1;
  if (task.timerStatus === 'paused' || task.status === 'En pause') return 2;
  if (isOverdue(task.dueDate)) return 3;
  if (task.priorite === 'Urgent') return 4;
  if (isDueToday(task.dueDate) || !task.dueDate) return 5;
  return 6;
}

export function formatBroadcastTickerLabel(text: string): string {
  const t = text.trim();
  if (/^(tous|équipe|equipe)\s*[·:]/i.test(t)) return t;
  return `Tous · ${t}`;
}
