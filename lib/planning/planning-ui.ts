/** Surfaces & teintes — Planning Gantt (réf. ANS_Planning_Gantt_Moderne). */

export const PLANNING_SURFACE =
  'rounded-[7px] border border-[#e8edf5] bg-white/95 dark:bg-card dark:border-border shadow-[0_15px_45px_rgba(34,49,82,0.09)]';

export const PLANNING_SURFACE_SOFT =
  'rounded-[7px] border border-[#e9edf5] bg-white/80 dark:bg-card/80 dark:border-border';

/** Secours créneau seul (sans tâches / sans avancement commande). */
export const PLANNING_STATUT_PROGRESS: Record<string, number> = {
  Planifié: 0,
  'En attente': 0,
  'En cours': 50,
  Terminé: 100,
  Terminée: 100,
  Annulé: 0,
};

export type PlanningTaskProgressInput = {
  status: string;
};

/**
 * % réel selon l’état des tâches métier liées à la commande.
 * Terminée=1 · En cours/En pause=0.5 · Bloquée=0.25 · À faire=0 · Annulée ignorée.
 */
export function computeTaskProgressPct(tasks: PlanningTaskProgressInput[]): number | null {
  const usable = tasks.filter((t) => t.status !== 'Annulée');
  if (usable.length === 0) return null;
  let score = 0;
  for (const t of usable) {
    if (t.status === 'Terminée') score += 1;
    else if (t.status === 'En cours' || t.status === 'En pause') score += 0.5;
    else if (t.status === 'Bloquée') score += 0.25;
  }
  return Math.max(0, Math.min(100, Math.round((score / usable.length) * 100)));
}

/** Priorité : tâches > avancement commande > statut créneau. */
export function resolveGanttSlotProgress(input: {
  taskProgress?: number | null;
  commandeAvancement?: number | null;
  slotStatut?: string | null;
}): number {
  if (typeof input.taskProgress === 'number' && Number.isFinite(input.taskProgress)) {
    return Math.max(0, Math.min(100, Math.round(input.taskProgress)));
  }
  if (typeof input.commandeAvancement === 'number' && Number.isFinite(input.commandeAvancement)) {
    return Math.max(0, Math.min(100, Math.round(input.commandeAvancement)));
  }
  const statut = String(input.slotStatut ?? '').trim();
  return PLANNING_STATUT_PROGRESS[statut] ?? 0;
}

export type PlanningGradient = { c1: string; c2: string };

/** Gradients bien séparés (hue) — 1 commande = 1 couleur stable. */
export const PLANNING_COMMANDE_GRADIENTS: PlanningGradient[] = [
  { c1: '#287fb0', c2: '#176f9e' }, // bleu pétrole
  { c1: '#20a776', c2: '#158664' }, // vert
  { c1: '#d58b27', c2: '#a86a18' }, // ambre
  { c1: '#6953e6', c2: '#4d3abe' }, // violet
  { c1: '#2b9b98', c2: '#1a7674' }, // teal
  { c1: '#3b72f2', c2: '#2554c7' }, // bleu vif
  { c1: '#e33e6f', c2: '#c2185b' }, // rose
  { c1: '#ef9a38', c2: '#d97706' }, // orange
  { c1: '#8b59e8', c2: '#6d3cc4' }, // pourpre
  { c1: '#0ea5e9', c2: '#0369a1' }, // ciel
  { c1: '#84cc16', c2: '#4d7c0f' }, // lime
  { c1: '#dd3565', c2: '#9f1239' }, // magenta ANS
  { c1: '#14b8a6', c2: '#0f766e' }, // turquoise
  { c1: '#f59e0b', c2: '#b45309' }, // or
];

function hashKey(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function planningGradientForCommande(
  commandeId?: string | null,
  title?: string,
  slotId?: string,
): PlanningGradient {
  const key =
    (commandeId && commandeId.trim())
    || (title && title.trim())
    || (slotId && slotId.trim())
    || 'default';
  return PLANNING_COMMANDE_GRADIENTS[hashKey(key) % PLANNING_COMMANDE_GRADIENTS.length]!;
}

/** Couleur d’étape (ligne Gantt) — même famille que les barres. */
export function planningGradientForEtape(rowIndex: number): PlanningGradient {
  return PLANNING_COMMANDE_GRADIENTS[Math.abs(rowIndex) % PLANNING_COMMANDE_GRADIENTS.length]!;
}

/** Teintes claires pour la focus card (1 clic). */
export function planningFocusTint(grad: PlanningGradient) {
  return {
    border: `color-mix(in srgb, ${grad.c1} 32%, white)`,
    background: `linear-gradient(100deg, color-mix(in srgb, ${grad.c1} 14%, white), #ffffff)`,
    dot: grad.c1,
    ring: `color-mix(in srgb, ${grad.c1} 22%, white)`,
    track: `color-mix(in srgb, ${grad.c1} 16%, white)`,
    fill: `linear-gradient(90deg, ${grad.c1}, ${grad.c2})`,
    badgeBg: `color-mix(in srgb, ${grad.c1} 12%, white)`,
    badgeFg: grad.c2,
  };
}

/**
 * Teinte carte pool Planning (rail droit) — 1 commande = 1 couleur (comme Gantt),
 * avec boost priorite/statut façon boîte ANS Talk.
 */
export function planningPoolCardTint(
  grad: PlanningGradient,
  opts?: { priorite?: string | null; statut?: string | null; selected?: boolean },
) {
  const base = planningFocusTint(grad);
  const prio = String(opts?.priorite ?? '').toLowerCase();
  const statut = String(opts?.statut ?? '').toLowerCase();
  const urgent = prio.includes('urgent') || prio === 'haute' || statut.includes('retard');
  const waiting =
    statut.includes('planifi') || statut.includes('attente') || statut.includes('à planifier');
  const inProd =
    statut.includes('production') || statut.includes('cours') || statut.includes('impression');

  let mix = opts?.selected ? 18 : urgent ? 16 : waiting ? 10 : inProd ? 12 : 8;
  const background = `linear-gradient(105deg, color-mix(in srgb, ${grad.c1} ${mix}%, white), color-mix(in srgb, ${grad.c1} ${Math.max(3, mix - 6)}%, #ffffff))`;
  const border = opts?.selected
    ? `color-mix(in srgb, ${grad.c1} 48%, white)`
    : `color-mix(in srgb, ${grad.c1} 28%, white)`;

  return {
    ...base,
    background,
    border,
    accent: grad.c1,
    numero: grad.c2,
    chipBg: `color-mix(in srgb, ${grad.c1} 14%, white)`,
    chipFg: grad.c2,
    statutBg: waiting
      ? 'color-mix(in srgb, #d58b27 12%, white)'
      : inProd
        ? 'color-mix(in srgb, #20a776 12%, white)'
        : urgent
          ? 'color-mix(in srgb, #e33e6f 12%, white)'
          : base.badgeBg,
    statutFg: waiting ? '#a86a18' : inProd ? '#158664' : urgent ? '#c2185b' : grad.c2,
  };
}

export function planningBarOpacity(statut: string): number {
  if (statut === 'Annulé') return 0.42;
  if (statut === 'Terminé' || statut === 'Terminée') return 0.75;
  return 1;
}
