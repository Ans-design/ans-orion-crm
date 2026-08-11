/**
 * Architecture UI/UX Administration — macros sidebar
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ÉDITION FACILE : data/admin-nav-config.json
 * ─────────────────────────────────────────────────────────────────────────────
 * Pour changer un label, une description ou un lien dans la sidebar Admin,
 * ouvrez simplement :
 *
 *   data/admin-nav-config.json
 *
 * Modifiable avec Notepad, VS Code, ou tout éditeur de texte.
 * Syntaxe : chaque champ entre guillemets, suivi de : "valeur"
 * Exemple pour changer le titre "Matières" :
 *   "label": "Matières"  →  "label": "Supports de production"
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Ce fichier .ts contient les icônes et la logique de routage (stable).
 * CPS scindé : Matières + Formules & moteurs (ex-« Catalogue, Prix & Stock »).
 */
import type { AdminBackofficeModuleId } from '@/lib/backoffice/admin-modules';
import type { AdminBackofficeTabId } from '@/lib/server/modules/backoffice-v2/admin-backoffice.types';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  AlertTriangle,
  Boxes,
  Cpu,
  Download,
  FileText,
  FolderTree,
  GitMerge,
  History,
  ImageIcon,
  Layers,
  LayoutDashboard,
  ListChecks,
  MapPin,
  Package,
  RefreshCw,
  Settings,
  Shield,
  Store,
  Tags,
  Tag,
  Truck,
  Users,
  Workflow,
  Gauge,
} from 'lucide-react';
import { BACKOFFICE_BASE_PATH, buildBackofficeUrl } from '@/lib/backoffice/backoffice-url';
import adminNavConfigJson from '@/data/admin-nav-config.json';

/**
 * Visible macros: overview | matieres | prix-articles | formules | production | temps | org.
 * catalog / prices / stock / system = aliases (zéro suppression).
 */
export type AdminMacroId =
  | 'overview'
  | 'matieres'
  | 'prix-articles'
  | 'formules'
  | 'catalog' // legacy alias → résolu via studio / défaut matières
  | 'prices' // legacy alias → matieres
  | 'stock' // legacy alias → matieres
  | 'production'
  | 'temps'
  | 'org'
  | 'system'; // legacy alias → org

export type AdminMicroItem = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  href: string;
  tab?: AdminBackofficeTabId;
  module?: AdminBackofficeModuleId;
  /** Masqué de la nav (deep-link / alias conservés — zéro suppression). */
  hidden?: boolean;
};

export type AdminMacroModule = {
  id: AdminMacroId;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Module backoffice par défaut à l'ouverture d'une micro-page */
  defaultModule: AdminBackofficeModuleId;
  microItems: AdminMicroItem[];
};

const BO = BACKOFFICE_BASE_PATH;
const CPS = '/administration/catalogue-prix-stock';

function bo(tab: AdminBackofficeTabId, module: AdminBackofficeModuleId, extra?: Record<string, string>) {
  return buildBackofficeUrl('', { macro: null, hub: null, tab, module, ...extra });
}

/**
 * Charge les overrides labels/descriptions depuis data/admin-nav-config.json.
 * Permet d'éditer la sidebar Admin sans toucher au code TypeScript.
 */
type NavConfigItem = { id: string; label?: string; description?: string; href?: string };
type NavConfigMacro = { id: string; label?: string; description?: string; items?: NavConfigItem[] };
type NavConfig = { macros?: NavConfigMacro[] };

function loadNavConfig(): NavConfig {
  return (adminNavConfigJson as NavConfig) ?? {};
}

/**
 * Fusionne un tableau de macros avec les overrides JSON.
 * Seuls label et description sont remplacés — les icônes et href restent dans le code.
 */
function applyNavConfigOverrides(macros: AdminMacroModule[]): AdminMacroModule[] {
  const cfg = loadNavConfig();
  if (!cfg.macros?.length) return macros;

  const cfgByMacroId = new Map<string, NavConfigMacro>(cfg.macros.map((m) => [m.id, m]));

  return macros.map((macro) => {
    const cfgMacro = cfgByMacroId.get(macro.id);
    if (!cfgMacro) return macro;

    const cfgItemsById = new Map<string, NavConfigItem>(
      (cfgMacro.items ?? []).map((i) => [i.id, i]),
    );

    return {
      ...macro,
      label: cfgMacro.label ?? macro.label,
      description: cfgMacro.description ?? macro.description,
      microItems: macro.microItems.map((item) => {
        const cfgItem = cfgItemsById.get(item.id);
        if (!cfgItem) return item;
        return {
          ...item,
          label: cfgItem.label ?? item.label,
          description: cfgItem.description ?? item.description,
          // href overridable only for non-computed items (static strings)
          ...(cfgItem.href && typeof item.href === 'string' ? { href: cfgItem.href } : {}),
        };
      }),
    };
  });
}

