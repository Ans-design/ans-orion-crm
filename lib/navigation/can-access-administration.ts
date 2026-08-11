import { canAccessPage } from '@/lib/page-access';

/**
 * Décision unique : l’utilisateur peut-il voir / ouvrir l’Administration ?
 * Alignée sur `PAGE_ACCESS_RULES` pour `/administration` (admin | manager).
 * Fail-closed : rôle absent, vide ou inconnu → false.
 */
export function canAccessAdministration(authRole: string | null | undefined): boolean {
  if (authRole == null) return false;
  const role = String(authRole).trim();
  if (!role) return false;
  return canAccessPage(role, '/administration');
}
