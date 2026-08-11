import {
  hasPermission,
  canManageUsers,
  isReadOnlyRole,
  isDemoRole,
  isDemoBlockedRoute,
  ROLES,
  ROLE_LABELS,
  type Permission,
} from '@/lib/auth/permissions';

export {
  hasPermission,
  canManageUsers,
  isReadOnlyRole,
  isDemoRole,
  isDemoBlockedRoute,
  ROLES,
  ROLE_LABELS,
};

export type { Permission };

export function canAccessModule(role: string, moduleKey: string): boolean {
  const map: Record<string, string[]> = {
    clients: ['clients:read'],
    pos: ['pos:use'],
    devis: ['devis:read'],
    commandes: ['commandes:read'],
    paiements: ['paiements:read'],
    factures: ['factures:read'],
    production: ['production:read'],
    stock: ['stock:read'],
    rh: ['clients:read'],
    admin: ['config:view'],
    dashboard: ['clients:read'],
  };
  const required = map[moduleKey];
  if (!required?.length) return true;
  return required.some((p) => hasPermission(role, p as Permission));
}