/** Resolve legacy macro aliases to the visible macro id. */
export function resolveMacroAlias(id: AdminMacroId): AdminMacroId {
  if (id === 'prices' || id === 'stock' || id === 'catalog') return 'matieres';
  if (id === 'system') return 'org';
  return id;
}

/** CPS : studio/tab → entrée sidebar Matières vs Formules & moteurs. */
export function cpsMacroFromSearch(search: string): 'matieres' | 'formules' {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const studio = (params.get('studio') || '').toLowerCase();
  const tab = (params.get('tab') || '').toLowerCase();

  const formulesStudios = new Set([
    'calculs', 'prix', 'articles', 'finitions', 'engines', 'formulas',
  ]);
  const formulesTabs = new Set([
    'engines', 'formulas', 'regles', 'paliers', 'tiers', 'articles', 'catalogue',
    'categories', 'chips', 'finitions', 'dependencies', 'simulation', 'versions',
    'isf', 'flyers', 'carterie', 'publications', 'grand-format', 'avd', 'overview',
  ]);

  if (formulesStudios.has(studio)) return 'formules';
  if (!studio && formulesTabs.has(tab)) return 'formules';
  return 'matieres';
}

const ADMIN_MACRO_MODULES_BASE: AdminMacroModule[] = [
  {
    id: 'overview',
    label: "Vue d'ensemble",
    description: 'Santé catalogue, priorités, écarts POS et supervision Admin',
    icon: LayoutDashboard,
    defaultModule: 'cockpit',
    microItems: [
      {
        id: 'vue-ensemble',
        label: "Vue d'ensemble",
        description: 'Cockpit catalogue (ex-DOMAINES CPS) + supervision Admin.',
        icon: LayoutDashboard,
        href: '/administration/vue-ensemble',
        tab: 'overview',
        module: 'cockpit',
      },
    ],
  },
  {
    id: 'matieres',
    label: 'Matières',
    description: 'Supports bruts : papiers, vinyle, bâche, tissu… utilisés dans les articles complexes (livre, flyer multi-couches, grand format…)',
    icon: Boxes,
    defaultModule: 'stock',
    microItems: [
      {
        id: 'materials',
        label: 'Matières (supports bruts)',
        description: 'Papier intérieur, papier couverture, PCB, PCM, Glossy, vinyle, bâche, tissu… — briques de base des articles composites (livre, flyer, GF).',
        icon: Boxes,
        href: `${CPS}?studio=matieres`,
        module: 'stock',
      },
      {
        id: 'catalogue-prix-stock',
        label: 'Catalogue, Prix & Stock (alias)',
        description: 'Alias historique → matières.',
        icon: Boxes,
        href: CPS,
      },
      {
        id: 'prix-contexte',
        label: 'Matières · Coûts',
        description: 'Deep-link coûts matière (alias).',
        icon: Tags,
        href: `${CPS}?studio=matieres&tab=matieres&view=couts`,
      },
      {
        id: 'stock-achats',
        label: 'Matières · Niveaux config',
        description: 'Config / seuils matières (SoT prix). Inventaire atelier physique → module Stock.',
        icon: Package,
        href: `${CPS}?studio=matieres&tab=matieres&view=stock`,
      },
      {
        id: 'excel-hub',
        label: 'Import / Export Excel',
        description: 'Alias → Matières (Import / Export dans l’en-tête).',
        icon: Download,
        href: `${CPS}?studio=matieres&tab=matieres`,
        hidden: true,
      },
      {
        id: 'anomalies-cps',
        label: 'Anomalies & Doublons',
        description: 'Alias → Matières (diagnostics via en-tête / sync).',
        icon: AlertTriangle,
        href: `${CPS}?studio=matieres&tab=matieres`,
        hidden: true,
      },
      {
        id: 'parametres-formats',
        label: 'Formats papier & faces',
        description: 'PaperFormatRule, SupportFaceRule, vérifier cohérence.',
        icon: Settings,
        href: '/administration/parametres-formats-papier',
      },
      {
        id: 'equivalences-matieres',
        label: 'Équivalences & papier épais',
        description: 'Équivalences matières, règles grammage, collage CC.',
        icon: GitMerge,
        href: '/administration/equivalences-matieres',
      },
      {
        id: 'matieres-vierges',
        label: 'Matières vierges',
        description: 'Prix achat matières sans impression.',
        icon: Package,
        href: '/administration/matieres-vierges',
      },
    ],
  },
  {
    id: 'prix-articles',
    label: 'Articles finis',
    description: 'Articles vendus tels quels : Flyer A5, Carte de visite, T-shirt, Roll-up… — aucune matière à choisir, le produit est complet.',
    icon: Tag,
    defaultModule: 'pricing',
    microItems: [
      {
        id: 'prix-articles',
        label: 'Articles finis',
        description:
          'Produits complets au catalogue POS — Flyer, Carte de visite, T-shirt, Goodies, Roll-up, PLV… Le client choisit les options (format, finition) mais pas la matière brute.',
        icon: Tag,
        href: '/administration/prix-articles',
        module: 'pricing',
      },
      {
        id: 'articles-vente-directe',
        label: 'Articles vente directe (alias)',
        description: 'Alias historique → Articles finis.',
        icon: Store,
        href: '/administration/articles-vente-directe',
        hidden: true,
      },
    ],
  },
  {
    id: 'formules',
    label: 'Formules & moteurs',
    description: 'Moteurs, paliers de remise et constructeur de formules',
    icon: Cpu,
    defaultModule: 'catalogue',
    microItems: [
      {
        id: 'formulas',
        label: 'Formules & moteurs',
        description: 'Galerie moteurs, paliers et constructeur no-code.',
        icon: Cpu,
        href: `${CPS}?studio=calculs&tab=engines`,
        module: 'catalogue',
      },
      {
        id: 'articles-pos',
        label: 'Articles & paliers (alias)',
        description: 'Alias → Formules & moteurs (paliers).',
        icon: ListChecks,
        href: `${CPS}?studio=calculs&tab=engines`,
        module: 'catalogue',
      },
      {
        id: 'apercus-pos',
        label: 'Aperçus POS',
        description: 'Assets preview par article — aperçu local aligné DB / moteurs.',
        icon: ImageIcon,
        href: '/administration/apercus',
      },
      {
        id: 'modeles-articles',
        label: "Modèles d'articles",
        description: 'Templates articles réutilisables — structure, options et publication.',
        icon: FolderTree,
        href: '/administration/modeles-articles',
      },
      {
        id: 'goodies-admin',
        label: 'Goodies',
        description: 'Modèles, techniques, suppléments — sync POS.',
        icon: Store,
        href: '/administration/goodies',
      },
      {
        id: 'textile-admin',
        label: 'Textile',
        description: 'Supports vierges, marquage, main d’œuvre, Lambahoany m².',
        icon: Package,
        href: '/administration/textile',
      },
      {
        id: 'impression-sf',
        label: 'Impression sans finition',
        description: 'Alias — table masquée ; moteurs via Formules.',
        icon: FileText,
        href: '/administration/impression-sf',
      },
    ],
  },
  {
    id: 'production',
    label: 'Production & Flux',
    description: 'Statuts métier, gammes et synchronisation GPAO',
    icon: Activity,
    defaultModule: 'flux',
    microItems: [
      {
        id: 'production-flux',
        label: 'Production & Flux',
        description: 'Workflow unifié : étapes, transitions, règles et synchronisation.',
        icon: Workflow,
        href: '/administration/production-flux',
      },
      {
        id: 'synchronisation',
        label: 'Synchronisation',
        description: 'Centre sync : drift catalogue/prix/POS, resync et diagnostics.',
        icon: RefreshCw,
        href: '/administration/synchronisation',
      },
    ],
  },
  {
    id: 'temps',
    label: 'Temps & capacités',
    description: 'Vitesses moyennes : conception, impression, finitions, CQ — délais fiables.',
    icon: Gauge,
    defaultModule: 'flux',
    microItems: [
      {
        id: 'estimation-temps',
        label: 'Temps & capacités',
        description: 'Vitesses moyennes : conception, impression, finitions, CQ — délais fiables.',
        icon: Gauge,
        href: '/administration/estimation-temps',
      },
    ],
  },
  {
    id: 'org',
    label: 'Organisation',
    description: 'Utilisateurs, rôles, permissions, sites, import/export, audit et paramètres système',
    icon: Users,
    defaultModule: 'users',
    microItems: [
      {
        id: 'roles',
        label: 'Rôles & permissions',
        description: 'Groupes fonctionnels, profils métier et habilitations.',
        icon: Shield,
        href: '/administration/roles-permissions',
      },
      {
        id: 'users',
        label: 'Matrice permissions (legacy)',
        description: 'Matrice modules × rôles × utilisateurs — alias /admin/permissions.',
        icon: Shield,
        href: '/admin/permissions',
      },
      {
        id: 'variables',
        label: 'Variables',
        description: 'Variables de tarification globales (TVA, BAT, coefficients) — source Admin.',
        icon: Layers,
        href: '/administration/variables',
      },
      {
        id: 'permissions',
        label: 'Permissions modules',
        description: 'Habilitations granulaires par fonctionnalité.',
        icon: Settings,
        href: bo('access', 'users'),
        tab: 'access',
        module: 'users',
      },
      {
        id: 'sites',
        label: 'Annexes & sites',
        description: 'Multi-établissements et points de vente.',
        icon: MapPin,
        href: '/admin/annexes',
      },
      {
        id: 'import-export',
        label: 'Import / Export',
        description: 'Migration de données massives CSV/Excel.',
        icon: Download,
        href: buildBackofficeUrl('', { macro: 'org', module: 'import-export', tab: 'versions', hub: null }),
        tab: 'versions',
        module: 'import-export',
      },
      {
        id: 'banners',
        label: 'Bandeaux alertes',
        description: 'Messages de maintenance aux utilisateurs.',
        icon: AlertTriangle,
        href: '/admin/ticker',
      },
      {
        id: 'data-management',
        label: 'Gestion des données',
        description: 'Import, export et maintenance des données métier.',
        icon: Download,
        href: '/administration/data-management',
      },
      {
        id: 'logistique',
        label: 'Logistique & transporteurs',
        description: 'Transporteurs, zones et paramètres livraison.',
        icon: Truck,
        href: '/administration/logistique',
      },
      {
        id: 'anomalies',
        label: 'Anomalies',
        description: 'Console de cohérence prix et catalogue.',
        icon: AlertTriangle,
        href: bo('anomalies', 'audit'),
        tab: 'anomalies',
        module: 'audit',
      },
      {
        id: 'versions',
        label: 'Versions',
        description: 'Historique des publications configuration.',
        icon: History,
        href: bo('versions', 'flux'),
        tab: 'versions',
        module: 'flux',
      },
      {
        id: 'audit',
        label: 'Audit log',
        description: 'Traçabilité légale des actions administrateur.',
        icon: FileText,
        href: bo('audit', 'audit'),
        tab: 'audit',
        module: 'audit',
      },
      {
        id: 'settings',
        label: 'Paramètres POS',
        description: 'Feature flags caisse — TVA / BAT via Variables.',
        icon: Settings,
        href: bo('pos-functions', 'settings'),
        tab: 'pos-functions',
        module: 'settings',
      },
    ],
  },
];

