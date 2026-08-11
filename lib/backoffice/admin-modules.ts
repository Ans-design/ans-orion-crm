import type { AdminBackofficeTabId } from '@/lib/server/modules/backoffice-v2/admin-backoffice.types';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  AlertTriangle,
  Boxes,
  ClipboardList,
  Database,
  Package,
  Settings,
  Shield,
  Workflow,
} from 'lucide-react';

/** 9 grands modules Admin — une seule sidebar, tabs horizontaux dans le contenu */
export type AdminBackofficeModuleId =
  | 'cockpit'
  | 'catalogue'
  | 'pricing'
  | 'stock'
  | 'flux'
  | 'users'
  | 'import-export'
  | 'audit'
  | 'settings';

export type AdminModuleTabDef = {
  id: AdminBackofficeTabId;
  label: string;
  /** Compteur optionnel (clé overview) */
  badgeKey?: 'anomalies' | 'drafts' | 'materials-draft' | 'unpublished';
};

export type AdminModuleQuickLink = {
  label: string;
  href: string;
};

export type AdminModuleDef = {
  id: AdminBackofficeModuleId;
  label: string;
  description: string;
  icon: LucideIcon;
  tabs: AdminModuleTabDef[];
  defaultTab: AdminBackofficeTabId;
  /** Panneau intégré sans onglet URL dédié */
  embeddedPanel?: 'import-export';
  quickLinks?: AdminModuleQuickLink[];
};

export const ADMIN_BACKOFFICE_MODULES: AdminModuleDef[] = [
  {
    id: 'cockpit',
    label: 'Cockpit Admin',
    description: 'KPI, santé système, alertes et actions rapides',
    icon: Activity,
    tabs: [{ id: 'overview', label: 'Centre de contrôle' }],
    defaultTab: 'overview',
  },
  {
    id: 'catalogue',
    label: 'Catalogue & POS',
    description: 'Articles, options, visibilité et configurateur POS',
    icon: Boxes,
    tabs: [
      { id: 'articles', label: 'Articles' },
      { id: 'chips', label: 'Options / Chips' },
    ],
    defaultTab: 'articles',
    quickLinks: [
      { label: 'Catalogue & POS (Options / Chips)', href: '/administration/catalogue-pos?studio=chips' },
    ],
  },
  {
    id: 'pricing',
    label: 'Base Prix, Matières & Stock',
    description: 'Hub central matières, prix par contexte, stock, règles',
    icon: Package,
    tabs: [
      { id: 'materials', label: 'Matières', badgeKey: 'materials-draft' },
      { id: 'pricing-custom', label: 'Prix & formules' },
      { id: 'tiers', label: 'Paliers / Remises' },
      { id: 'variables', label: 'Variables globales' },
      { id: 'sync', label: 'Synchronisation', badgeKey: 'unpublished' },
      { id: 'prices2026', label: 'PRIX 2026 (archive)' },
    ],
    defaultTab: 'materials',
    quickLinks: [
      { label: 'Hub Base Prix / Matières / Stock', href: '/administration/prix-matieres-stock' },
      { label: 'Prix par contexte', href: '/administration/prix-matieres-stock?tab=prix-contexte' },
      { label: 'Stock & Achats', href: '/administration/prix-matieres-stock?tab=stock' },
      { label: 'Formules legacy', href: '/administration/formules' },
    ],
  },
  {
    id: 'stock',
    label: 'Base Prix (alias Stock)',
    description: 'Alias legacy → même hub Base Prix, Matières & Stock',
    icon: Package,
    tabs: [
      { id: 'materials', label: 'Matières', badgeKey: 'materials-draft' },
      { id: 'sync', label: 'Synchronisation', badgeKey: 'unpublished' },
    ],
    defaultTab: 'materials',
    quickLinks: [
      { label: 'Ouvrir le hub unifié', href: '/administration/prix-matieres-stock' },
      { label: 'Matières', href: '/administration/prix-matieres-stock?tab=matieres' },
      { label: 'Stock & Achats', href: '/administration/prix-matieres-stock?tab=stock' },
    ],
  },
  {
    id: 'flux',
    label: 'Production & Flux',
    description: 'Statuts, versions publiées et flux métier',
    icon: Workflow,
    tabs: [{ id: 'versions', label: 'Versions & historique' }],
    defaultTab: 'versions',
    quickLinks: [
      { label: 'Production & Flux (unifié)', href: '/administration/production-flux' },
    ],
  },
  {
    id: 'users',
    label: 'Utilisateurs & Permissions',
    description: 'Rôles, accès modules et demandes',
    icon: Shield,
    tabs: [{ id: 'access', label: 'Permissions' }],
    defaultTab: 'access',
    quickLinks: [
      { label: 'Rôles & permissions', href: '/administration/roles-permissions' },
    ],
  },
  {
    id: 'import-export',
    label: 'Import / Export',
    description: 'Import CSV/Excel, export filtré et rapports',
    icon: Database,
    tabs: [],
    defaultTab: 'versions',
    embeddedPanel: 'import-export',
    quickLinks: [
      { label: 'Gestion des données', href: '/administration/data-management' },
      { label: 'Historique imports', href: '/administration/historique' },
    ],
  },
  {
    id: 'audit',
    label: 'Audit & Sécurité',
    description: 'Anomalies, journal des modifications et conformité',
    icon: AlertTriangle,
    tabs: [
      { id: 'anomalies', label: 'Anomalies', badgeKey: 'anomalies' },
      { id: 'audit', label: 'Audit log' },
    ],
    defaultTab: 'anomalies',
  },
  {
    id: 'settings',
    label: 'Paramètres',
    description: 'Configuration POS, bandeaux et paramètres système',
    icon: Settings,
    tabs: [{ id: 'pos-functions', label: 'Paramètres POS' }],
    defaultTab: 'pos-functions',
    quickLinks: [
      { label: 'Paramètres administration', href: '/administration/parametres' },
      { label: 'Bandeaux alertes', href: '/administration/vue-ensemble' },
      { label: 'Logistique', href: '/administration/logistique' },
    ],
  },
];

