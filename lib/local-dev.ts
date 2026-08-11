/**
 * Détection environnement local — aucun déploiement / appel Hostinger en dev.
 */

export function isLocalAppEnv(): boolean {
  const appEnv = (process.env.APP_ENV || '').toLowerCase();
  if (appEnv === 'local' || appEnv === 'development') return true;
  if (process.env.NODE_ENV === 'development') return true;
  if (process.env.LOCAL_DEV === 'true') return true;
  return false;
}

/**
 * Élévation privilèges rôle `demo` (Talk admin-like) — UNIQUEMENT local/dev.
 * Staging / preview / production : demo ≠ admin (P0 sécu experts).
 */
export function isDemoPrivilegeElevationAllowed(): boolean {
  if (process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production') {
    return false;
  }
  return isLocalAppEnv();
}

export function isHostingerDeployBlocked(): boolean {
  if (process.env.ALLOW_HOSTINGER_DEPLOY === 'true') return false;
  if (isLocalAppEnv()) return true;
  const url = process.env.NEXTAUTH_URL || '';
  if (/localhost|127\.0\.0\.1/i.test(url)) return true;
  return false;
}

export function localAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    process.env.NEXTAUTH_URL?.replace(/\/$/, '') ||
    'http://localhost:3000'
  );
}

export function isDevPreviewEnabled(): boolean {
  if (process.env.DISABLE_DEV_PREVIEW === 'true') return false;
  return isLocalAppEnv() || process.env.APP_ENV === 'preview';
}

export const LOCAL_DEV_BANNER =
  'Mode local actif : aucun déploiement Hostinger ne sera effectué.';
