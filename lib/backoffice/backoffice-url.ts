import type { AdminBackofficeModuleId } from '@/lib/backoffice/admin-modules';
import type { AdminMacroId } from '@/lib/administration/admin-macro-modules';

export const BACKOFFICE_BASE_PATH = '/administration/backoffice';

export type BackofficeModuleView = 'global' | 'by-article';

/** Sous-vue onglet Articles (cartes vs tableau prix). */
export type BackofficeArticlesView = 'cards' | 'price-table';

export function parseBackofficeTab(raw: string | null): string | null {
  return raw?.trim() || null;
}

export function parseModuleView(searchParams: URLSearchParams): BackofficeModuleView {
  return searchParams.get('view') === 'global' ? 'global' : 'by-article';
}

export function parseArticlesView(searchParams: URLSearchParams): BackofficeArticlesView {
  return searchParams.get('view') === 'price-table' ? 'price-table' : 'cards';
}

export function parseBackofficeModule(searchParams: URLSearchParams): AdminBackofficeModuleId | null {
  const raw = searchParams.get('module');
  const ids: AdminBackofficeModuleId[] = [
    'cockpit', 'catalogue', 'pricing', 'stock', 'flux', 'users', 'import-export', 'audit', 'settings',
  ];
  return ids.includes(raw as AdminBackofficeModuleId) ? (raw as AdminBackofficeModuleId) : null;
}

export function parseAdminMacro(searchParams: URLSearchParams): AdminMacroId | null {
  const raw = searchParams.get('macro');
  const ids: AdminMacroId[] = [
    'overview', 'matieres', 'formules', 'catalog', 'prices', 'stock', 'production', 'org', 'system',
  ];
  return ids.includes(raw as AdminMacroId) ? (raw as AdminMacroId) : null;
}

/** Mode Hub : page d'accueil du module Macro (cartes), sans micro-page ouverte */
export function isBackofficeHubMode(searchParams: URLSearchParams): boolean {
  if (searchParams.get('hub') === '1') return true;
  const macro = searchParams.get('macro');
  const tab = searchParams.get('tab');
  return Boolean(macro) && !tab;
}

/**
 * Fusionne les query params existants avec un patch (null/'' = suppression).
 */
export function buildBackofficeUrl(
  current: URLSearchParams | string,
  patch: Record<string, string | null | undefined>,
): string {
  const qs = new URLSearchParams(typeof current === 'string' ? current : current.toString());
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (value == null || value === '') qs.delete(key);
    else qs.set(key, value);
  }
  const query = qs.toString();
  return query ? `${BACKOFFICE_BASE_PATH}?${query}` : BACKOFFICE_BASE_PATH;
}
