import type { NavBadgeKey } from './nav-badges-shared';
import { UNIVERSE_ICONS } from '@/lib/icons/app-icons';
import type { LucideIcon } from 'lucide-react';

export type UniverseId =
  | 'pilotage'
  | 'commercial'
  | 'production'
  | 'studio'
  | 'stock'
  | 'logistique'
  | 'finance'
  | 'rh'
  | 'communication'
  | 'administration'
  | 'mon_espace';

export type SidebarUniverseDef = {
  id: UniverseId;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  order: number;
  flowLabel?: string;
};

/**
 * Grands univers métier — ordre chronologique du parcours ORION.
 * Admin reste en bas (config SoT, rôle-gated). Mon espace en dernier.
 */
export const SIDEBAR_UNIVERSES: SidebarUniverseDef[] = [
  {
    id: 'pilotage',
    label: 'Pilotage',
    shortLabel: 'Pilot.',
    icon: UNIVERSE_ICONS.pilotage,
    order: 1,
    flowLabel: 'Cockpit → Ops → Rapports → Historique',
  },
  {
    id: 'commercial',
    label: 'Commercial',
    shortLabel: 'Comm.',
    icon: UNIVERSE_ICONS.commercial,
    order: 2,
    flowLabel: 'Client → Catalogue vente → Panier → Devis → Commande → SAV',
  },
  {
    id: 'stock',
    label: 'Stock & Achats',
    shortLabel: 'Stock',
    icon: UNIVERSE_ICONS.stock,
    order: 3,
    flowLabel: 'Stock atelier → Achats → Fournisseurs',
  },
  {
    id: 'studio',
    label: 'Studio & BAT',
    shortLabel: 'Studio',
    icon: UNIVERSE_ICONS.studio,
    order: 4,
    flowLabel: 'Studio → Conception → BAT',
  },
  {
    id: 'production',
    label: 'Production',
    shortLabel: 'Prod.',
    icon: UNIVERSE_ICONS.production,
    order: 5,
    flowLabel: 'GPAO → Planning → Machines → Fabrication → CQ',
  },
  {
    id: 'communication',
    label: 'Communication',
    shortLabel: 'Com.',
    icon: UNIVERSE_ICONS.communication,
    order: 6,
    flowLabel: 'ANS Talk → Relances (pendant & après réalisation)',
  },
  {
    id: 'logistique',
    label: 'Logistique',
    shortLabel: 'Logist.',
    icon: UNIVERSE_ICONS.logistique,
    order: 7,
    flowLabel: 'Préparation → Expédition → Livré',
  },
  {
    id: 'finance',
    label: 'Finance',
    shortLabel: 'Finance',
    icon: UNIVERSE_ICONS.finance,
    order: 8,
    flowLabel: 'Facture → Paiement → Caisse',
  },
  {
    id: 'rh',
    label: 'RH',
    shortLabel: 'RH',
    icon: UNIVERSE_ICONS.rh,
    order: 9,
    flowLabel: 'Employés → Absences → Paie',
  },
  {
    id: 'administration',
    label: 'Administration',
    shortLabel: 'Admin',
    icon: UNIVERSE_ICONS.administration,
    order: 10,
    flowLabel: 'Articles → Prix → Flux → Sync (source de vérité)',
  },
  {
    id: 'mon_espace',
    label: 'Mon espace',
    shortLabel: 'Moi',
    icon: UNIVERSE_ICONS.mon_espace,
    order: 11,
    flowLabel: 'Workspace selon profil',
  },
];

/** Ordre canonique des univers opérationnels sur le hub commande. */
export const COMMANDE_HUB_UNIVERSE_ORDER = [
  'commercial',
  'stock',
  'studio',
  'production',
  'communication',
  'logistique',
  'finance',
] as const;

const UNIVERSE_BY_ID = Object.fromEntries(SIDEBAR_UNIVERSES.map((u) => [u.id, u])) as Record<
  UniverseId,
  SidebarUniverseDef
>;

export function getUniverseDef(id: UniverseId): SidebarUniverseDef {
  return UNIVERSE_BY_ID[id];
}

/** Mapping groupes module-registry → univers */
const GROUP_TO_UNIVERSE: Record<string, UniverseId> = {
  cockpit_direction: 'pilotage',
  rapports_analyse: 'pilotage',
  crm_clients: 'commercial',
  ventes_pos: 'commercial',
  devis_facturation: 'commercial',
  gpao_production: 'production',
  studio_graphique: 'studio',
  stock_achats: 'stock',
  maintenance_technique: 'stock',
  logistique_livraison: 'logistique',
  finance_caisse: 'finance',
  rh_employes: 'rh',
  communication_marketing: 'communication',
  administration_parametres: 'administration',
};

/** Overrides module → univers (flow métier prioritaire sur le group registry) */
const MODULE_TO_UNIVERSE: Partial<Record<string, UniverseId>> = {
  commandes: 'commercial',
  devis: 'commercial',
  historique: 'pilotage',
  rapports: 'pilotage',
  rapports_performance: 'pilotage',
  /** Atelier / pannes — pas magasin */
  machines: 'production',
  maintenance_tickets: 'production',
  /** Parc IT / véhicules — pas machines impression */
  materiels: 'rh',
  ws_accueil: 'mon_espace',
  ws_commercial: 'mon_espace',
  ws_production: 'mon_espace',
  ws_studio: 'mon_espace',
  ws_finance: 'mon_espace',
  ws_cm: 'mon_espace',
  ws_logistique: 'mon_espace',
  ws_magasin: 'mon_espace',
  ws_faconnage: 'mon_espace',
  ws_conducteur: 'mon_espace',
  ws_maintenance: 'mon_espace',
  rh_mon_profil: 'mon_espace',
};

