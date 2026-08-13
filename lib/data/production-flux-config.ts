/** Configuration workflow Production & Flux — source admin (SystemConfig) */

export const PRODUCTION_FLUX_CONFIG_KEY = 'production-flux-v1';

export const FLUX_STEP_MODULES = [
  'commande',
  'taches',
  'planning',
  'stock',
  'production',
  'livraison',
  'facturation',
  'devis',
  'bat',
] as const;

export type FluxStepModule = (typeof FLUX_STEP_MODULES)[number];

export const FLUX_RESPONSIBLE_ROLES = [
  'commercial',
  'designer',
  'conducteur',
  'production',
  'faconnage',
  'manager',
  'livraison',
  'finance',
  'admin',
] as const;

export type ProductionFluxStep = {
  id: string;
  code: string;
  name: string;
  description: string;
  responsibleRole: string;
  linkedModules: FluxStepModule[];
  targetDelayHours: number;
  active: boolean;
  required: boolean;
  visiblePlanning: boolean;
  generatesTask: boolean;
  requiresValidation: boolean;
  blocksNext: boolean;
  commandeStatut: string | null;
  taskType: string | null;
  planningResource: string | null;
  sortOrder: number;
};

export type ProductionFluxTransition = {
  id: string;
  fromStepId: string;
  toStepId: string;
  condition: string;
  authorizedRole: string;
  mode: 'auto' | 'manual';
  generatesTask: boolean;
  updatesPlanning: boolean;
  active: boolean;
  label: string;
};

export type ProductionFluxRuleLevel = 'info' | 'warning' | 'blocking';

export type ProductionFluxRule = {
  id: string;
  name: string;
  condition: string;
  action: string;
  impactedModule: string;
  level: ProductionFluxRuleLevel;
  active: boolean;
};

export type ProductionFluxConfig = {
  version: number;
  steps: ProductionFluxStep[];
  transitions: ProductionFluxTransition[];
  rules: ProductionFluxRule[];
  updatedAt?: string;
};

export type ProductionFluxSyncJournalEntry = {
  id: string;
  type: 'tasks' | 'planning' | 'simulate' | 'reset';
  at: string;
  summary: string;
  count: number;
  userId?: string | null;
  userName?: string | null;
};

function step(
  partial: Omit<ProductionFluxStep, 'sortOrder'>,
  order: number,
): ProductionFluxStep {
  return { ...partial, sortOrder: order };
}

