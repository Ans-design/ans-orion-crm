import type { CommandeStatut } from '@/lib/data/commande-status';
import { normalizeCommandeStatut } from '@/lib/data/status-registry';

/** Rail unique lisible : création → emballage → livré */
export const COMMANDE_LIFE_RAIL = [
  { id: 'creee', label: 'Créée', shortLabel: 'Créée', panel: 'overview' },
  { id: 'acompte', label: 'Acompte / validée', shortLabel: 'Acompte', panel: 'finance' },
  { id: 'bat', label: 'BAT', shortLabel: 'BAT', panel: 'bat' },
  { id: 'impression', label: 'Impression', shortLabel: 'Print', panel: 'production' },
  { id: 'faconnage', label: 'Façonnage', shortLabel: 'Façonnage', panel: 'production' },
  { id: 'emballage', label: 'Emballage', shortLabel: 'Emballage', panel: 'production' },
  { id: 'prete', label: 'Prête', shortLabel: 'Prête', panel: 'logistique' },
  { id: 'livree', label: 'Livrée', shortLabel: 'Livrée', panel: 'logistique' },
] as const;

export type CommandeLifeRailStepId = (typeof COMMANDE_LIFE_RAIL)[number]['id'];
export type CommandeLifeRailPanel = (typeof COMMANDE_LIFE_RAIL)[number]['panel'];

export type CommandeLifeRailTaskLite = {
  title: string;
  status: string;
};

export type CommandeLifeRailContext = {
  statut: string;
  avancement: number;
  acompte: number;
  total: number;
  reste: number;
  batValides: number;
  totalBat: number;
  hasDossierProduction: boolean;
  qualiteValidee?: boolean;
  hasLivraison?: boolean;
  /** Tâches personnel — source de vérité pour débloquer Impression → Façonnage → … */
  tasks?: CommandeLifeRailTaskLite[];
};

const STATUT_TO_RAIL: Partial<Record<CommandeStatut, CommandeLifeRailStepId>> = {
  'À planifier': 'creee',
  'En attente stock': 'acompte',
  'En production': 'impression',
  'En finition': 'faconnage',
  'Prête': 'prete',
  'Livré': 'livree',
  'En retard': 'impression',
  'Suspendu': 'creee',
  'Annulée': 'creee',
};

function findTask(tasks: CommandeLifeRailTaskLite[], re: RegExp) {
  return tasks.find((t) => re.test(t.title)) ?? null;
}

function isTaskDone(tasks: CommandeLifeRailTaskLite[], re: RegExp): boolean {
  const t = findTask(tasks, re);
  return t?.status === 'Terminée';
}

/**
 * Étape courante du rail.
 * Si des tâches métier existent : déblocage séquentiel (fin Impression → Façonnage apparaît, etc.).
 */
export function resolveLifeRailStepId(ctx: CommandeLifeRailContext): CommandeLifeRailStepId {
  const statut = normalizeCommandeStatut(ctx.statut);
  if (statut === 'Livré' || ctx.hasLivraison) return 'livree';
  if (statut === 'Prête') return 'prete';

  const tasks = (ctx.tasks ?? []).filter((t) => t.status !== 'Annulée');
  if (tasks.length > 0) {
    const acompteOk = ctx.total <= 0 || ctx.acompte > 0;
    if (!acompteOk) return 'acompte';

    const graphDone = isTaskDone(tasks, /graphisme/i);
    const batTask = findTask(tasks, /\bbat\b/i);
    const batDone =
      batTask?.status === 'Terminée'
      || (ctx.totalBat > 0 && ctx.batValides >= ctx.totalBat)
      || (!batTask && graphDone);
    if (!batDone) return 'bat';

    if (!isTaskDone(tasks, /impression/i)) return 'impression';
    if (!isTaskDone(tasks, /fa[cç]onnage/i)) return 'faconnage';

    const cqDone =
      isTaskDone(tasks, /contr[oô]le|qualit/i)
      || Boolean(ctx.qualiteValidee);
    if (!cqDone) return 'emballage';

    // Pipeline atelier terminé → Prête (en attente livraison)
    return 'prete';
  }

  // Fallback sans tâches : statut / avancement (moins précis)
  if (statut === 'En finition' && (ctx.avancement >= 80 || ctx.qualiteValidee)) {
    return 'emballage';
  }
  if (statut === 'En finition') return 'faconnage';

  if (statut === 'En production') {
    // Ne pas sauter Façonnage sans preuve tâche — rester Impression tant qu’avancement < 50
    if (ctx.avancement >= 75) return 'faconnage';
    if (ctx.avancement >= 50) return 'impression';
    return 'impression';
  }

  if (ctx.totalBat > 0 && ctx.batValides < ctx.totalBat) return 'bat';
  if (ctx.total > 0 && ctx.acompte <= 0) return 'acompte';
  if (ctx.total > 0 && ctx.acompte > 0 && ctx.acompte < ctx.total * 0.3 - 1) return 'acompte';

  return STATUT_TO_RAIL[statut] ?? 'creee';
}

/** Étape cliquable si ≤ étape courante (futur = verrouillé / grisé). */
export function isLifeRailStepUnlocked(
  stepId: CommandeLifeRailStepId,
  activeId: CommandeLifeRailStepId,
): boolean {
  return lifeRailStepIndex(stepId) <= lifeRailStepIndex(activeId);
}

export function lifeRailStepIndex(id: CommandeLifeRailStepId): number {
  return COMMANDE_LIFE_RAIL.findIndex((s) => s.id === id);
}

export function getLifeRailStep(id: CommandeLifeRailStepId) {
  return COMMANDE_LIFE_RAIL.find((s) => s.id === id) ?? COMMANDE_LIFE_RAIL[0];
}

/** File liste /commandes */
export type CommandeListBucket = 'a_traiter' | 'en_cours' | 'pretes' | 'livrees' | 'autres';

export function commandeListBucket(statut: string): CommandeListBucket {
  const s = normalizeCommandeStatut(statut);
  if (s === 'Livré') return 'livrees';
  if (s === 'Prête') return 'pretes';
  if (s === 'À planifier' || s === 'En attente stock') return 'a_traiter';
  if (s === 'En production' || s === 'En finition' || s === 'En retard') return 'en_cours';
  return 'autres';
}

export const COMMANDE_LIST_BUCKETS: { id: CommandeListBucket | 'tous'; label: string }[] = [
  { id: 'tous', label: 'Toutes' },
  { id: 'a_traiter', label: 'À traiter' },
  { id: 'en_cours', label: 'En cours' },
  { id: 'pretes', label: 'Prêtes' },
  { id: 'livrees', label: 'Livrées' },
];

export function statutsForListBucket(bucket: CommandeListBucket | 'tous'): string[] | null {
  if (bucket === 'tous') return null;
  if (bucket === 'a_traiter') return ['À planifier', 'En attente stock'];
  if (bucket === 'en_cours') return ['En production', 'En finition', 'En retard'];
  if (bucket === 'pretes') return ['Prête'];
  if (bucket === 'livrees') return ['Livré'];
  return null;
}
