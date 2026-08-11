/**
 * Pages / préfixes publics — source unique pour middleware + tests (Lot A1 V4).
 * Ne jamais exposer `/bat` entier : validation client = `/bat/valider/*` uniquement.
 */

export const PUBLIC_PAGES = [
  '/login',
  '/reset-password',
  '/forgot-password',
  '/non-autorise',
  '/dev-preview',
  // /dev-health : plus public — 404 hors local (SEC-02)
] as const;

export function isPublicPage(pathname: string): boolean {
  if (pathname === '/dev-preview' || pathname.startsWith('/dev-preview/')) {
    return true;
  }
  if (pathname === '/bat/valider' || pathname.startsWith('/bat/valider/')) {
    return true;
  }
  return PUBLIC_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
