/**
 * Couche auth serveur — alias vers lib/auth-utils (migration progressive).
 * Nouveau code : importer depuis @/lib/server/auth/session
 */
export {
  requireAuth,
  requireAdmin,
  requireAdminOrManager,
  requirePermission,
  requireApiAccess,
  ROLES,
  ROLE_LABELS,
  canManageUsers,
  hasPermission,
  isReadOnlyRole,
} from '@/lib/auth-utils';

export type { Permission } from '@/lib/auth-utils';
