import { safeRedirectPath } from '@/lib/safe-redirect';
import { getHomeRouteForRole } from '@/lib/modules/role-registry';

/** Chemin sûr après connexion — évite `/` (reboucle middleware si cookie pas encore lu). */
export function resolvePostLoginPath(raw?: string | null, role?: string | null): string {
  const path = safeRedirectPath(raw, '');
  if (path && path !== '/' && path !== '/dashboard') {
    return path;
  }
  if (role) {
    return getHomeRouteForRole(role);
  }
  return '/dashboard';
}

/** Navigation complète post-login (cookie session garanti sur la requête suivante). */
export function completeLoginRedirect(raw?: string | null, role?: string | null): void {
  if (typeof window === 'undefined') return;
  window.location.assign(resolvePostLoginPath(raw, role));
}
