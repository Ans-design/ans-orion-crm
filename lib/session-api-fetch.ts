'use client';

/** APIs secondaires : une 401 ne doit jamais déconnecter l'utilisateur. */
const SECONDARY_API_PREFIXES = [
  '/api/rh/late-arrival',
  '/api/nav/badges',
  '/api/notifications',
  '/api/admin-backoffice/overview',
  '/api/auth/_log',
  '/api/audit',
  '/api/alerts/',
  '/api/cart',
  '/api/caisse/',
  '/api/attendance',
  '/api/pointage',
];

export function isSecondaryApiRoute(url: string): boolean {
  if (!url.includes('/api/')) return false;
  if (url.includes('/api/auth/')) return true;
  return SECONDARY_API_PREFIXES.some((prefix) => url.includes(prefix));
}

/**
 * Traite une réponse 401 API sans déconnexion automatique.
 * La session NextAuth reste la seule source de vérité pour le logout.
 */
export function handleApiUnauthorized(status: number, url: string): boolean {
  if (status !== 401) return false;
  if (typeof window === 'undefined') return false;
  if (!url.includes('/api/')) return false;
  if (url.includes('/api/auth/')) return false;

  if (process.env.NODE_ENV === 'development') {
    console.warn('[session-api-fetch] 401 ignoré (pas de déconnexion auto):', url);
  }

  window.dispatchEvent(
    new CustomEvent('orion:api-unauthorized', {
      detail: { url, status, secondary: isSecondaryApiRoute(url) },
    }),
  );

  return true;
}

/** fetch wrapper — propage les erreurs sans forcer signOut. */
export async function sessionAwareFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  handleApiUnauthorized(res.status, url);
  return res;
}
