/**
 * Pool Commandes ↔ Gantt : exclusivité du jour, durée restante, format.
 * Durées sources = étapes Production & Flux (targetDelayHours).
 */

export const PLANNING_DEFAULT_DURATION_MIN = 180;
export const PLANNING_MIN_SLOT_MIN = 15;

const ACTIVE_SLOT = new Set(['Planifié', 'En cours', 'En attente']);
const CONSUMED_SLOT = new Set(['Planifié', 'En cours', 'En attente', 'Terminé', 'Terminée']);

export function slotDurationMinutes(startAt: string | Date, endAt: string | Date): number {
  const a = new Date(startAt).getTime();
  const b = new Date(endAt).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
  return Math.max(0, Math.round((b - a) / 60_000));
}

export function isActivePlanningStatut(statut: string | null | undefined): boolean {
  return ACTIVE_SLOT.has(String(statut || 'Planifié'));
}

export function isConsumedPlanningStatut(statut: string | null | undefined): boolean {
  const s = String(statut || '');
  if (s === 'Annulé' || s === 'Annulée') return false;
  return CONSUMED_SLOT.has(s) || isActivePlanningStatut(s);
}

export function sameDayLocal(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function etapeDurationMinutes(targetDelayHours: number | null | undefined): number {
  const h = Number(targetDelayHours);
  if (!Number.isFinite(h) || h <= 0) return PLANNING_DEFAULT_DURATION_MIN;
  return Math.max(PLANNING_MIN_SLOT_MIN, Math.round(h * 60));
}

export type PoolSlot = {
  id: string;
  commandeId?: string | null;
  machine?: string | null;
  startAt: string;
  endAt: string;
  statut: string;
};

export type PoolEtape = {
  name: string;
  targetDelayHours: number;
};

/** Estimation pour une commande : étape ciblée, sinon défaut atelier (3 h). */
export function estimateCommandeMinutes(
  etapes: PoolEtape[],
  preferredEtape?: string | null,
): number {
  if (preferredEtape) {
    const hit = etapes.find((e) => e.name === preferredEtape);
    if (hit) return etapeDurationMinutes(hit.targetDelayHours);
  }
  return PLANNING_DEFAULT_DURATION_MIN;
}

/** Minutes déjà consommées (planifiées / terminées, hors annulé). */
export function plannedMinutesForCommande(slots: PoolSlot[], commandeId: string): number {
  return slots
    .filter((s) => s.commandeId === commandeId && isConsumedPlanningStatut(s.statut))
    .reduce((sum, s) => sum + slotDurationMinutes(s.startAt, s.endAt), 0);
}

export function remainingMinutesForCommande(
  slots: PoolSlot[],
  commandeId: string,
  estimatedMin: number,
): number {
  return Math.max(0, estimatedMin - plannedMinutesForCommande(slots, commandeId));
}

/** Minutes restantes pour une étape (durée admin − créneaux déjà posés sur cette étape). */
export function remainingForEtape(
  slots: PoolSlot[],
  commandeId: string,
  etapeName: string,
  targetDelayHours: number,
): number {
  const est = etapeDurationMinutes(targetDelayHours);
  const used = slots
    .filter(
      (s) =>
        s.commandeId === commandeId
        && s.machine === etapeName
        && isConsumedPlanningStatut(s.statut),
    )
    .reduce((sum, s) => sum + slotDurationMinutes(s.startAt, s.endAt), 0);
  return Math.max(0, est - used);
}

/** Durée restante affichée / pool : défaut si jamais planifié, sinon reste des étapes déjà utilisées. */
export function maxRemainingAcrossEtapes(
  slots: PoolSlot[],
  commandeId: string,
  etapes: PoolEtape[],
): number {
  const cmdSlots = slots.filter(
    (s) => s.commandeId === commandeId && isConsumedPlanningStatut(s.statut),
  );
  if (cmdSlots.length === 0) {
    return PLANNING_DEFAULT_DURATION_MIN;
  }

  const machines = [
    ...new Set(cmdSlots.map((s) => s.machine).filter((m): m is string => Boolean(m))),
  ];
  let max = 0;
  for (const machine of machines) {
    const meta = etapes.find((e) => e.name === machine);
    if (meta) {
      max = Math.max(max, remainingForEtape(slots, commandeId, machine, meta.targetDelayHours));
    } else {
      const used = cmdSlots
        .filter((s) => s.machine === machine)
        .reduce((sum, s) => sum + slotDurationMinutes(s.startAt, s.endAt), 0);
      max = Math.max(max, Math.max(0, PLANNING_DEFAULT_DURATION_MIN - used));
    }
  }

  const orphanUsed = cmdSlots
    .filter((s) => !s.machine)
    .reduce((sum, s) => sum + slotDurationMinutes(s.startAt, s.endAt), 0);
  if (orphanUsed > 0) {
    max = Math.max(max, Math.max(0, PLANNING_DEFAULT_DURATION_MIN - orphanUsed));
  }

  return Math.max(0, max);
}

/** Créneau actif sur le jour affiché → commande hors sidebar (exclusivité). */
export function hasActiveSlotOnDay(
  slots: PoolSlot[],
  commandeId: string,
  day: Date,
): boolean {
  return slots.some(
    (s) =>
      s.commandeId === commandeId
      && isActivePlanningStatut(s.statut)
      && sameDayLocal(new Date(s.startAt), day),
  );
}

export function isStandbyCommande(statut: string | null | undefined): boolean {
  const s = (statut || '').toLowerCase();
  return (
    s.includes('standby')
    || s.includes('stand-by')
    || s.includes('stand by')
    || s.includes('bloqu')
    || s.includes('pause')
  );
}

/**
 * Visible dans le pool Commandes :
 * - durée restante > 0
 * - et pas déjà sur le Gantt du jour (sauf standby → forcé visible)
 */
export function isInCommandePool(opts: {
  commandeId: string;
  statut: string;
  slots: PoolSlot[];
  day: Date;
  remainingMin: number;
}): boolean {
  if (opts.remainingMin <= 0) return false;
  if (isStandbyCommande(opts.statut)) return true;
  return !hasActiveSlotOnDay(opts.slots, opts.commandeId, opts.day);
}

export function formatDurationFr(totalMin: number): string {
  const m = Math.max(0, Math.round(totalMin));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (rest === 0) return `${h} h`;
  return `${h} h ${rest.toString().padStart(2, '0')}`;
}

/** Cap la durée selon le shift actif (jour → 17h, nuit → 08h j+1). */
export function cappedEndIso(
  startAt: string,
  durationMin: number,
  shift: 'day' | 'night' = 'day',
): string {
  const start = new Date(startAt);
  const endCap = new Date(start);
  if (shift === 'day') {
    endCap.setHours(17, 0, 0, 0);
  } else if (start.getHours() < 8) {
    endCap.setHours(8, 0, 0, 0);
  } else {
    endCap.setDate(endCap.getDate() + 1);
    endCap.setHours(8, 0, 0, 0);
  }
  const wanted = new Date(start.getTime() + Math.max(PLANNING_MIN_SLOT_MIN, durationMin) * 60_000);
  const end = wanted.getTime() <= endCap.getTime() ? wanted : endCap;
  if (end.getTime() <= start.getTime()) {
    return new Date(start.getTime() + PLANNING_MIN_SLOT_MIN * 60_000).toISOString();
  }
  return end.toISOString();
}

export function hoursFromMinutes(min: number): number {
  return Math.max(PLANNING_MIN_SLOT_MIN / 60, min / 60);
}
