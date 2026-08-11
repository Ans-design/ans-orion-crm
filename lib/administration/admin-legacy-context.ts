/**
 * Contexte Hub & Spoke pour pages legacy hors backoffice v2 unifié.
 */
import { ADMINISTRATION_SECTIONS } from '@/lib/administration/routes';
import { LEGACY_ADMIN_SECTIONS } from '@/lib/administration/backoffice-redirects';
import {
  ADMIN_MACRO_MODULES,
  macroById,
  type AdminMacroId,
  type AdminMacroModule,
  type AdminMicroItem,
} from '@/lib/administration/admin-macro-modules';

export type AdminLegacyContext = {
  macro: AdminMacroModule;
  activeMicro: AdminMicroItem | null;
  section?: string;
  pageTitle: string;
  pageDescription: string;
};

const SECTION_TO_MACRO: Record<string, AdminMacroId> = {
  'vue-ensemble': 'overview',
  'sante-systeme': 'overview',
  backoffice: 'overview',
  catalogue: 'formules',
  articles: 'formules',
  'modeles-articles': 'formules',
  variables: 'formules',
  options: 'formules',
  apercus: 'formules',
  matieres: 'matieres',
  grammages: 'matieres',
  formats: 'matieres',
  laizes: 'matieres',
  stock: 'matieres',
  prix: 'formules',
  formules: 'formules',
  'regles-metier': 'production',
  'flux-statuts': 'production',
  'production-flux': 'production',
  'estimation-temps': 'temps',
  synchronisation: 'production',
  'roles-permissions': 'org',
  'import-export': 'org',
  historique: 'org',
  parametres: 'org',
  anomalies: 'org',
  logistique: 'org',
  'data-management': 'org',
};

function matchMicroByPath(pathname: string): { macro: AdminMacroModule; micro: AdminMicroItem } | null {
  const path = pathname.split('?')[0] ?? pathname;
  for (const macro of ADMIN_MACRO_MODULES) {
    for (const micro of macro.microItems) {
      const href = micro.href.split('?')[0] ?? micro.href;
      if (path === href || path.startsWith(`${href}/`)) {
        return { macro, micro };
      }
    }
  }
  return null;
}

function microForSection(section: string, macro: AdminMacroModule): AdminMicroItem | null {
  const href = `/administration/${section}`;
  const byHref = macro.microItems.find((m) => {
    const h = m.href.split('?')[0];
    return h === href;
  });
  if (byHref) return byHref;

  const meta = ADMINISTRATION_SECTIONS[section];
  if (!meta) return null;

  return {
    id: section,
    label: meta.label,
    description: meta.breadcrumb,
    icon: macro.icon,
    href,
  };
}

/** Résout macro + micro pour une URL administration ou /admin/* */
export function resolveAdminLegacyContext(pathname: string): AdminLegacyContext | null {
  const path = (pathname ?? '').split('?')[0] ?? '';

  if (!path.startsWith('/administration/') && !path.startsWith('/admin/')) {
    return null;
  }

  if (path.startsWith('/administration/backoffice')) {
    return null;
  }

  if (path === '/administration/matieres' || path.startsWith('/administration/matieres/')) {
    return null;
  }

  if (path === '/administration/production-flux' || path.startsWith('/administration/production-flux/')) {
    return null;
  }

  if (path === '/administration/catalogue-pos' || path.startsWith('/administration/catalogue-pos/')) {
    return null;
  }

  /* CPS a son propre shell dark full-width — pas de wrapper Hub (évite double header / carte). */
  if (path === '/administration/catalogue-prix-stock' || path.startsWith('/administration/catalogue-prix-stock/')) {
    return null;
  }

  /* Prix articles — même shell que Matières (AdminHeader interne). */
  if (
    path === '/administration/prix-articles'
    || path.startsWith('/administration/prix-articles/')
    || path === '/administration/articles-vente-directe'
    || path.startsWith('/administration/articles-vente-directe/')
  ) {
    return null;
  }

  if (path === '/administration/vue-ensemble' || path.startsWith('/administration/vue-ensemble/')) {
    return null;
  }

  /* Sync a son propre header workspace — éviter double titre Hub. */
  if (path === '/administration/synchronisation' || path.startsWith('/administration/synchronisation/')) {
    return null;
  }

  if (path === '/admin/matieres' || path.startsWith('/admin/matieres/')) {
    return null;
  }

  const direct = matchMicroByPath(path);
  if (direct) {
    return {
      macro: direct.macro,
      activeMicro: direct.micro,
      pageTitle: direct.micro.label,
      pageDescription: direct.micro.description,
    };
  }

  const sectionMatch = path.match(/^\/administration\/([^/]+)/);
  if (sectionMatch) {
    const section = sectionMatch[1]!.toLowerCase();
    const macroId = SECTION_TO_MACRO[section] ?? 'overview';
    const macro = macroById(macroId);
    const activeMicro = microForSection(section, macro);
    const meta = ADMINISTRATION_SECTIONS[section];
    return {
      macro,
      activeMicro,
      section,
      pageTitle: meta?.label ?? activeMicro?.label ?? macro.label,
      pageDescription: activeMicro?.description ?? macro.description,
    };
  }

  if (path === '/admin' || path === '/admin/') {
    return null;
  }

  if (path.startsWith('/admin/')) {
    const matched = matchMicroByPath(path);
    if (matched) {
      return {
        macro: matched.macro,
        activeMicro: matched.micro,
        pageTitle: matched.micro.label,
        pageDescription: matched.micro.description,
      };
    }
    return null;
  }

  return null;
}

export function isAdminLegacySection(section: string): boolean {
  return LEGACY_ADMIN_SECTIONS.has(section.toLowerCase());
}