export const DEFAULT_PRODUCTION_FLUX_STEPS: ProductionFluxStep[] = [
  step({
    id: 'client', code: 'client', name: 'Client', description: 'Prospect ou client identifié',
    responsibleRole: 'commercial', linkedModules: ['commande'], targetDelayHours: 0,
    active: true, required: true, visiblePlanning: false, generatesTask: false,
    requiresValidation: false, blocksNext: false, commandeStatut: null, taskType: null, planningResource: null,
  }, 0),
  step({
    id: 'devis', code: 'devis', name: 'Devis', description: 'Proposition commerciale en cours',
    responsibleRole: 'commercial', linkedModules: ['commande', 'devis'], targetDelayHours: 48,
    active: true, required: true, visiblePlanning: false, generatesTask: false,
    requiresValidation: false, blocksNext: false, commandeStatut: null, taskType: 'commercial', planningResource: null,
  }, 1),
  step({
    id: 'bat', code: 'bat', name: 'BAT', description: 'Bon à tirer studio en préparation',
    responsibleRole: 'designer', linkedModules: ['bat', 'taches'], targetDelayHours: 24,
    active: true, required: true, visiblePlanning: true, generatesTask: true,
    requiresValidation: true, blocksNext: true, commandeStatut: 'À planifier', taskType: 'graphisme', planningResource: 'graphiste',
  }, 2),
  step({
    id: 'commande-validee', code: 'commande-validee', name: 'Commande validée', description: 'Commande confirmée par le client',
    responsibleRole: 'commercial', linkedModules: ['commande', 'taches'], targetDelayHours: 4,
    active: true, required: true, visiblePlanning: false, generatesTask: true,
    requiresValidation: true, blocksNext: false, commandeStatut: 'À planifier', taskType: 'graphisme', planningResource: null,
  }, 3),
  step({
    id: 'stock-reserve', code: 'stock-reserve', name: 'Stock réservé', description: 'Matières réservées pour la commande',
    responsibleRole: 'production', linkedModules: ['stock', 'commande'], targetDelayHours: 8,
    active: true, required: true, visiblePlanning: false, generatesTask: false,
    requiresValidation: true, blocksNext: true, commandeStatut: 'En attente stock', taskType: null, planningResource: null,
  }, 4),
  step({
    id: 'graphisme', code: 'graphisme', name: 'Graphisme', description: 'Préparation graphique et fichiers',
    responsibleRole: 'designer', linkedModules: ['bat', 'taches', 'planning'], targetDelayHours: 24,
    active: true, required: true, visiblePlanning: true, generatesTask: true,
    requiresValidation: false, blocksNext: false, commandeStatut: 'À planifier', taskType: 'graphisme', planningResource: 'graphiste',
  }, 5),
  step({
    id: 'bat-client-valide', code: 'bat-client-valide', name: 'BAT client validé', description: 'Validation client du BAT',
    responsibleRole: 'commercial', linkedModules: ['bat', 'commande'], targetDelayHours: 12,
    active: true, required: true, visiblePlanning: false, generatesTask: false,
    requiresValidation: true, blocksNext: true, commandeStatut: 'À planifier', taskType: null, planningResource: null,
  }, 6),
  step({
    id: 'impression', code: 'impression', name: 'Impression', description: 'Production impression atelier',
    responsibleRole: 'conducteur', linkedModules: ['production', 'planning', 'taches'], targetDelayHours: 16,
    active: true, required: true, visiblePlanning: true, generatesTask: true,
    requiresValidation: true, blocksNext: true, commandeStatut: 'En production', taskType: 'production', planningResource: 'machine',
  }, 7),
  step({
    id: 'faconnage', code: 'faconnage', name: 'Façonnage', description: 'Découpe, pliage, finitions',
    responsibleRole: 'faconnage', linkedModules: ['production', 'planning', 'taches'], targetDelayHours: 12,
    active: true, required: true, visiblePlanning: true, generatesTask: true,
    requiresValidation: false, blocksNext: false, commandeStatut: 'En finition', taskType: 'finition', planningResource: 'faconnage',
  }, 8),
  step({
    id: 'controle-qualite', code: 'controle-qualite', name: 'Contrôle qualité', description: 'Vérification avant expédition',
    responsibleRole: 'manager', linkedModules: ['production', 'commande'], targetDelayHours: 4,
    active: true, required: true, visiblePlanning: false, generatesTask: true,
    requiresValidation: true, blocksNext: true, commandeStatut: 'Prête', taskType: 'finition', planningResource: null,
  }, 9),
  step({
    id: 'livraison', code: 'livraison', name: 'Livraison', description: 'Expédition ou remise client',
    responsibleRole: 'livraison', linkedModules: ['livraison', 'planning', 'taches'], targetDelayHours: 8,
    active: true, required: true, visiblePlanning: true, generatesTask: true,
    requiresValidation: false, blocksNext: false, commandeStatut: 'Livré', taskType: 'logistique', planningResource: 'livreur',
  }, 10),
  step({
    id: 'facture', code: 'facture', name: 'Facture', description: 'Facturation client',
    responsibleRole: 'finance', linkedModules: ['facturation', 'commande'], targetDelayHours: 24,
    active: true, required: true, visiblePlanning: false, generatesTask: false,
    requiresValidation: false, blocksNext: false, commandeStatut: 'Prête', taskType: null, planningResource: null,
  }, 11),
  step({
    id: 'paiement', code: 'paiement', name: 'Paiement', description: 'Encaissement et solde',
    responsibleRole: 'finance', linkedModules: ['facturation'], targetDelayHours: 72,
    active: true, required: true, visiblePlanning: false, generatesTask: false,
    requiresValidation: false, blocksNext: false, commandeStatut: 'Livré', taskType: null, planningResource: null,
  }, 12),
  step({
    id: 'historique-client', code: 'historique-client', name: 'Historique client', description: 'Dossier clôturé et archivé',
    responsibleRole: 'commercial', linkedModules: ['commande'], targetDelayHours: 0,
    active: true, required: false, visiblePlanning: false, generatesTask: false,
    requiresValidation: false, blocksNext: false, commandeStatut: 'Livré', taskType: null, planningResource: null,
  }, 13),
];