/**
 * Tableau final avec overrides depuis data/admin-nav-config.json.
 * Modifier le JSON suffit pour changer labels/descriptions/ordre des items.
 */
export const ADMIN_MACRO_MODULES: AdminMacroModule[] = applyNavConfigOverrides(
  ADMIN_MACRO_MODULES_BASE,
);

export function macroById(id: AdminMacroId): AdminMacroModule {
  const resolved = resolveMacroAlias(id);
  return ADMIN_MACRO_MODULES.find((m) => m.id === resolved) ?? ADMIN_MACRO_MODULES[0]!;
}

export function macroForModule(moduleId: AdminBackofficeModuleId): AdminMacroId {
  switch (moduleId) {
    case 'cockpit': return 'overview';
    case 'catalogue': return 'formules';
    case 'pricing': return 'formules';
    case 'stock': return 'matieres';
    case 'flux': return 'production';
    case 'users': return 'org';
    case 'import-export':
    case 'audit':
    case 'settings':
      return 'org';
    default:
      return 'overview';
  }
}

export function macroHubUrl(macroId: AdminMacroId): string {
  const id = resolveMacroAlias(macroId);
  if (id === 'matieres') {
    return `${CPS}?studio=matieres`;
  }
  if (id === 'prix-articles') {
    return '/administration/prix-articles';
  }
  if (id === 'formules') {
    return `${CPS}?studio=calculs&tab=engines`;
  }
  if (id === 'overview') {
    return '/administration/vue-ensemble';
  }
  if (id === 'production') {
    return '/administration/production-flux';
  }
  if (id === 'temps') {
    return '/administration/estimation-temps';
  }
  if (id === 'org') {
    return '/administration/roles-permissions';
  }
  return buildBackofficeUrl('', { macro: id, hub: '1', tab: null, module: null, view: null, article: null });
}

