import type { PricingAdminTopTabId } from '@/lib/pricing/pricing-admin-ui';
import { resolveBackofficeRedirect } from '@/lib/administration/backoffice-redirects';

/** Sections URL `/administration/:section` → onglet backoffice */
export const ADMINISTRATION_SECTIONS: Record<
  string,
  { tab: PricingAdminTopTabId; label: string; breadcrumb: string }
> = {
  backoffice: { tab: 'articles', label: 'Backoffice Catalogue & Tarification', breadcrumb: 'Administration / Backoffice Catalogue & Tarification' },
  'vue-ensemble': { tab: 'sante', label: "Vue d'ensemble", breadcrumb: 'Administration / Vue d\'ensemble' },
  'sante-systeme': { tab: 'sante', label: 'Santé système', breadcrumb: 'Administration / Santé système' },
  catalogue: { tab: 'articles', label: 'Catalogue articles', breadcrumb: 'Administration / Catalogue' },
  articles: { tab: 'articles', label: 'Articles', breadcrumb: 'Administration / Articles' },
  'modeles-articles': { tab: 'articles', label: "Modèles d'articles", breadcrumb: 'Administration / Modèles' },
  variables: { tab: 'variables', label: 'Variables', breadcrumb: 'Administration / Variables' },
  options: { tab: 'chips', label: 'Options & finitions', breadcrumb: 'Administration / Options' },
  matieres: { tab: 'matieres', label: 'Matières', breadcrumb: 'Administration / Matières' },
  grammages: { tab: 'matieres', label: 'Grammages', breadcrumb: 'Administration / Grammages' },
  formats: { tab: 'matieres', label: 'Formats', breadcrumb: 'Administration / Formats' },
  laizes: { tab: 'matieres', label: 'Laizes', breadcrumb: 'Administration / Laizes' },
  prix: { tab: 'prix2026', label: 'Articles finis', breadcrumb: 'Administration / Articles finis' },
  formules: { tab: 'prix2026', label: 'Formules & moteurs', breadcrumb: 'Administration / Formules' },
  'production-flux': { tab: 'sante', label: 'Production & Flux', breadcrumb: 'Administration / Production & Flux' },
  'estimation-temps': { tab: 'sante', label: 'Temps & capacités', breadcrumb: 'Administration / Temps & capacités' },
  'regles-metier': { tab: 'anomalies', label: 'Règles métier', breadcrumb: 'Administration / Règles métier' },
  'flux-statuts': { tab: 'sante', label: 'Flux & statuts', breadcrumb: 'Administration / Flux & statuts' },
  stock: { tab: 'matieres', label: 'Stock config', breadcrumb: 'Administration / Stock' },
  'roles-permissions': { tab: 'acces', label: 'Rôles & permissions', breadcrumb: 'Administration / Accès' },
  synchronisation: { tab: 'sante', label: 'Synchronisation', breadcrumb: 'Administration / Sync' },
  'import-export': { tab: 'versions', label: 'Import / Export', breadcrumb: 'Administration / Import-Export' },
  'articles-vente-directe': { tab: 'prix2026', label: 'Articles vente directe', breadcrumb: 'Administration / Articles vente directe' },
  'prix-articles': { tab: 'prix2026', label: 'Articles finis', breadcrumb: 'Administration / Articles finis' },
  'paliers-vente-directe': { tab: 'prix2026', label: 'Paliers vente directe', breadcrumb: 'Administration / Paliers vente directe' },
  goodies: { tab: 'prix2026', label: 'Goodies', breadcrumb: 'Administration / Goodies' },
  textile: { tab: 'prix2026', label: 'Textile', breadcrumb: 'Administration / Textile' },
  'finitions-reliures': { tab: 'prix2026', label: 'Finitions & Reliures', breadcrumb: 'Administration / Finitions' },
  'grand-format-prix': { tab: 'prix2026', label: 'Grand format', breadcrumb: 'Administration / Grand format' },
  'design-graphique': { tab: 'prix2026', label: 'Design graphique', breadcrumb: 'Administration / Design' },
  packaging: { tab: 'prix2026', label: 'Packaging — Boîte', breadcrumb: 'Administration / Packaging' },
  'packaging-sac': {
    tab: 'prix2026',
    label: 'Packaging — Sac en papier',
    breadcrumb: 'Administration / Packaging Sac',
  },
  'packaging-soft': {
    tab: 'prix2026',
    label: 'Packaging soft (Doypack / Étiquette / Gobelet / Hangtag)',
    breadcrumb: 'Administration / Packaging soft',
  },
  'impression-sf': { tab: 'prix2026', label: 'Impression sans finition', breadcrumb: 'Administration / Impression SF' },
  'catalogue-prix-stock': { tab: 'articles', label: 'Catalogue, Prix & Stock', breadcrumb: 'Administration / Catalogue, Prix & Stock' },
  'prix-matieres-stock': { tab: 'matieres', label: 'Catalogue, Prix & Stock', breadcrumb: 'Administration / Catalogue, Prix & Stock' },
  'catalogue-pos': { tab: 'articles', label: 'Catalogue, Prix & Stock', breadcrumb: 'Administration / Catalogue, Prix & Stock' },
  // articles = onglet unifié Articles & Options (ex. catégories + chips)
  'prix-calculs': { tab: 'prix2026', label: 'Prix & Calculs', breadcrumb: 'Administration / Prix & Calculs' },
  'base-prix-matieres': { tab: 'matieres', label: 'Base Prix & Matières', breadcrumb: 'Administration / Base Prix & Matières' },
  'parametres-formats-papier': { tab: 'prix2026', label: 'Paramètres formats papier', breadcrumb: 'Administration / Formats papier' },
  'parametres-impression': { tab: 'prix2026', label: 'Paramètres impression', breadcrumb: 'Administration / Paramètres impression' },
  'carnet-autocopiant': { tab: 'prix2026', label: 'Carnet autocopiant / Facturier', breadcrumb: 'Administration / Carnet autocopiant' },
  'flyer-regles': { tab: 'prix2026', label: 'Flyers — règles de prix', breadcrumb: 'Administration / Flyers' },
  'carterie-regles': { tab: 'prix2026', label: 'Carterie — imposition & prix', breadcrumb: 'Administration / Carterie' },
  'publications-regles': {
    tab: 'prix2026',
    label: 'Livres / Bloc-notes / Calendriers',
    breadcrumb: 'Administration / Publications',
  },
  'tampons': { tab: 'prix2026', label: 'Tampons', breadcrumb: 'Administration / Articles vente directe / Tampons' },
  'photobook': { tab: 'prix2026', label: 'Photobook', breadcrumb: 'Administration / Articles vente directe / Photobook' },
  'tirage-photo': { tab: 'prix2026', label: 'Tirage photo', breadcrumb: 'Administration / Prix & Calculs / Tirage photo' },
  'cadre-photo': { tab: 'prix2026', label: 'Cadre photo', breadcrumb: 'Administration / Prix & Calculs / Cadre photo' },
  'formats-photo': { tab: 'prix2026', label: 'Formats photo', breadcrumb: 'Administration / Prix & Calculs / Formats photo' },
  'equivalences-services': { tab: 'prix2026', label: 'Équivalences services', breadcrumb: 'Administration / Équivalences services' },
  'regles-support': { tab: 'prix2026', label: 'Règles support', breadcrumb: 'Administration / Règles support' },
  'equivalences-matieres': { tab: 'prix2026', label: 'Équivalences matières', breadcrumb: 'Administration / Équivalences' },
  'regles-promo-articles': { tab: 'prix2026', label: 'Règles promotionnelles articles', breadcrumb: 'Administration / Prix & Calculs / Promo articles' },
  'limites-matieres-formats': { tab: 'prix2026', label: 'Limites matières formats', breadcrumb: 'Administration / Prix & Calculs / Limites formats' },
  'matieres-vierges': { tab: 'matieres', label: 'Matières vierges', breadcrumb: 'Administration / Matières vierges' },
  historique: { tab: 'versions', label: 'Historique versions', breadcrumb: 'Administration / Historique' },
  parametres: { tab: 'fonctions', label: 'Paramètres POS', breadcrumb: 'Administration / Paramètres' },
  apercus: { tab: 'apercus', label: 'Aperçus POS', breadcrumb: 'Administration / Aperçus' },
  anomalies: { tab: 'anomalies', label: 'Anomalies', breadcrumb: 'Administration / Anomalies' },
  logistique: { tab: 'sante', label: 'Logistique & transporteurs', breadcrumb: 'Administration / Logistique' },
  'data-management': { tab: 'sante', label: 'Gestion des données', breadcrumb: 'Administration / Data Management' },
};

