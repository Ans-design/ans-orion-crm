/**
 * Registre d'accès — menus et actions par rôle (matrice PERMISSION_MATRIX).
 */

import { PERMISSION_MATRIX, DEFAULT_PERMISSION_FLAGS } from '@/lib/modules/permission-matrix';
import type { PermissionFlags } from '@/lib/modules/types';

export const FEATURE_FLAGS: Record<string, boolean> = {
  globalSearch: true,
  commande360: true,
  batVersions: true,
  maintenanceTickets: true,
  stockReservations: true,
  livreurEncaissement: true,
  permissionsMatrix: true,
};

export const FIELD_VISIBILITY: Record<string, Record<string, boolean>> = {};
export const BUTTON_VISIBILITY: Record<string, Record<string, boolean>> = {};

export function isAdmin(role: string): boolean {
  return role === 'admin' || role === 'manager' || role === 'demo';
}

export function adminCanSeeEverything(role: string): boolean {
  return role === 'admin' || role === 'demo';
}

export function getModuleFlagsForRole(role: string, moduleId: string): PermissionFlags {
  const partial = PERMISSION_MATRIX[role]?.[moduleId];
  return { ...DEFAULT_PERMISSION_FLAGS, ...partial };
}

export function canAccess(role: string, menuId: string): boolean {
  if (adminCanSeeEverything(role)) return true;
  return getModuleFlagsForRole(role, menuId).canView;
}

/** actionId = « moduleId:flag » ex. devis:canCreate */
export function canAction(role: string, actionId: string): boolean {
  if (adminCanSeeEverything(role)) return true;
  const [moduleId, flag] = actionId.split(':');
  if (!moduleId || !flag) return false;
  const flags = getModuleFlagsForRole(role, moduleId);
  return Boolean(flags[flag as keyof PermissionFlags]);
}

export function getVisibleMenus(role: string, allMenuIds: string[]): string[] {
  if (adminCanSeeEverything(role)) return allMenuIds;
  return allMenuIds.filter((id) => canAccess(role, id));
}