const TAB_LABELS: Record<AdminBackofficeTabId, string> = {
  overview: 'Centre de contrôle',
  articles: 'Articles',
  chips: 'Options / Chips',
  tiers: 'Paliers / Remises',
  'pricing-custom': 'Prix & formules',
  materials: 'Matières',
  prices2026: 'PRIX 2026 (archive)',
  variables: 'Variables globales',
  'pos-functions': 'Paramètres POS',
  versions: 'Versions',
  access: 'Permissions',
  anomalies: 'Anomalies',
  sync: 'Synchronisation',
  audit: 'Audit log',
};

export function moduleForTab(tab: AdminBackofficeTabId): AdminModuleDef {
  const byTab = ADMIN_BACKOFFICE_MODULES.find((m) => m.tabs.some((t) => t.id === tab));
  if (byTab) return byTab;
  if (tab === 'pos-functions') return moduleById('settings');
  return ADMIN_BACKOFFICE_MODULES[0];
}

export function moduleById(id: AdminBackofficeModuleId): AdminModuleDef {
  return ADMIN_BACKOFFICE_MODULES.find((m) => m.id === id) ?? ADMIN_BACKOFFICE_MODULES[0];
}

export function tabLabel(tab: AdminBackofficeTabId): string {
  return TAB_LABELS[tab] ?? tab;
}

export function tabsForModule(moduleId: AdminBackofficeModuleId): AdminModuleTabDef[] {
  return moduleById(moduleId).tabs;
}

/** @deprecated Alias hubs — conservé compat */
export type BackofficeHubDef = AdminModuleDef & { id: AdminBackofficeModuleId | string };
export const ADMIN_BACKOFFICE_HUBS = ADMIN_BACKOFFICE_MODULES;
export function hubForTab(tab: AdminBackofficeTabId) {
  return moduleForTab(tab);
}
export function subTabsForHub(_hubId: string) {
  return [];
}