/** Onglet → section canonique (URL principale) */
export const TAB_TO_ADMIN_SECTION: Record<PricingAdminTopTabId, string> = {
  sante: 'vue-ensemble',
  articles: 'articles',
  apercus: 'apercus',
  chips: 'options',
  matieres: 'matieres',
  prix2026: 'prix',
  variables: 'variables',
  fonctions: 'parametres',
  versions: 'historique',
  acces: 'roles-permissions',
  anomalies: 'anomalies',
};

export const DEFAULT_ADMIN_SECTION = 'vue-ensemble';

export function resolveAdminSection(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_ADMIN_SECTION;
  const slug = raw.toLowerCase().replace(/\/$/, '');
  return slug in ADMINISTRATION_SECTIONS ? slug : DEFAULT_ADMIN_SECTION;
}

export function sectionToTab(section: string): PricingAdminTopTabId {
  return ADMINISTRATION_SECTIONS[section]?.tab ?? ADMINISTRATION_SECTIONS[DEFAULT_ADMIN_SECTION].tab;
}

export function administrationPath(section: string, articleId?: string | null): string {
  const base = `/administration/${resolveAdminSection(section)}`;
  if (articleId && (section === 'articles' || section === 'catalogue' || section === 'backoffice')) {
    return `${base}?article=${encodeURIComponent(articleId)}`;
  }
  return base;
}

