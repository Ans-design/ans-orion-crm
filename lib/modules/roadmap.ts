/** Feuille de route réintégration CRM/GPAO — étapes séquentielles */
export type RoadmapStepStatus = 'done' | 'in_progress' | 'pending';

export type RoadmapStep = {
  id: string;
  step: number;
  title: string;
  summary: string;
  status: RoadmapStepStatus;
  modules: string[];
};

export const ORION_ROADMAP: RoadmapStep[] = [
  {
    step: 1,
    id: 'foundation',
    title: 'Architecture modulaire & workspaces',
    summary: 'MODULE_REGISTRY, ROLE_REGISTRY, sidebar Orion, workspaces métier, redirection login',
    status: 'done',
    modules: ['module-registry', 'role-registry', 'workspace/commercial', 'workspace/production', 'workspace/logistique', 'workspace/studio'],
  },
  {
    step: 2,
    id: 'communication',
    title: 'Communication interne équipe',
    summary: 'Messages équipe, fil de discussion, suggestions / idées, votes',
    status: 'done',
    modules: ['messagerie', 'equipe/suggestions'],
  },
  {
    step: 3,
    id: 'tasks',
    title: 'Tâches métiers GPAO',
    summary: 'Tâches liées commandes, assignation, priorité, chronomètre, statuts',
    status: 'done',
    modules: ['equipe/taches', 'production/tasks', 'sync/orion-sync'],
  },
  {
    step: 4,
    id: 'rh',
    title: 'RH & employés',
    summary: 'Fiches employés, présences, congés, annonces internes',
    status: 'done',
    modules: ['rh/employes', 'rh/absences', 'rh/annonces', 'sync/orion-sync'],
  },
  {
    step: 5,
    id: 'finance_adv',
    title: 'Finance avancée',
    summary: 'Charges, coûts de revient, trésorerie, ventes directes stock',
    status: 'done',
    modules: ['finance/charges', 'finance/couts-revient', 'finance/ventes-directes', 'sync/orion-sync'],
  },
  {
    step: 6,
    id: 'gpao_enriched',
    title: 'GPAO enrichie',
    summary: 'Dossier production 16 étapes, contrôle qualité, incidents, temps réel',
    status: 'done',
    modules: ['production/dossiers', 'sync/orion-sync'],
  },
  {
    step: 7,
    id: 'studio_enriched',
    title: 'Studio graphique complet',
    summary: 'Briefs, fichiers source, versions, checklist prépresse',
    status: 'done',
    modules: ['studio/briefs', 'studio/fichiers', 'sync/orion-sync'],
  },
  {
    step: 8,
    id: 'cm_marketing',
    title: 'Communication client / CM',
    summary: 'Campagnes, posts, relances, templates messages',
    status: 'done',
    modules: ['cm/campagnes', 'cm/relances', 'sync/orion-sync'],
  },
  {
    step: 9,
    id: 'multi_site',
    title: 'Multi-annexes & sites',
    summary: 'Annexes AX0/AX1, filtres par site, affectation équipes',
    status: 'done',
    modules: ['admin/annexes', 'sync/orion-sync'],
  },
  {
    step: 10,
    id: 'permissions_admin',
    title: 'Super-admin permissions',
    summary: 'Matrice cocher/décocher modules par rôle et par utilisateur',
    status: 'done',
    modules: ['admin-control/permissions'],
  },
];

export function getRoadmapProgress() {
  const done = ORION_ROADMAP.filter((s) => s.status === 'done').length;
  const total = ORION_ROADMAP.length;
  return { done, total, percent: Math.round((done / total) * 100) };
}
