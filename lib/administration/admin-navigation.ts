/**
 * @deprecated Utiliser `admin-macro-modules.ts` — navigation 7 Macro Hub & Spoke.
 * Réexporte la source unique pour compatibilité (zéro suppression de routes).
 */
export {
  ADMIN_MACRO_MODULES,
  macroById,
  macroForModule,
  macroHubUrl,
  macroNavBadge,
  resolveMacroNavActive,
  resolveMacroNavActive as resolveAdminNavActive,
  type AdminMacroId,
  type AdminMacroModule,
  type AdminMicroItem,
  type AdminNavBadgeCounts,
  type AdminNavBadgeKey,
} from './admin-macro-modules';

import {
  macroById,
  macroNavBadge,
  resolveMacroNavActive,
  type AdminMacroId,
  type AdminNavBadgeCounts,
  type AdminNavBadgeKey,
} from './admin-macro-modules';

/** @deprecated Alias macro modules */
export const ADMIN_NAVIGATION = undefined as unknown as never;

const BADGE_MACRO: Partial<Record<AdminNavBadgeKey, AdminMacroId>> = {
  'catalogue-incomplete': 'matieres',
  'pricing-missing': 'formules',
  'stock-unlinked': 'matieres',
  'anomalies-critical': 'org',
};

export function adminNavBadgeForGroup(
  group: { badgeKey?: AdminNavBadgeKey },
  counts: AdminNavBadgeCounts,
): number {
  if (!group.badgeKey) return 0;
  const macroId = BADGE_MACRO[group.badgeKey];
  return macroId ? macroNavBadge(macroId, counts) : 0;
}

export function findAdminGroupForPath(pathname: string, search: string) {
  const active = resolveMacroNavActive(pathname, search);
  if (!active) return null;
  return macroById(active.macroId);
}
