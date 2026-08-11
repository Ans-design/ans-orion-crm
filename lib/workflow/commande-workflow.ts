import {
  COMMANDE_PRODUCTION_STEPS,
  COMMANDE_STATUTS,
  type CommandeStatut,
} from '@/lib/data/commande-status';

/** Jalons workflow commande — référentiel unique (Phase 1). */
const JALON_IDS = [
  'creee',
  'validation_client',
  'bat_envoye',
  'bat_approuve',
  'en_impression',
  'faconnage',
  'pret_a_livrer',
  'livree',
] as const;

export type CommandeWorkflowJalon = {
  id: string;
  label: string;
  statut: CommandeStatut;
  avancement: number;
};

export const COMMANDE_WORKFLOW_JALONS: CommandeWorkflowJalon[] = [
  { id: JALON_IDS[0], label: 'Commande créée', statut: 'À planifier', avancement: 5 },
  ...COMMANDE_PRODUCTION_STEPS.map((s, i) => ({
    id: JALON_IDS[i + 1]!,
    label: s.label,
    statut: s.statut,
    avancement: s.avancement,
  })),
];

/** Index du jalon courant pour le rail UI (snapshot prioritaire, sinon % avancement). */
export function resolveWorkflowJalonIndex(input: {
  currentJalonId?: string | null;
  progressPercent: number;
}): number {
  const byId = input.currentJalonId
    ? COMMANDE_WORKFLOW_JALONS.findIndex((j) => j.id === input.currentJalonId)
    : -1;
  if (byId >= 0) return byId;

  const pct = Math.max(0, Math.min(100, input.progressPercent));
  let idx = 0;
  for (let i = 0; i < COMMANDE_WORKFLOW_JALONS.length; i++) {
    if (pct >= COMMANDE_WORKFLOW_JALONS[i]!.avancement) idx = i;
  }
  return idx;
}

export type CommandeWorkflowContext = {
  statut: CommandeStatut;
  avancement: number;
  total: number;
  acompte: number;
  reste: number;
  requiredAcompteRatio: number;
  batValides: number;
  totalBat: number;
  fichiersCount: number;
  hasDossierProduction: boolean;
  tachesCount: number;
  qualiteValidee: boolean;
  incidentsOuverts: number;
  stockReady: boolean;
  stockBlockers: string[];
};

const TERMINAL_STATUTS: CommandeStatut[] = ['Livré', 'Annulée'];

/** Transitions autorisées entre statuts commande (défaut code — surchargeable via DB). */
export const COMMANDE_STATUT_TRANSITIONS: Record<CommandeStatut, CommandeStatut[]> = {
  'À planifier': ['En attente stock', 'En production', 'Suspendu', 'Annulée'],
  'En attente stock': ['À planifier', 'En production', 'Suspendu', 'Annulée'],
  'En production': ['En finition', 'En attente stock', 'En retard', 'Suspendu', 'Annulée'],
  'En finition': ['Prête', 'En production', 'En retard', 'Suspendu', 'Annulée'],
  'Prête': ['Livré', 'En finition', 'En retard', 'Suspendu', 'Annulée'],
  'Livré': [],
  'En retard': ['À planifier', 'En production', 'En finition', 'Prête', 'Suspendu', 'Annulée'],
  'Suspendu': ['À planifier', 'En production', 'En attente stock', 'Annulée'],
  'Annulée': [],
};

export type CommandeStatutTransitionMap = Record<CommandeStatut, CommandeStatut[]>;

const AVANCEMENT_BY_STATUT: Record<CommandeStatut, number> = {
  'À planifier': 10,
  'En attente stock': 20,
  'En production': 50,
  'En finition': 75,
  'Prête': 90,
  'Livré': 100,
  'En retard': 40,
  'Suspendu': 0,
  'Annulée': 0,
};

export function getAvancementForStatut(statut: CommandeStatut): number {
  return AVANCEMENT_BY_STATUT[statut] ?? 0;
}

export function getAllowedStatutTransitions(
  from: CommandeStatut,
  transitionsMap: CommandeStatutTransitionMap = COMMANDE_STATUT_TRANSITIONS,
): CommandeStatut[] {
  return transitionsMap[from] ?? [];
}