export function administrationPathForTab(tab: PricingAdminTopTabId, articleId?: string | null): string {
  const section = TAB_TO_ADMIN_SECTION[tab] ?? DEFAULT_ADMIN_SECTION;
  return administrationPath(section, articleId);
}

export function listAdministrationNavItems(): { slug: string; label: string; tab: PricingAdminTopTabId }[] {
  const seen = new Set<PricingAdminTopTabId>();
  const items: { slug: string; label: string; tab: PricingAdminTopTabId }[] = [];
  for (const [slug, meta] of Object.entries(ADMINISTRATION_SECTIONS)) {
    if (slug === 'sante-systeme' || slug === 'catalogue' || slug === 'grammages' || slug === 'formats' || slug === 'laizes' || slug === 'formules' || slug === 'stock' || slug === 'anomalies' || slug === 'flux-statuts') continue;
    if (seen.has(meta.tab)) continue;
    seen.add(meta.tab);
    items.push({ slug, label: meta.label, tab: meta.tab });
  }
  const dm = ADMINISTRATION_SECTIONS['data-management'];
  const log = ADMINISTRATION_SECTIONS.logistique;
  if (!items.some((i) => i.slug === 'data-management')) {
    items.push({ slug: 'data-management', label: dm.label, tab: dm.tab });
  }
  if (!items.some((i) => i.slug === 'logistique')) {
    items.push({ slug: 'logistique', label: log.label, tab: log.tab });
  }
  return items;
}

/** 11 hubs — regroupe les 26 sections URL sans suppression (alias legacy conservés) */
export type AdministrationHubId =
  | 'overview'
  | 'articles'
  | 'chips'
  | 'materials'
  | 'tiers'
  | 'pricing'
  | 'stock'
  | 'versions'
  | 'access'
  | 'anomalies'
  | 'audit';

export const ADMINISTRATION_HUBS: {
  id: AdministrationHubId;
  label: string;
  tab: PricingAdminTopTabId;
  sections: string[];
}[] = [
  {
    id: 'overview',
    label: "Vue d'ensemble",
    tab: 'sante',
    sections: ['vue-ensemble', 'sante-systeme', 'flux-statuts', 'estimation-temps', 'synchronisation', 'data-management', 'logistique'],
  },
  {
    id: 'articles',
    label: 'Articles & catalogue',
    tab: 'articles',
    sections: ['backoffice', 'catalogue', 'articles', 'modeles-articles'],
  },
  { id: 'chips', label: 'Options & finitions', tab: 'chips', sections: ['options'] },
  {
    id: 'materials',
    label: 'Matières',
    tab: 'matieres',
    sections: ['matieres'],
  },
  { id: 'tiers', label: 'Articles finis & formules', tab: 'prix2026', sections: ['prix', 'formules'] },
  { id: 'pricing', label: 'Variables & calculs', tab: 'variables', sections: ['variables'] },
  { id: 'stock', label: 'Fonctions & aperçus POS', tab: 'fonctions', sections: ['parametres', 'apercus'] },
  { id: 'versions', label: 'Import / export', tab: 'versions', sections: ['import-export'] },
  { id: 'access', label: 'Accès & rôles', tab: 'acces', sections: ['roles-permissions'] },
  { id: 'anomalies', label: 'Anomalies & règles', tab: 'anomalies', sections: ['anomalies', 'regles-metier'] },
  { id: 'audit', label: 'Historique & audit', tab: 'versions', sections: ['historique'] },
];

export function listAdministrationHubs(): typeof ADMINISTRATION_HUBS {
  return ADMINISTRATION_HUBS;
}

export function hubForAdminSection(section: string): (typeof ADMINISTRATION_HUBS)[number] | null {
  const slug = resolveAdminSection(section);
  return ADMINISTRATION_HUBS.find((h) => h.sections.includes(slug)) ?? null;
}

/** Navigation sidebar — 11 hubs avec liens vers backoffice v2 (redirects legacy conservés). */
export function listAdministrationHubNav(): {
  id: AdministrationHubId;
  label: string;
  items: { slug: string; label: string; href: string }[];
}[] {
  return ADMINISTRATION_HUBS.map((hub) => ({
    id: hub.id,
    label: hub.label,
    items: hub.sections.map((slug) => ({
      slug,
      label: ADMINISTRATION_SECTIONS[slug]?.label ?? slug,
      href: resolveBackofficeRedirect(slug) ?? `/administration/${slug}`,
    })),
  }));
}
