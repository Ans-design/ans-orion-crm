/** Retard de prod : créneau Gantt dépassé → motif + rajout de temps. */

import { atBusinessHour } from '@/lib/kpi/business-clock';

export const DELAY_EXTRA_PRESETS_MIN = [30, 60, 120, 180, 240, 360, 480] as const;
export const DELAY_MOTIF_MIN = 10;
export const DELAY_EXTRA_MIN = 30;
export const DELAY_EXTRA_MAX = 480;

export type DelayTaskRef = {
  status: string;
  dueDate?: Date | string | null;
  estimatedMin?: number | null;
  delayDeclaredAt?: Date | string | null;
};

export function plannedEndAt(task: DelayTaskRef): Date | null {
  if (!task.dueDate || !task.estimatedMin || task.estimatedMin <= 0) return null;
  const start = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
  if (Number.isNaN(start.getTime())) return null;
  return new Date(start.getTime() + task.estimatedMin * 60_000);
}

export function needsDelayDeclaration(task: DelayTaskRef, now = Date.now()): boolean {
  if (task.status === 'Terminée' || task.status === 'Annulée') return false;
  const end = plannedEndAt(task);
  if (!end || now <= end.getTime()) return false;
  if (task.delayDeclaredAt) {
    const declared = task.delayDeclaredAt instanceof Date
      ? task.delayDeclaredAt
      : new Date(task.delayDeclaredAt);
    if (!Number.isNaN(declared.getTime()) && declared.getTime() >= new Date(task.dueDate!).getTime()) {
      return false;
    }
  }
  return true;
}

export function nextWorkExtensionWindow(extraMin: number, from = new Date()): { startAt: Date; endAt: Date } {
  const minutes = Math.min(DELAY_EXTRA_MAX, Math.max(DELAY_EXTRA_MIN, Math.round(extraMin)));
  const startAt = atBusinessHour(from, 8, 0, 1);
  const endAt = new Date(startAt.getTime() + minutes * 60_000);
  return { startAt, endAt };
}

export function formatExtraHours(min: number): string {
  const h = min / 60;
  if (Number.isInteger(h)) return `${h} h`;
  return `${h.toFixed(1).replace('.', ',')} h`;
}

export function delaySlotTitle(taskTitle: string, extraMin: number): string {
  return `Suite +${formatExtraHours(extraMin)} — ${taskTitle}`.slice(0, 200);
}

/** Rangée Gantt = nom d’étape Flux, jamais le type métier (graphisme, production…). */
export function delayMachineFromTask(
  task: { title: string; type?: string | null },
  originalMachine?: string | null,
): string | null {
  const fromSlot = originalMachine?.trim();
  if (fromSlot) return fromSlot;
  const head = task.title.split('—')[0]?.trim() || '';
  if (head && head.length > 1 && head.length < 80 && !head.toLowerCase().startsWith('suite')) {
    return head;
  }
  return null;
}

export function validateDelayInput(motif: string, extraMin: number): string | null {
  const m = motif.trim();
  if (m.length < DELAY_MOTIF_MIN) return `Indiquez le motif du retard (${DELAY_MOTIF_MIN} caractères min.)`;
  if (!Number.isFinite(extraMin) || extraMin < DELAY_EXTRA_MIN || extraMin > DELAY_EXTRA_MAX) {
    return `Estimation entre ${DELAY_EXTRA_MIN} min et ${DELAY_EXTRA_MAX / 60} h`;
  }
  return null;
}
