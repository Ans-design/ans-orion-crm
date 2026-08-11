const BLOCKED_PREFIXES = ['/login', '/reset-password', '/api/', '/_next/'];

/** Valide un chemin interne post-login (anti open-redirect). */
export function safeRedirectPath(raw: string | null | undefined, fallback = '/dashboard'): string {
  if (!raw || typeof raw !== 'string') return fallback;
  const path = raw.trim();
  if (!path.startsWith('/') || path.startsWith('//')) return fallback;
  if (path.includes('\\') || path.includes('@') || path.includes('://')) return fallback;
  if (BLOCKED_PREFIXES.some((p) => path === p || path.startsWith(p))) return fallback;
  return path;
}