export const DEFAULT_PRODUCTION_FLUX_TRANSITIONS: ProductionFluxTransition[] = [
  { id: 't-devis-bat', fromStepId: 'devis', toStepId: 'bat', condition: 'Devis accepté', authorizedRole: 'commercial', mode: 'manual', generatesTask: true, updatesPlanning: false, active: true, label: 'Devis → BAT' },
  { id: 't-bat-cmd', fromStepId: 'bat', toStepId: 'commande-validee', condition: 'BAT prêt', authorizedRole: 'commercial', mode: 'manual', generatesTask: true, updatesPlanning: false, active: true, label: 'BAT → Commande validée' },
  { id: 't-cmd-stock', fromStepId: 'commande-validee', toStepId: 'stock-reserve', condition: 'Commande confirmée', authorizedRole: 'production', mode: 'auto', generatesTask: false, updatesPlanning: false, active: true, label: 'Commande → Stock réservé' },
  { id: 't-stock-graph', fromStepId: 'stock-reserve', toStepId: 'graphisme', condition: 'Stock OK', authorizedRole: 'designer', mode: 'auto', generatesTask: true, updatesPlanning: true, active: true, label: 'Stock → Graphisme' },
  { id: 't-graph-batv', fromStepId: 'graphisme', toStepId: 'bat-client-valide', condition: 'Fichiers prêts', authorizedRole: 'designer', mode: 'manual', generatesTask: false, updatesPlanning: false, active: true, label: 'Graphisme → BAT validé' },
  { id: 't-batv-imp', fromStepId: 'bat-client-valide', toStepId: 'impression', condition: 'BAT client validé', authorizedRole: 'conducteur', mode: 'manual', generatesTask: true, updatesPlanning: true, active: true, label: 'BAT validé → Impression' },
  { id: 't-imp-fac', fromStepId: 'impression', toStepId: 'faconnage', condition: 'Impression terminée', authorizedRole: 'production', mode: 'manual', generatesTask: true, updatesPlanning: true, active: true, label: 'Impression → Façonnage' },
  { id: 't-fac-cq', fromStepId: 'faconnage', toStepId: 'controle-qualite', condition: 'Façonnage terminé', authorizedRole: 'faconnage', mode: 'manual', generatesTask: true, updatesPlanning: false, active: true, label: 'Façonnage → CQ' },
  { id: 't-cq-liv', fromStepId: 'controle-qualite', toStepId: 'livraison', condition: 'CQ validé', authorizedRole: 'livraison', mode: 'manual', generatesTask: true, updatesPlanning: true, active: true, label: 'CQ → Livraison' },
  { id: 't-liv-fac', fromStepId: 'livraison', toStepId: 'facture', condition: 'Livraison effectuée', authorizedRole: 'finance', mode: 'auto', generatesTask: false, updatesPlanning: false, active: true, label: 'Livraison → Facture' },
  { id: 't-fac-pay', fromStepId: 'facture', toStepId: 'paiement', condition: 'Facture émise', authorizedRole: 'finance', mode: 'manual', generatesTask: false, updatesPlanning: false, active: true, label: 'Facture → Paiement' },
  { id: 't-pay-hist', fromStepId: 'paiement', toStepId: 'historique-client', condition: 'Paiement reçu', authorizedRole: 'commercial', mode: 'auto', generatesTask: false, updatesPlanning: false, active: true, label: 'Paiement → Historique' },
];

