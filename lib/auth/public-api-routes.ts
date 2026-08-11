/**
 * Allowlist API publique exacte (AUTH-004 V10).
 * Toute nouvelle route est privée par défaut.
 */

/** Préfixes strictement nécessaires (callback NextAuth + BAT client tokenisé). */
export const PUBLIC_API_PREFIXES_STRICT = ['/api/auth/callback', '/api/bat/client'] as const;

/** Routes API publiques exactes (méthodes gérées dans middleware si besoin). */
export const PUBLIC_API_EXACT_ROUTES = new Set<string>([
  '/api/auth/session',
  '/api/auth/csrf',
  '/api/auth/providers',
  '/api/auth/signin',
  '/api/auth/signout',
  '/api/auth/error',
  '/api/auth/setup-status',
  '/api/auth/login-fail',
  '/api/auth/login-check',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/access-request',
  '/api/auth/public-info',
  '/api/health',
]);

export function isPublicApiPath(pathname: string): boolean {
  if (PUBLIC_API_EXACT_ROUTES.has(pathname)) return true;
  return PUBLIC_API_PREFIXES_STRICT.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