/** Ordre A→Z dans chaque univers */
export const UNIVERSE_MODULE_ORDER: Partial<Record<UniverseId, string[]>> = {
  pilotage: ['cockpit', 'operations', 'rapports', 'rapports_performance', 'historique'],
  commercial: ['clients', 'pos', 'panier', 'devis', 'commandes', 'reclamations'],
  production: [
    'gpao_dossiers',
    'production',
    'planning',
    'equipe_taches',
    'qualite',
    'plan_matiere',
    'machines',
    'maintenance_tickets',
    'ws_production',
    'ws_faconnage',
    'ws_conducteur',
  ],
  studio: [
    'studio_hub',
    'conception',
    'bat',
    'ws_studio',
  ],
  /** Inventaire atelier uniquement — machines/tickets → Production, parc → RH */
  stock: ['stock', 'ws_magasin', 'achats', 'fournisseurs'],
  logistique: ['livraisons', 'ws_logistique'],
  finance: [
    'ws_finance',
    'factures',
    'paiements',
    'finance_charges',
    'finance_couts',
    'finance_fiscalite',
    'finance_ventes_directes',
    'caisse',
  ],
  rh: [
    'rh_employes',
    'rh_recruitment',
    'rh_absences',
    'rh_performance',
    'rh_paie',
    'rh_annonces',
    'materiels',
    'rh_mon_profil',
    'ws_accueil',
  ],
  communication: [
    'equipe_messages',
    'equipe_suggestions',
    'cm_campagnes',
    'cm_relances',
    'cm_notifications',
    'aide',
    'ws_cm',
  ],
  administration: [],
  mon_espace: [
    'ws_accueil',
    'ws_commercial',
    'ws_studio',
    'ws_production',
    'ws_faconnage',
    'ws_conducteur',
    'ws_magasin',
    'ws_logistique',
    'ws_finance',
    'ws_cm',
    'ws_maintenance',
    'rh_mon_profil',
  ],
};

/** Flow commercial — numérotation visuelle 1→6 */
export const COMMERCIAL_FLOW_ORDER = [
  'clients',
  'pos',
  'panier',
  'devis',
  'commandes',
  'reclamations',
] as const;

export const COMMERCIAL_FLOW_STEPS = new Set<string>(COMMERCIAL_FLOW_ORDER);

/** Aliases recherche command palette */
export const MODULE_SEARCH_ALIASES: Record<string, string[]> = {
  clients: ['client', 'crm', 'prospect'],
  pos: ['pos', 'catalogue', 'vente'],
  panier: ['panier', 'offre', 'quote'],
  devis: ['devis', 'quote', 'offre'],
  commandes: ['commande', 'order', 'orders'],
  reclamations: ['réclamation', 'reclamation', 'sav'],
  stock: ['stock', 'inventaire', 'magasin'],
  studio_hub: ['studio', 'briefs', 'fichiers', 'prépresse', 'prepresse'],
  machines: ['machine', 'maintenance', 'équipement', 'equipement'],
  factures: ['facture', 'invoice'],
  paiements: ['paiement', 'payment'],
  production: ['production', 'kanban', 'gpao'],
  gpao_dossiers: ['gpao', 'dossier', 'dossiers'],
  livraisons: ['livraison', 'delivery', 'expédition'],
  equipe_messages: ['talk', 'chat', 'ans talk', 'message'],
  admin_backoffice: ['backoffice', 'admin', 'configuration'],
  parametres: ['paramètres', 'settings', 'config'],
};

export function resolveUniverseForModule(moduleId: string, moduleGroup?: string): UniverseId {
  if (MODULE_TO_UNIVERSE[moduleId]) return MODULE_TO_UNIVERSE[moduleId]!;
  if (moduleId.startsWith('ws_') || moduleId === 'rh_mon_profil') return 'mon_espace';
  if (moduleGroup && GROUP_TO_UNIVERSE[moduleGroup]) return GROUP_TO_UNIVERSE[moduleGroup];
  return 'pilotage';
}

export function sortItemsByUniverseOrder<T extends { id: string }>(
  universeId: UniverseId,
  items: T[],
  fallbackOrder: Map<string, number>,
): T[] {
  const orderList = UNIVERSE_MODULE_ORDER[universeId];
  if (!orderList) {
    return [...items].sort((a, b) => (fallbackOrder.get(a.id) ?? 999) - (fallbackOrder.get(b.id) ?? 999));
  }
  const rank = new Map(orderList.map((id, i) => [id, i]));
  return [...items].sort((a, b) => {
    const ra = rank.has(a.id) ? rank.get(a.id)! : 900 + (fallbackOrder.get(a.id) ?? 0);
    const rb = rank.has(b.id) ? rank.get(b.id)! : 900 + (fallbackOrder.get(b.id) ?? 0);
    return ra - rb;
  });
}

export function getModuleSearchTerms(moduleId: string, label: string): string[] {
  const aliases = MODULE_SEARCH_ALIASES[moduleId] ?? [];
  const universe = MODULE_TO_UNIVERSE[moduleId];
  const universeLabel = universe ? UNIVERSE_BY_ID[universe]?.label : '';
  return [label, moduleId, ...aliases, universeLabel].filter(Boolean);
}

/** Clé badge par module — affiché seulement si count > 0 */
export const MODULE_BADGE_KEYS: Partial<Record<string, NavBadgeKey>> = {
  commandes: 'commandes',
  devis: 'devis',
  reclamations: 'reclamations',
  equipe_messages: 'ansTalk',
  stock: 'stockAlerts',
  equipe_taches: 'tasksOpen',
  livraisons: 'livraisons',
};
