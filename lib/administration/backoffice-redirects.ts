/**
 * Redirections legacy Administration → Backoffice v2 unifié.
 * Zéro suppression de routes — redirection uniquement.
 */
import { macroForModule } from '@/lib/administration/admin-macro-modules';
import type { AdminBackofficeModuleId } from '@/lib/backoffice/admin-modules';

function boUrl(tab: string, module: AdminBackofficeModuleId, extra?: Record<string, string>): string {
  const macro = macroForModule(module);
  const qs = new URLSearchParams({
    macro,
    module,
    tab,
    ...extra,
  });
  return `/administration/backoffice?${qs.toString()}`;
}

const SECTION_TO_BACKOFFICE: Record<string, string> = {
  'vue-ensemble': '/administration/vue-ensemble',
  'sante-systeme': '/administration/vue-ensemble',
  catalogue: '/administration/catalogue-prix-stock?tab=catalogue&studio=chips',
  articles: '/administration/catalogue-prix-stock?tab=catalogue&studio=chips',
  /** CRUD PricingVariable global — page dédiée (studio chips catalogue inchangé). */
  variables: '/administration/variables',
  options: '/administration/catalogue-prix-stock?tab=catalogue&studio=chips',
  matieres: '/administration/matieres',
  grammages: '/administration/matieres?view=declinaisons&type=grammage',
  formats: '/administration/matieres?view=declinaisons&type=format',
  laizes: '/administration/matieres?view=declinaisons&type=laize',
  stock: '/administration/matieres?view=stock',
  prix: boUrl('pricing-custom', 'pricing'),
  formules: boUrl('pricing-custom', 'pricing'),
  'regles-metier': '/administration/production-flux',
  synchronisation: '/administration/synchronisation',
  'flux-statuts': '/administration/production-flux',
  'import-export': boUrl('versions', 'import-export'),
  historique: boUrl('versions', 'flux'),
  parametres: boUrl('pos-functions', 'settings'),
  // apercus : workspace legacy AdminControlApercusTab — ne pas rediriger vers chips
  anomalies: boUrl('anomalies', 'audit'),
  'roles-permissions': boUrl('access', 'users'),
  organisation: '/administration/roles-permissions',
  'articles-vente-directe': '/administration/prix-articles',
  'prix-articles': '/administration/prix-articles',
  'paliers-vente-directe': '/administration/paliers-vente-directe',
  goodies: '/administration/goodies',
  textile: '/administration/textile',
  'finitions-reliures': '/administration/finitions-reliures',
  packaging: '/administration/packaging',
  'packaging-sac': '/administration/packaging-sac',
  'packaging-soft': '/administration/packaging-soft',
  'grand-format-prix': '/administration/grand-format-prix',
  'design-graphique': '/administration/design-graphique',
  'impression-sf': '/administration/impression-sf',
  'parametres-formats-papier': '/administration/parametres-formats-papier',
  'parametres-impression': '/administration/parametres-impression',
  'carnet-autocopiant': '/administration/carnet-autocopiant',
  'flyer-regles': '/administration/flyer-regles',
  'carterie-regles': '/administration/carterie-regles',
  'publications-regles': '/administration/publications-regles',
  'tampons': '/administration/tampons',
  'photobook': '/administration/photobook',
  'tirage-photo': '/administration/tirage-photo',
  'cadre-photo': '/administration/cadre-photo',
  'equivalences-services': '/administration/equivalences-services',
  'regles-support': '/administration/parametres-formats-papier',
  'equivalences-matieres': '/administration/equivalences-matieres',
  'regles-promo-articles': '/administration/regles-promo-articles',
  'limites-matieres-formats': '/administration/limites-matieres-formats',
  'base-prix-matieres': '/administration/catalogue-prix-stock?tab=vue',
  'prix-matieres-stock': '/administration/catalogue-prix-stock',
  'prix-calculs': '/administration/catalogue-prix-stock?tab=vue',
  'catalogue-prix-stock': '/administration/catalogue-prix-stock',
  'matieres-vierges': '/administration/matieres-vierges',
};

/**
 * Sections conservées en workspace legacy + layout Hub (panneaux spécialisés).
 */
export const LEGACY_ADMIN_SECTIONS = new Set<string>([
  'apercus',
  'modeles-articles',
  'data-management',
  'logistique',
  'catalogue-prix-stock',
  'catalogue-pos',
  'articles-vente-directe',
  'prix-articles',
  'paliers-vente-directe',
  'goodies',
  'textile',
  'finitions-reliures',
  'packaging',
  'packaging-sac',
  'packaging-soft',
  'grand-format-prix',
  'design-graphique',
  'impression-sf',
  'parametres-formats-papier',
  'parametres-impression',
  'carnet-autocopiant',
  'flyer-regles',
  'carterie-regles',
  'publications-regles',
  'tampons',
  'photobook',
  'tirage-photo',
  'cadre-photo',
  'equivalences-services',
  'regles-support',
  'equivalences-matieres',
  'regles-promo-articles',
  'limites-matieres-formats',
  'base-prix-matieres',
  'prix-matieres-stock',
  'prix-calculs',
  'matieres-vierges',
]);

export function resolveBackofficeRedirect(section: string | null | undefined): string | null {
  if (!section) return null;
  const slug = section.toLowerCase().replace(/\/$/, '');
  if (slug === 'backoffice') return null;
  if (LEGACY_ADMIN_SECTIONS.has(slug)) return null;
  return SECTION_TO_BACKOFFICE[slug] ?? '/administration/vue-ensemble';
}

export function administrationLegacyRedirectTarget(section: string): string {
  return SECTION_TO_BACKOFFICE[section] ?? '/administration/vue-ensemble';
}