export function resolveActiveMicro(
  macro: AdminMacroModule,
  pathname: string,
  search: string,
): AdminMicroItem | null {
  const full = `${pathname}${search ? `?${search}` : ''}`;
  const params = new URLSearchParams(search);
  const tab = params.get('tab');
  const moduleId = params.get('module');

  for (const micro of macro.microItems) {
    if (micro.href.startsWith(BO)) {
      const microQs = micro.href.split('?')[1] ?? '';
      const mp = new URLSearchParams(microQs);
      if (pathname === BO && mp.get('tab') === tab) {
        if (!mp.get('module') || mp.get('module') === moduleId) {
          const viewMatch = !mp.get('view') || mp.get('view') === params.get('view');
          if (viewMatch) return micro;
        }
      }
    } else {
      const hrefPath = micro.href.split('?')[0] ?? micro.href;
      if (pathname !== hrefPath && !pathname.startsWith(`${hrefPath}/`)) continue;
      const hrefQs = micro.href.includes('?') ? micro.href.slice(micro.href.indexOf('?') + 1) : '';
      if (hrefQs) {
        const mp = new URLSearchParams(hrefQs);
        if (mp.has('tab') && mp.get('tab') !== tab) continue;
        return micro;
      }
      // Hub / page sans ?tab= : ne match que si l’URL n’a pas d’onglet (sinon laisser le micro tab)
      if (!tab) return micro;
    }
  }
  if (full.includes(BO) && tab && moduleId) {
    return macro.microItems.find((m) => m.tab === tab && m.module === moduleId) ?? null;
  }
  return null;
}