export function isCommandeStatut(value: string): value is CommandeStatut {
  return (COMMANDE_STATUTS as readonly string[]).includes(value);
}

export function hasMinimumAcompte(ctx: CommandeWorkflowContext, ratio?: number): boolean {
  if (ctx.total <= 0) return true;
  const r = ratio ?? ctx.requiredAcompteRatio ?? 0.3;
  return ctx.acompte >= ctx.total * r - 1;
}

export function hasQualiteValidee(ctx: CommandeWorkflowContext): boolean {
  if (ctx.qualiteValidee) return true;
  return ctx.incidentsOuverts === 0 && ctx.statut === 'Prête';
}

export function hasStockReady(ctx: CommandeWorkflowContext): boolean {
  return ctx.stockReady;
}

/** BAT validé / verrouillé ; si aucun Proof → BAT non requis (pas de dead-end). */
export function hasBatValide(ctx: CommandeWorkflowContext): boolean {
  if (ctx.totalBat === 0) return true;
  return ctx.batValides > 0;
}

export type WorkflowValidationResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export function validateCommandeStatutTransition(
  from: CommandeStatut,
  to: CommandeStatut,
  ctx: CommandeWorkflowContext,
  opts?: { force?: boolean; transitionsMap?: CommandeStatutTransitionMap },
): WorkflowValidationResult {
  const map = opts?.transitionsMap ?? COMMANDE_STATUT_TRANSITIONS;
  if (from === to) return { ok: true };
  if (TERMINAL_STATUTS.includes(from) && to !== from) {
    return { ok: false, code: 'TERMINAL', message: `Statut « ${from} » non modifiable` };
  }
  if (!getAllowedStatutTransitions(from, map).includes(to)) {
    return { ok: false, code: 'INVALID_TRANSITION', message: `Transition ${from} → ${to} non autorisée` };
  }
  if (opts?.force) return { ok: true };

  if (to === 'En production') {
    if (!hasStockReady(ctx)) {
      const detail = ctx.stockBlockers[0] ?? 'Réservation ou disponibilité stock requise';
      return {
        ok: false,
        code: 'STOCK_INSUFFISANT',
        message: `Stock insuffisant — ${detail}`,
      };
    }
    if (!hasMinimumAcompte(ctx)) {
      return {
        ok: false,
        code: 'ACOMPTE_INSUFFISANT',
        message: `Acompte minimum ${Math.round((ctx.requiredAcompteRatio ?? 0.3) * 100)} % requis avant production (ou autorisation direction)`,
      };
    }
    if (!hasBatValide(ctx)) {
      return {
        ok: false,
        code: 'BAT_REQUIS',
        message: 'BAT client validé requis avant lancement production',
      };
    }
  }

  if (to === 'Prête' && !hasQualiteValidee(ctx)) {
    return {
      ok: false,
      code: 'QUALITE_REQUISE',
      message: 'Contrôle qualité GPAO requis avant « Prêt à livrer » (étape Contrôle qualité terminée, sans incident ouvert)',
    };
  }

  // Prête consomme le stock réservé — retour En finition interdit sans force (anti double-consommation)
  if (from === 'Prête' && to === 'En finition' && !opts?.force) {
    return {
      ok: false,
      code: 'STOCK_DEJA_CONSOMME',
      message:
        'Retour « En finition » interdit après « Prête » (stock déjà consommé). Autorisation direction requise.',
    };
  }

  if (to === 'Livré' && ctx.reste > 0 && ctx.total > 0) {
    return {
      ok: false,
      code: 'RESTE_IMPAYE',
      message: 'Solde impayé — encaissement ou accord direction requis avant livraison',
    };
  }

  return { ok: true };
}

export function findJalonById(id: string) {
  return COMMANDE_WORKFLOW_JALONS.find((j) => j.id === id);
}

export function findJalonByLabel(label: string) {
  return COMMANDE_WORKFLOW_JALONS.find((j) => j.label === label);
}

export function getCurrentJalon(ctx: Pick<CommandeWorkflowContext, 'avancement'>) {
  let current = COMMANDE_WORKFLOW_JALONS[0]!;
  for (const j of COMMANDE_WORKFLOW_JALONS) {
    if (ctx.avancement >= j.avancement) current = j;
    else break;
  }
  return current;
}