export const DEFAULT_PRODUCTION_FLUX_RULES: ProductionFluxRule[] = [
  { id: 'r-bat-prod', name: 'BAT requis avant production', condition: 'transition vers impression sans BAT validé', action: 'Bloquer transition', impactedModule: 'production', level: 'blocking', active: true },
  { id: 'r-stock-gf', name: 'Matière liée au stock (grand format)', condition: 'commande grand format sans matière stock', action: 'Statut En attente stock', impactedModule: 'stock', level: 'blocking', active: true },
  { id: 'r-task-graph', name: 'Tâche graphiste auto', condition: 'commande validée', action: 'Créer tâche graphisme', impactedModule: 'taches', level: 'info', active: true },
  { id: 'r-task-imp', name: 'Tâche impression auto', condition: 'BAT client validé', action: 'Créer tâche production', impactedModule: 'taches', level: 'info', active: true },
  { id: 'r-liv-cq', name: 'Livraison après CQ', condition: 'livraison planifiée sans CQ validé', action: 'Bloquer planification', impactedModule: 'livraison', level: 'blocking', active: true },
  { id: 'r-fac-liv', name: 'Facture après livraison', condition: 'facture clôturée sans livraison', action: 'Bloquer clôture', impactedModule: 'facturation', level: 'blocking', active: true },
  { id: 'r-urgent-plan', name: 'Priorité urgente planning', condition: 'commande priorité Urgent', action: 'Remonter créneau planning', impactedModule: 'planning', level: 'warning', active: true },
  { id: 'r-stock-insuf', name: 'Stock insuffisant', condition: 'stock insuffisant détecté', action: 'Statut En attente stock', impactedModule: 'stock', level: 'blocking', active: true },
];

export function buildDefaultProductionFluxConfig(): ProductionFluxConfig {
  return {
    version: 1,
    steps: DEFAULT_PRODUCTION_FLUX_STEPS.map((s) => ({ ...s })),
    transitions: DEFAULT_PRODUCTION_FLUX_TRANSITIONS.map((t) => ({ ...t })),
    rules: DEFAULT_PRODUCTION_FLUX_RULES.map((r) => ({ ...r })),
    updatedAt: new Date().toISOString(),
  };
}

export const DEFAULT_PRODUCTION_FLUX_STEP_IDS = new Set(
  DEFAULT_PRODUCTION_FLUX_STEPS.map((s) => s.id),
);

const ROLE_DEFAULT_TASK_TYPE: Record<string, string> = {
  designer: 'graphisme',
  commercial: 'commercial',
  conducteur: 'production',
  production: 'production',
  faconnage: 'finition',
  livraison: 'logistique',
  finance: 'commercial',
  manager: 'production',
  admin: 'production',
};

/** Nouvelle étape de chaîne → active, visible Gantt, tâche métier. */
export function prepareNewFluxStep(step: ProductionFluxStep): ProductionFluxStep {
  const modules = new Set<FluxStepModule>(
    step.linkedModules.length ? step.linkedModules : ['commande'],
  );
  modules.add('planning');
  modules.add('taches');
  return {
    ...step,
    active: true,
    visiblePlanning: true,
    generatesTask: true,
    linkedModules: [...modules],
    taskType: step.taskType || ROLE_DEFAULT_TASK_TYPE[step.responsibleRole] || 'production',
    planningResource: (step.planningResource || '').trim() || step.code || step.name,
  };
}

/** Étapes custom jamais branchées au Planning : une seule fois (respecte ensuite actif/inactif). */
export function healCustomStepsForPlanning(config: ProductionFluxConfig): {
  config: ProductionFluxConfig;
  changed: boolean;
} {
  let changed = false;
  const steps = config.steps.map((s) => {
    if (DEFAULT_PRODUCTION_FLUX_STEP_IDS.has(s.id)) return s;
    if (s.visiblePlanning || s.linkedModules.includes('planning')) return s;
    changed = true;
    return prepareNewFluxStep(s);
  });
  return { config: changed ? { ...config, steps } : config, changed };
}

export type PlanningFluxEtape = {
  id: string;
  name: string;
  code: string;
  responsibleRole: string;
  targetDelayHours: number;
};

/** Gantt = toute la chaîne Production & Flux (ajout / suppression inclus). */
export function pickPlanningEtapes(steps: ProductionFluxStep[]): PlanningFluxEtape[] {
  return [...steps]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      responsibleRole: s.responsibleRole,
      targetDelayHours: s.targetDelayHours,
    }));
}