export type AdminNavBadgeKey =
  | 'catalogue-incomplete'
  | 'pricing-missing'
  | 'stock-unlinked'
  | 'anomalies-critical'
  | 'unpublished';

export type AdminNavBadgeCounts = Partial<Record<AdminNavBadgeKey, number>>;

const MACRO_BADGE_KEYS: Partial<Record<AdminMacroId, AdminNavBadgeKey>> = {
  // Badges = alertes actionnables (pas volumes catalogue).
  // ADM-P2-03 : brancher prix manquants sur Articles finis.
  // ADM-P1-01 : ne pas coller unpublished (brouillons profils) sur overview → 99+ trompeur.
  'prix-articles': 'pricing-missing',
  matieres: 'catalogue-incomplete',
  formules: 'unpublished',
  org: 'anomalies-critical',
  system: 'anomalies-critical',
};

/** Clés agrégées sur le bouton parent « Administration » (hors volume brouillons). */
const ADMIN_UNIVERSE_BADGE_KEYS: readonly AdminNavBadgeKey[] = [
  'pricing-missing',
  'catalogue-incomplete',
  'anomalies-critical',
];

export function macroNavBadge(macroId: AdminMacroId, counts: AdminNavBadgeCounts): number {
  const key = MACRO_BADGE_KEYS[resolveMacroAlias(macroId)] ?? MACRO_BADGE_KEYS[macroId];
  if (!key) return 0;
  const n = counts[key] ?? 0;
  return n > 0 ? n : 0;
}

/** Badge parent univers Admin — alertes métier (prix / catalogue / anomalies), pas drafts. */
export function sumAuthorizedAdminMacroBadges(
  counts: AdminNavBadgeCounts,
  _macros: readonly AdminMacroModule[] = ADMIN_MACRO_MODULES,
): number {
  void _macros;
  let total = 0;
  for (const key of ADMIN_UNIVERSE_BADGE_KEYS) {
    const n = counts[key] ?? 0;
    if (n > 0) total += n;
  }
  return total > 0 ? total : 0;
}