export function getNextJalon(ctx: Pick<CommandeWorkflowContext, 'avancement'>) {
  return COMMANDE_WORKFLOW_JALONS.find((j) => j.avancement > ctx.avancement) ?? null;
}

export function validateJalonAdvance(
  jalonId: string,
  ctx: CommandeWorkflowContext,
  opts?: { force?: boolean; transitionsMap?: CommandeStatutTransitionMap },
): WorkflowValidationResult {
  const jalon = findJalonById(jalonId);
  if (!jalon) return { ok: false, code: 'JALON_INCONNU', message: 'Jalon workflow inconnu' };
  if (jalon.avancement <= ctx.avancement) {
    return { ok: false, code: 'JALON_DEJA_ATTEINT', message: 'Ce jalon est déjà atteint ou dépassé' };
  }

  const statutCheck = validateCommandeStatutTransition(ctx.statut, jalon.statut, ctx, opts);
  if (!statutCheck.ok) return statutCheck;

  if (!opts?.force && jalon.label === 'BAT approuvé' && !hasBatValide(ctx)) {
    return { ok: false, code: 'BAT_REQUIS', message: 'Validez un BAT avant ce jalon' };
  }
  if (!opts?.force && jalon.label === 'En impression' && !hasMinimumAcompte(ctx)) {
    return { ok: false, code: 'ACOMPTE_INSUFFISANT', message: `Acompte ${Math.round((ctx.requiredAcompteRatio ?? 0.3) * 100)} % requis avant impression` };
  }
  if (!opts?.force && jalon.label === 'En impression' && !hasStockReady(ctx)) {
    return {
      ok: false,
      code: 'STOCK_INSUFFISANT',
      message: ctx.stockBlockers[0] ?? 'Stock non réservé ou insuffisant',
    };
  }
  if (!opts?.force && jalon.label === 'Prêt à livrer' && !hasQualiteValidee(ctx)) {
    return {
      ok: false,
      code: 'QUALITE_REQUISE',
      message: 'Contrôle qualité requis avant expédition',
    };
  }

  return { ok: true };
}

export type CommandeWorkflowSnapshot = {
  currentJalon: CommandeWorkflowJalon;
  nextJalon: CommandeWorkflowJalon | null;
  allowedTransitions: CommandeStatut[];
  blockers: string[];
  progressPercent: number;
};

export function buildCommandeWorkflowSnapshot(
  ctx: CommandeWorkflowContext,
  transitionsMap: CommandeStatutTransitionMap = COMMANDE_STATUT_TRANSITIONS,
): CommandeWorkflowSnapshot {
  const blockers: string[] = [];
  if (!hasMinimumAcompte(ctx)) {
    const minPct = Math.round((ctx.requiredAcompteRatio ?? 0.3) * 100);
    blockers.push(
      `Acompte insuffisant (${Math.round((ctx.acompte / Math.max(ctx.total, 1)) * 100)} % / ${minPct} % min.)`,
    );
  }
  if (!hasBatValide(ctx)) blockers.push('BAT client non validé');
  if (!hasStockReady(ctx) && ctx.stockBlockers.length > 0) {
    blockers.push(...ctx.stockBlockers);
  } else if (!hasStockReady(ctx)) {
    blockers.push('Stock non réservé pour cette commande');
  }
  if (ctx.fichiersCount === 0) blockers.push('Aucun fichier client enregistré');
  if (!ctx.hasDossierProduction) blockers.push('Dossier GPAO non créé');
  if (ctx.tachesCount === 0) blockers.push('Tâches métier non synchronisées');
  if (!hasQualiteValidee(ctx) && ctx.statut !== 'Livré' && ctx.avancement >= 75) {
    blockers.push('Contrôle qualité non validé');
  }
  if (ctx.incidentsOuverts > 0) blockers.push(`${ctx.incidentsOuverts} incident(s) qualité ouvert(s)`);

  const next = getNextJalon(ctx);
  const progressPercent = Math.min(100, Math.max(0, ctx.avancement));

  return {
    currentJalon: getCurrentJalon(ctx),
    nextJalon: next,
    allowedTransitions: getAllowedStatutTransitions(ctx.statut, transitionsMap),
    blockers,
    progressPercent,
  };
}