export function resolveMacroNavActive(
  pathname: string,
  search: string,
): { macroId: AdminMacroId; microId?: string } | null {
  const params = new URLSearchParams(search);
  const macroParam = params.get('macro') as AdminMacroId | null;
  if (macroParam) {
    const resolved = resolveMacroAlias(macroParam);
    if (
      ADMIN_MACRO_MODULES.some((m) => m.id === resolved)
      || macroParam === 'stock'
      || macroParam === 'system'
      || macroParam === 'catalog'
      || macroParam === 'prices'
    ) {
      const macro = macroById(resolved);
      if (params.get('hub') === '1' || !params.get('tab')) {
        return { macroId: resolved };
      }
      const micro = resolveActiveMicro(macro, pathname, search);
      return { macroId: resolved, microId: micro?.id };
    }
  }

  if (pathname.startsWith('/administration/backoffice')) {
    const boModule = params.get('module');
    const ids: AdminBackofficeModuleId[] = [
      'cockpit', 'catalogue', 'pricing', 'stock', 'flux', 'users', 'import-export', 'audit', 'settings',
    ];
    if (boModule && ids.includes(boModule as AdminBackofficeModuleId)) {
      const macroId = macroForModule(boModule as AdminBackofficeModuleId);
      const macro = macroById(macroId);
      const micro = resolveActiveMicro(macro, pathname, search);
      return { macroId, microId: micro?.id };
    }
    if (params.get('tab') === 'overview') return { macroId: 'overview', microId: 'vue-ensemble' };
  }

  if (pathname.startsWith('/administration/') || pathname.startsWith('/admin/')) {
    if (
      pathname === '/administration/catalogue-prix-stock'
      || pathname.startsWith('/administration/catalogue-prix-stock/')
      || pathname === '/administration/catalogue-pos'
      || pathname.startsWith('/administration/catalogue-pos/')
      || pathname === '/administration/prix-matieres-stock'
      || pathname.startsWith('/administration/prix-matieres-stock/')
      || pathname === '/administration/matieres'
      || pathname.startsWith('/administration/matieres/')
      || pathname === '/administration/impression-sf'
      || pathname.startsWith('/administration/impression-sf/')
      || pathname === '/administration/parametres-formats-papier'
      || pathname.startsWith('/administration/parametres-formats-papier/')
      || pathname === '/administration/regles-support'
      || pathname.startsWith('/administration/regles-support/')
      || pathname === '/administration/equivalences-matieres'
      || pathname.startsWith('/administration/equivalences-matieres/')
      || pathname === '/administration/matieres-vierges'
      || pathname.startsWith('/administration/matieres-vierges/')
      || pathname === '/administration/base-prix-matieres'
      || pathname.startsWith('/administration/base-prix-matieres/')
      || pathname === '/administration/grand-format-prix'
      || pathname.startsWith('/administration/grand-format-prix/')
      || pathname === '/administration/prix-calculs'
    ) {
      const macroId = cpsMacroFromSearch(search);
      const macro = macroById(macroId);
      const micro = resolveActiveMicro(macro, pathname, search);
      return {
        macroId,
        microId: micro?.id ?? (macroId === 'formules' ? 'formulas' : 'materials'),
      };
    }
    if (pathname === '/administration/vue-ensemble' || pathname.startsWith('/administration/vue-ensemble/')) {
      return { macroId: 'overview', microId: 'vue-ensemble' };
    }
    if (
      pathname === '/administration/prix-articles'
      || pathname.startsWith('/administration/prix-articles/')
      || pathname === '/administration/articles-vente-directe'
      || pathname.startsWith('/administration/articles-vente-directe/')
    ) {
      return { macroId: 'prix-articles', microId: 'prix-articles' };
    }
    if (
      pathname === '/administration/estimation-temps'
      || pathname.startsWith('/administration/estimation-temps/')
    ) {
      return { macroId: 'temps', microId: 'estimation-temps' };
    }
    for (const macro of ADMIN_MACRO_MODULES) {
      const micro = resolveActiveMicro(macro, pathname, search);
      if (micro) return { macroId: macro.id, microId: micro.id };
    }
    return { macroId: 'overview' };
  }

  return null;
}
